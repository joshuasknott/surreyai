import { query, mutation, internalAction, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fetchUnionCommitteeOfficers } from "@surreysocieties/admin/unionCommittee";
import { requireContentEditor, requireExistingMembership, logAction } from "./permissions";

export const list = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    await requireExistingMembership(ctx, society._id);

    return await ctx.db
      .query("committeeMembers")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .take(500);
  },
});

export const listActive = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    const members = await ctx.db
      .query("committeeMembers")
      .withIndex("by_society_active", (q) =>
        q.eq("societyId", society._id).eq("isActive", true)
      )
      .take(100);

    return Promise.all(members.map(async (member) => {
      if (member.imageStorageId) {
        const url = await ctx.storage.getUrl(member.imageStorageId);
        return { ...member, imageUrl: url };
      }
      return { ...member, imageUrl: member.image || null };
    }));
  },
});

export const getById = query({
  args: { id: v.id("committeeMembers") },
  handler: async (ctx, { id }) => {
    const member = await ctx.db.get(id);
    if (!member) return null;

    await requireExistingMembership(ctx, member.societyId);

    if (member.imageStorageId) {
      const url = await ctx.storage.getUrl(member.imageStorageId);
      return { ...member, imageUrl: url };
    }
    return { ...member, imageUrl: member.image || null };
  },
});

export const create = mutation({
  args: {
    societySlug: v.string(),
    name: v.string(),
    role: v.string(),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    email: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { societySlug, ...input } = args;
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const existing = await ctx.db
      .query("committeeMembers")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .take(500);

    const displayOrder = input.displayOrder ?? existing.length + 1;

    const memberId = await ctx.db.insert("committeeMembers", {
      societyId: society._id,
      name: input.name,
      role: input.role,
      bio: input.bio ?? "",
      image: input.image ?? "",
      imageStorageId: input.imageStorageId,
      email: input.email ?? "",
      linkedIn: input.linkedIn ?? "",
      displayOrder,
      isActive: input.isActive ?? true,
    });

    await logAction(
      ctx,
      society._id,
      user._id,
      "create_committee_member",
      memberId,
      "committeeMember",
      input.name
    );
    return memberId;
  },
});

const officerValidator = v.object({
  name: v.string(),
  role: v.union(
    v.literal("President"),
    v.literal("Vice President"),
    v.literal("Treasurer")
  ),
});

const OFFICER_ROLES = ["President", "Vice President", "Treasurer"] as const;

type Officer = {
  name: string;
  role: (typeof OFFICER_ROLES)[number];
};

async function applyOfficerSync(
  ctx: MutationCtx,
  societySlug: string,
  officers: Officer[]
) {
  const society = await ctx.db
    .query("societies")
    .withIndex("by_slug", (q) => q.eq("slug", societySlug))
    .first();
  if (!society) throw new Error("Society not found");

  const byRole = new Map(officers.map((officer) => [officer.role, officer]));
  if (
    officers.length !== OFFICER_ROLES.length ||
    OFFICER_ROLES.some((role) => !byRole.has(role))
  ) {
    throw new Error("Exactly one President, Vice President and Treasurer are required");
  }

  const existing = await ctx.db
    .query("committeeMembers")
    .withIndex("by_society", (q) => q.eq("societyId", society._id))
    .take(500);

  const retainedIds = new Set<string>();
  for (const [index, role] of OFFICER_ROLES.entries()) {
    const officer = byRole.get(role)!;
    const matching = existing.filter(
      (member) => member.role.trim().toLowerCase() === role.toLowerCase()
    );
    const primary = matching[0];

    if (primary) {
      retainedIds.add(primary._id);
      await ctx.db.patch(primary._id, {
        name: officer.name.trim(),
        role,
        displayOrder: index + 1,
        isActive: true,
      });
    } else {
      const memberId = await ctx.db.insert("committeeMembers", {
        societyId: society._id,
        name: officer.name.trim(),
        role,
        bio: "",
        image: "",
        email: "",
        linkedIn: "",
        displayOrder: index + 1,
        isActive: true,
      });
      retainedIds.add(memberId);
    }
  }

  for (const member of existing) {
    if (member.isActive && !retainedIds.has(member._id)) {
      await ctx.db.patch(member._id, { isActive: false });
    }
  }

  return { society, count: officers.length };
}

