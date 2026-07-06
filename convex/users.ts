import { query, mutation } from "./_generated/server";
import { getUserByIdentity, requireAuth } from "./permissions";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await getUserByIdentity(ctx, identity);
  },
});

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return user._id;
  },
});
