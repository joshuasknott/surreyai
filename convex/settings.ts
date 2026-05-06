import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireContentEditor, logAction } from "./permissions";

export const getSettings = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return null;

    const settings = await ctx.db
      .query("siteSettings")
      .withIndex("by_society_key", (q) =>
        q.eq("societyId", society._id)
      )
      .collect();

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return {
      society: {
        _id: society._id,
        name: society.name,
        shortName: society.shortName,
        slug: society.slug,
        domain: society.domain,
        logo: society.logo,
        contactEmail: society.contactEmail,
        socials: society.socials,
        membershipUrl: society.membershipUrl,
        studentsUnionUrl: society.studentsUnionUrl,
      },
      settings: settingsMap,
    };
  },
});

export const updateSettings = mutation({
  args: {
    societySlug: v.string(),
    updates: v.object({
      contactEmail: v.optional(v.string()),
      membershipUrl: v.optional(v.string()),
      studentsUnionUrl: v.optional(v.string()),
      logo: v.optional(v.string()),
      socials: v.optional(
        v.object({
          instagram: v.optional(v.string()),
          linkedin: v.optional(v.string()),
          tiktok: v.optional(v.string()),
          twitter: v.optional(v.string()),
          discord: v.optional(v.string()),
          whatsapp: v.optional(v.string()),
          email: v.optional(v.string()),
        })
      ),
    }),
  },
  handler: async (ctx, { societySlug, updates }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const societyUpdates: Record<string, any> = {};
    if (updates.contactEmail !== undefined)
      societyUpdates.contactEmail = updates.contactEmail;
    if (updates.membershipUrl !== undefined)
      societyUpdates.membershipUrl = updates.membershipUrl;
    if (updates.studentsUnionUrl !== undefined)
      societyUpdates.studentsUnionUrl = updates.studentsUnionUrl;
    if (updates.logo !== undefined) societyUpdates.logo = updates.logo;
    if (updates.socials !== undefined)
      societyUpdates.socials = updates.socials;

    if (Object.keys(societyUpdates).length > 0) {
      await ctx.db.patch(society._id, societyUpdates);
    }

    await logAction(
      ctx,
      society._id,
      user._id,
      "update_settings",
      society._id,
      "society",
      JSON.stringify(updates)
    );
    return true;
  },
});

export const setCustomSetting = mutation({
  args: {
    societySlug: v.string(),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, { societySlug, key, value }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireContentEditor(ctx, society._id);

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_society_key", (q) =>
        q.eq("societyId", society._id).eq("key", key)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("siteSettings", {
        societyId: society._id,
        key,
        value,
      });
    }

    await logAction(
      ctx,
      society._id,
      user._id,
      "set_setting",
      undefined,
      "setting",
      `${key}=${value}`
    );
    return true;
  },
});