export const syncOfficers = mutation({
  args: {
    societySlug: v.string(),
    officers: v.array(officerValidator),
  },
  handler: async (ctx, { societySlug, officers }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");
    const { user } = await requireContentEditor(ctx, society._id);
    const result = await applyOfficerSync(ctx, societySlug, officers);

    await logAction(
      ctx,
      result.society._id,
      user._id,
      "sync_union_committee_officers",
      undefined,
      "committeeMember",
      officers.map((officer) => `${officer.role}: ${officer.name}`).join("; ")
    );

    return result.count;
  },
});

export const syncOfficersInternal = internalMutation({
  args: {
    societySlug: v.string(),
    officers: v.array(officerValidator),
  },
  handler: async (ctx, { societySlug, officers }) => {
    const result = await applyOfficerSync(ctx, societySlug, officers);
    return result.count;
  },
});

const UNION_COMMITTEE_SOURCES = [
  {
    societySlug: "ai",
    url: "https://surreyunion.org/your-activity/clubs-and-societies-a-z/artificial-intelligence-society",
  },
  {
    societySlug: "business",
    url: "https://surreyunion.org/your-activity/clubs-and-societies-a-z/business-society",
  },
  {
    societySlug: "neurotech",
    url: "https://surreyunion.org/your-activity/clubs-and-societies-a-z/neurotech-society",
  },
] as const;

export const refreshOfficersFromUnion = internalAction({
  args: {},
  handler: async (ctx) => {
    const results: Array<{ societySlug: string; updated: boolean; error?: string }> = [];

    for (const source of UNION_COMMITTEE_SOURCES) {
      try {
        const officers = await fetchUnionCommitteeOfficers(source.url);
        await ctx.runMutation(internal.committee.syncOfficersInternal, {
          societySlug: source.societySlug,
          officers,
        });
        results.push({ societySlug: source.societySlug, updated: true });
      } catch (error) {
        results.push({
          societySlug: source.societySlug,
          updated: false,
          error: error instanceof Error ? error.message : "Unknown refresh error",
        });
      }
    }

    if (!results.some((result) => result.updated)) {
      throw new Error(`All Union committee refreshes failed: ${JSON.stringify(results)}`);
    }
    return results;
  },
});

export const update = mutation({
  args: {
    societySlug: v.string(),
    memberId: v.id("committeeMembers"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.union(v.id("_storage"), v.literal(""))),
    email: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { societySlug, memberId, ...updates } = args;
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const existing = await ctx.db.get(memberId);
    if (!existing || existing.societyId !== society._id) {
      throw new Error("Committee member not found");
    }

    const filteredUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === "imageStorageId" && value === "") {
          filteredUpdates[key] = undefined;
        } else {
          filteredUpdates[key] = value;
        }
      }
    }

    await ctx.db.patch(memberId, filteredUpdates);
    await logAction(
      ctx,
      society._id,
      user._id,
      "update_committee_member",
      memberId,
      "committeeMember",
      existing.name
    );
    return true;
  },
});

export const remove = mutation({
  args: {
    societySlug: v.string(),
    memberId: v.id("committeeMembers"),
  },
  handler: async (ctx, { societySlug, memberId }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const existing = await ctx.db.get(memberId);
    if (!existing || existing.societyId !== society._id) {
      throw new Error("Committee member not found");
    }

    await ctx.db.delete(memberId);
    await logAction(
      ctx,
      society._id,
      user._id,
      "delete_committee_member",
      memberId,
      "committeeMember",
      existing.name
    );
    return true;
  },
});

export const listPast = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    const members = await ctx.db
      .query("pastCommitteeMembers")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .take(500);

    return Promise.all(members.map(async (member) => {
      if (member.imageStorageId) {
        const url = await ctx.storage.getUrl(member.imageStorageId);
        return { ...member, imageUrl: url };
      }
      return { ...member, imageUrl: member.image || null };
    }));
  },
});

