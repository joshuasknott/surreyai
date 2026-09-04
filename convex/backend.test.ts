/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function insertSociety(t: ReturnType<typeof convexTest>, slug = "ai") {
  return await t.run(async (ctx) =>
    ctx.db.insert("societies", {
      name: "Test Society",
      shortName: "Test",
      slug,
      domain: `${slug}.example.test`,
      contactEmail: `${slug}@example.test`,
      socials: {},
    })
  );
}

describe("public society content", () => {
  it("returns only published events and active committee members", async () => {
    const t = convexTest(schema, modules);
    const societyId = await insertSociety(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("events", {
        societyId,
        title: "Published event",
        status: "published",
        isFeatured: false,
      });
      await ctx.db.insert("events", {
        societyId,
        title: "Draft event",
        status: "draft",
        isFeatured: false,
      });
      await ctx.db.insert("committeeMembers", {
        societyId,
        name: "Active Member",
        role: "President",
        displayOrder: 1,
        isActive: true,
      });
      await ctx.db.insert("committeeMembers", {
        societyId,
        name: "Inactive Member",
        role: "Former President",
        displayOrder: 2,
        isActive: false,
      });
    });

    const events = await t.query(api.events.listPublished, { societySlug: "ai" });
    const committee = await t.query(api.committee.listActive, { societySlug: "ai" });

    expect(events.map((event) => event.title)).toEqual(["Published event"]);
    expect(committee.map((member) => member.name)).toEqual(["Active Member"]);
  });
});

describe("admin authorization", () => {
  it("rejects unauthenticated content mutations and invitations", async () => {
    const t = convexTest(schema, modules);
    await insertSociety(t, "business");

    await expect(
      t.mutation(api.events.create, {
        societySlug: "business",
        title: "Private draft",
        status: "draft",
        isFeatured: false,
      })
    ).rejects.toThrow();

    await expect(
      t.mutation(api.memberships.inviteUser, {
        societySlug: "business",
        email: "member@example.test",
        role: "member",
      })
    ).rejects.toThrow();
  });

  it("allows an active admin to create content and invite a member", async () => {
    const t = convexTest(schema, modules);
    const societyId = await insertSociety(t, "neurotech");
    const tokenIdentifier = "https://issuer.example.test|admin-user";

    const { membershipId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "admin@example.test",
        name: "Admin",
        clerkId: tokenIdentifier,
      });
      const membershipId = await ctx.db.insert("memberships", {
        userId,
        societyId,
        role: "admin",
        status: "active",
      });
      return { membershipId };
    });

    const authed = t.withIdentity({
      subject: "admin-user",
      issuer: "https://issuer.example.test",
      tokenIdentifier,
      email: "admin@example.test",
      name: "Admin",
    });

    const eventId = await authed.mutation(api.events.create, {
      societySlug: "neurotech",
      title: "Confirmed session",
      status: "published",
      isFeatured: false,
    });
    const invitation = await authed.mutation(api.memberships.inviteUser, {
      societySlug: "neurotech",
      email: "new-member@example.test",
      role: "member",
    });

    expect(eventId).toBeTruthy();
    expect(invitation.invitationId).toBeTruthy();
    const storedInvitation = await t.run((ctx) => ctx.db.get(invitation.invitationId));
    expect(storedInvitation?.invitedBy).toBe(membershipId);
  });

  it("refreshes exactly the three Union officers and keeps dashboard records editable", async () => {
    const t = convexTest(schema, modules);
    const societyId = await insertSociety(t, "ai");
    const tokenIdentifier = "https://issuer.example.test|committee-admin";

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "committee-admin@example.test",
        name: "Committee Admin",
        clerkId: tokenIdentifier,
      });
      await ctx.db.insert("memberships", {
        userId,
        societyId,
        role: "admin",
        status: "active",
      });
      await ctx.db.insert("committeeMembers", {
        societyId,
        name: "Outgoing Social Secretary",
        role: "Social Secretary",
        displayOrder: 1,
        isActive: true,
      });
    });

    const authed = t.withIdentity({
      subject: "committee-admin",
      issuer: "https://issuer.example.test",
      tokenIdentifier,
      email: "committee-admin@example.test",
      name: "Committee Admin",
    });

    await authed.mutation(api.committee.syncOfficers, {
      societySlug: "ai",
      officers: [
        { name: "Josh Knott", role: "President" },
        { name: "Poppy Holmes", role: "Vice President" },
        { name: "Vinayak Manojkumar Vadhera", role: "Treasurer" },
      ],
    });

    const active = await t.query(api.committee.listActive, { societySlug: "ai" });
    expect(active.map(({ name, role }) => ({ name, role }))).toEqual([
      { name: "Josh Knott", role: "President" },
      { name: "Poppy Holmes", role: "Vice President" },
      { name: "Vinayak Manojkumar Vadhera", role: "Treasurer" },
    ]);

    const allMembers = await authed.query(api.committee.list, { societySlug: "ai" });
    expect(allMembers.find((member) => member.role === "Social Secretary")?.isActive).toBe(false);
  });
});
