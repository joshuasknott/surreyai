import { query } from "./_generated/server";
import { v } from "convex/values";

export const listBySociety = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_society", (q) =>
        q.eq("userId", user._id).eq("societyId", society._id)
      )
      .first();
    if (!membership || membership.status !== "active") return [];
    if (membership.role !== "protectedAdmin" && membership.role !== "admin")
      return [];

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .order("desc")
      .take(100)
      .collect();

    const result = [];
    for (const log of logs) {
      const logUser = await ctx.db.get(log.userId);
      result.push({
        ...log,
        userName: logUser?.name || "Unknown",
        userEmail: logUser?.email || "Unknown",
      });
    }
    return result;
  },
});
