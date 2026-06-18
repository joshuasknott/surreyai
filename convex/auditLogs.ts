import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireExistingAdmin } from "./permissions";
import type { Doc } from "./_generated/dataModel";

export const listBySociety = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    try {
      await requireExistingAdmin(ctx, society._id);
    } catch {
      return [];
    }

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .order("desc")
      .take(100);

    const result = [];
    for (const log of logs) {
      const logUser: Doc<"users"> | null = await ctx.db.get(log.userId);
      result.push({
        ...log,
        userName: logUser?.name || "Unknown",
        userEmail: logUser?.email || "Unknown",
      });
    }
    return result;
  },
});
