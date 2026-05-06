import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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
      .collect();
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

    return await ctx.db
      .query("committeeMembers")
      .withIndex("by_society_active", (q) =>
        q.eq("societyId", society._id).eq("isActive", true)
      )
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("committeeMembers") },
  handler: async (ctx, { id }) => {
    const member = await ctx.db.get(id);
    if (!member) return null;

    await requireExistingMembership(ctx, member.societyId);
    return member;
  },
});

export const create = mutation({
  args: {
    societySlug: v.string(),
    name: v.string(),
    role: v.string(),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
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
      .collect();

    const displayOrder = input.displayOrder ?? existing.length + 1;

    const memberId = await ctx.db.insert("committeeMembers", {
      societyId: society._id,
      name: input.name,
      role: input.role,
      bio: input.bio ?? "",
      image: input.image ?? "",
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

export const update = mutation({
  args: {
    societySlug: v.string(),
    memberId: v.id("committeeMembers"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
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
        filteredUpdates[key] = value;
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
