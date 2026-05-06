import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { OWNER_EMAIL, PROTECTED_ADMIN_EMAILS } from "./permissions";

export const seedSocieties = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("societies").collect();
    if (existing.length > 0) {
      return "Societies already seeded";
    }

    const societyData = [
      {
        name: "Surrey Artificial Intelligence Society",
        shortName: "AI Society",
        slug: "ai",
        domain: "surreyaisociety.org",
        logo: "/logos/optimized/ai-logo.optimized.png",
        contactEmail: PROTECTED_ADMIN_EMAILS.ai,
        socials: { email: PROTECTED_ADMIN_EMAILS.ai },
      },
      {
        name: "Surrey Business Society",
        shortName: "Business Society",
        slug: "business",
        domain: "surreybusinesssociety.org",
        logo: "/logos/sbs-logo.png",
        contactEmail: PROTECTED_ADMIN_EMAILS.business,
        socials: { email: PROTECTED_ADMIN_EMAILS.business },
      },
      {
        name: "Surrey Neurotech Society",
        shortName: "Neurotech Society",
        slug: "neurotech",
        domain: "surreyneurotechsociety.org",
        logo: "/logos/neurotech-logo.png",
        contactEmail: PROTECTED_ADMIN_EMAILS.neurotech,
        socials: { email: PROTECTED_ADMIN_EMAILS.neurotech },
      },
    ];

    for (const data of societyData) {
      const societyId = await ctx.db.insert("societies", data);
      const email =
        PROTECTED_ADMIN_EMAILS[
          data.slug as keyof typeof PROTECTED_ADMIN_EMAILS
        ];

      let user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (!user) {
        const userId = await ctx.db.insert("users", {
          email,
          name: `${data.shortName} Admin`,
        });
        user = await ctx.db.get(userId);
      }

      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_user_society", (q) =>
          q.eq("userId", user!._id).eq("societyId", societyId)
        )
        .first();

      if (!existingMembership) {
        await ctx.db.insert("memberships", {
          userId: user!._id,
          societyId,
          role: "protectedAdmin",
          status: "active",
        });
      }
    }

    return "Societies seeded successfully";
  },
});

export const seedOwnerMemberships = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { email, name }) => {
    const ownerEmail = (email || OWNER_EMAIL).toLowerCase().trim();

    let owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", ownerEmail))
      .first();

    if (!owner) {
      const ownerId = await ctx.db.insert("users", {
        email: ownerEmail,
        name: name || "Josh Knott",
      });
      owner = await ctx.db.get(ownerId);
    }

    const societies = await ctx.db.query("societies").collect();
    let changed = 0;

    for (const society of societies) {
      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_user_society", (q) =>
          q.eq("userId", owner!._id).eq("societyId", society._id)
        )
        .first();

      if (existingMembership) {
        if (
          existingMembership.role !== "owner" ||
          existingMembership.status !== "active"
        ) {
          await ctx.db.patch(existingMembership._id, {
            role: "owner",
            status: "active",
          });
          changed++;
        }
      } else {
        await ctx.db.insert("memberships", {
          userId: owner!._id,
          societyId: society._id,
          role: "owner",
          status: "active",
        });
        changed++;
      }
    }

    return `Owner seeded across ${societies.length} societies (${changed} memberships changed)`;
  },
});
