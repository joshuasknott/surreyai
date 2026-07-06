import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireContentEditor } from "./permissions";

export const generateUploadUrl = mutation({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    await requireContentEditor(ctx, society._id);

    return await ctx.storage.generateUploadUrl();
  },
});
