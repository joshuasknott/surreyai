import { v } from 'convex/values';
import { mutation, type MutationCtx } from './_generated/server';
import { OWNER_EMAIL } from './permissions';

async function reserve(ctx: MutationCtx, scope: string, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const row = await ctx.db.query('agentRateLimits').withIndex('by_scope_and_key', q => q.eq('scope', scope).eq('key', key)).unique();
  if (row && row.resetAt > now && row.count >= limit) return false;
  if (row) await ctx.db.patch(row._id, { count: row.resetAt > now ? row.count + 1 : 1, resetAt: row.resetAt > now ? row.resetAt : now + windowMs, updatedAt: now });
  else await ctx.db.insert('agentRateLimits', { scope, key, count: 1, resetAt: now + windowMs, updatedAt: now });
  return true;
}

/** Server-only gate for the custom sign-in form. The shared secret never reaches
 * the browser, so unauthenticated callers cannot query the committee email list. */
export const requestCode = mutation({
  args: { email: v.string(), requester: v.string(), secret: v.string() },
  returns: v.union(v.literal('allowed'), v.literal('denied'), v.literal('limited')),
  handler: async (ctx, { email, requester, secret }) => {
    const expected = process.env.PLANNER_SIGN_IN_SECRET;
    if (!expected || expected.length < 32 || secret !== expected) throw new Error('Sign-in service access required');
    if (!/^[a-f0-9]{64}$/.test(requester)) throw new Error('Invalid sign-in request');
    if (!await reserve(ctx, 'plannerSignInRequester', requester, 20, 900_000)) return 'limited' as const;
    const normalized = email.trim().toLowerCase();
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return 'denied' as const;
    const ai = await ctx.db.query('societies').withIndex('by_slug', q => q.eq('slug', 'ai')).unique();
    if (!ai) return 'denied' as const;
    const grant = await ctx.db.query('plannerAccess').withIndex('by_societyId_and_email', q => q.eq('societyId', ai._id).eq('email', normalized)).unique();
    if (normalized !== OWNER_EMAIL && !grant?.active) return 'denied' as const;
    if (!await reserve(ctx, 'plannerSignInEmail', normalized, 5, 600_000)) return 'limited' as const;
    return 'allowed' as const;
  },
});
