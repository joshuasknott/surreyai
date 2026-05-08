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
      .query("events")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .order("desc")
      .collect();
  },
});

export const listPublished = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    const events = await ctx.db
      .query("events")
      .withIndex("by_society_status", (q) =>
        q.eq("societyId", society._id).eq("status", "published")
      )
      .order("desc")
      .collect();

    return Promise.all(events.map(async (event) => {
      if (event.imageStorageId) {
        const url = await ctx.storage.getUrl(event.imageStorageId);
        return { ...event, imageUrl: url };
      }
      return { ...event, imageUrl: event.image || null };
    }));
  },
});

export const listFeatured = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    const published = await ctx.db
      .query("events")
      .withIndex("by_society_status", (q) =>
        q.eq("societyId", society._id).eq("status", "published")
      )
      .collect();
    return published.filter((e) => e.isFeatured);
  },
});

export const getById = query({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    const event = await ctx.db.get(id);
    if (!event) return null;

    await requireExistingMembership(ctx, event.societyId);

    if (event.imageStorageId) {
      const url = await ctx.storage.getUrl(event.imageStorageId);
      return { ...event, imageUrl: url };
    }
    return { ...event, imageUrl: event.image || null };
  },
});

export const create = mutation({
  args: {
    societySlug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    category: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    registrationUrl: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    isFeatured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { societySlug, ...input } = args;
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const eventId = await ctx.db.insert("events", {
      societyId: society._id,
      title: input.title,
      description: input.description ?? "",
      date: input.date ?? "",
      startTime: input.startTime ?? "",
      endTime: input.endTime ?? "",
      location: input.location ?? "",
      category: input.category ?? "Other",
      image: input.image ?? "",
      imageStorageId: input.imageStorageId,
      registrationUrl: input.registrationUrl ?? "",
      status: input.status ?? "draft",
      isFeatured: input.isFeatured ?? false,
    });

    await logAction(
      ctx,
      society._id,
      user._id,
      "create_event",
      eventId,
      "event",
      input.title
    );
    return eventId;
  },
});

export const update = mutation({
  args: {
    societySlug: v.string(),
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    category: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.union(v.id("_storage"), v.literal(""))),
    registrationUrl: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    isFeatured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { societySlug, eventId, ...updates } = args;
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const existing = await ctx.db.get(eventId);
    if (!existing || existing.societyId !== society._id) {
      throw new Error("Event not found");
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

    await ctx.db.patch(eventId, filteredUpdates);
    await logAction(
      ctx,
      society._id,
      user._id,
      "update_event",
      eventId,
      "event",
      existing.title
    );
    return true;
  },
});

export const remove = mutation({
  args: {
    societySlug: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, { societySlug, eventId }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const existing = await ctx.db.get(eventId);
    if (!existing || existing.societyId !== society._id) {
      throw new Error("Event not found");
    }

    await ctx.db.delete(eventId);
    await logAction(
      ctx,
      society._id,
      user._id,
      "delete_event",
      eventId,
      "event",
      existing.title
    );
    return true;
  },
});
