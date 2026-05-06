import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserByIdentity, requireAuth } from "./permissions";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await getUserByIdentity(ctx, identity);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();
  },
});

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return user._id;
  },
});