export const listPastByYear = query({
  args: { societySlug: v.string(), yearLabel: v.string() },
  handler: async (ctx, { societySlug, yearLabel }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    return await ctx.db
      .query("pastCommitteeMembers")
      .withIndex("by_society_and_year_label", (q) =>
        q.eq("societyId", society._id).eq("yearLabel", yearLabel)
      )
      .take(200);
  },
});

function validatePastCommitteeInput(input: {
  name?: string;
  role?: string;
  yearLabel?: string;
}) {
  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new Error("Name is required");
  }
  if (input.role !== undefined && input.role.trim().length === 0) {
    throw new Error("Role is required");
  }
  if (input.yearLabel !== undefined && input.yearLabel.trim().length === 0) {
    throw new Error("Year or term label is required");
  }
}

export const listPastForAdmin = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    await requireExistingMembership(ctx, society._id);

    return await ctx.db
      .query("pastCommitteeMembers")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .take(500);
  },
});

export const getPastById = query({
  args: { id: v.id("pastCommitteeMembers") },
  handler: async (ctx, { id }) => {
    const member = await ctx.db.get(id);
    if (!member) return null;

    await requireExistingMembership(ctx, member.societyId);

    if (member.imageStorageId) {
      const url = await ctx.storage.getUrl(member.imageStorageId);
      return { ...member, imageUrl: url };
    }
    return { ...member, imageUrl: member.image || null };
  },
});

export const createPast = mutation({
  args: {
    societySlug: v.string(),
    name: v.string(),
    role: v.string(),
    yearLabel: v.string(),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    email: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { societySlug, ...input } = args;
    validatePastCommitteeInput(input);

    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const existingForYear = await ctx.db
      .query("pastCommitteeMembers")
      .withIndex("by_society_and_year_label", (q) =>
        q.eq("societyId", society._id).eq("yearLabel", input.yearLabel)
      )
      .take(500);

    const memberId = await ctx.db.insert("pastCommitteeMembers", {
      societyId: society._id,
      name: input.name,
      role: input.role,
      yearLabel: input.yearLabel,
      bio: input.bio ?? "",
      image: input.image ?? "",
      imageStorageId: input.imageStorageId,
      email: input.email ?? "",
      linkedIn: input.linkedIn ?? "",
      displayOrder: input.displayOrder ?? existingForYear.length + 1,
    });

    await logAction(
      ctx,
      society._id,
      user._id,
      "create_past_committee_member",
      memberId,
      "pastCommitteeMember",
      `${input.yearLabel}: ${input.name}`
    );
    return memberId;
  },
});

export const updatePast = mutation({
  args: {
    societySlug: v.string(),
    memberId: v.id("pastCommitteeMembers"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    yearLabel: v.optional(v.string()),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.union(v.id("_storage"), v.literal(""))),
    email: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { societySlug, memberId, ...updates } = args;
    validatePastCommitteeInput(updates);

    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const existing = await ctx.db.get(memberId);
    if (!existing || existing.societyId !== society._id) {
      throw new Error("Past committee member not found");
    }

    const filteredUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === "imageStorageId" && value === "") {
          filteredUpdates[key] = undefined;
        } else {
          filteredUpdates[key] = value;
        }
      }
    }

    await ctx.db.patch(memberId, filteredUpdates);
    await logAction(
      ctx,
      society._id,
      user._id,
      "update_past_committee_member",
      memberId,
      "pastCommitteeMember",
      `${existing.yearLabel}: ${existing.name}`
    );
    return true;
  },
});

export const removePast = mutation({
  args: {
    societySlug: v.string(),
    memberId: v.id("pastCommitteeMembers"),
  },
  handler: async (ctx, { societySlug, memberId }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const existing = await ctx.db.get(memberId);
    if (!existing || existing.societyId !== society._id) {
      throw new Error("Past committee member not found");
    }

    await ctx.db.delete(memberId);
    await logAction(
      ctx,
      society._id,
      user._id,
      "delete_past_committee_member",
      memberId,
      "pastCommitteeMember",
      `${existing.yearLabel}: ${existing.name}`
    );
    return true;
  },
});
