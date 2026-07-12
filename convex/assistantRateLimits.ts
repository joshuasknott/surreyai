import { v } from "convex/values";
import { mutation } from "./_generated/server";

const RATE_LIMIT_SCOPE = "websiteAssistant";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 24;
const SERVER_SECRET_ENV = "ASSISTANT_RATE_LIMIT_SECRET";

export const consume = mutation({
  args: {
    key: v.string(),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const now = Date.now();
    const key = limit(args.key, 160) || "unknown";
    const existing = await ctx.db
      .query("agentRateLimits")
      .withIndex("by_scope_and_key", (q) =>
        q.eq("scope", RATE_LIMIT_SCOPE).eq("key", key)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("agentRateLimits", {
        scope: RATE_LIMIT_SCOPE,
        key,
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
        updatedAt: now,
      });
      return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, retryAfterSeconds: 0 };
    }

    if (existing.resetAt <= now) {
      await ctx.db.patch(existing._id, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
        updatedAt: now,
      });
      return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, retryAfterSeconds: 0 };
    }

    if (existing.count >= RATE_LIMIT_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      updatedAt: now,
    });

    return {
      allowed: true,
      remaining: Math.max(0, RATE_LIMIT_REQUESTS - existing.count - 1),
      retryAfterSeconds: 0,
    };
  },
});

function requireServerSecret(secret: string): void {
  const expectedSecret = process.env[SERVER_SECRET_ENV];
  if (!expectedSecret || secret !== expectedSecret) {
    throw new Error("Unauthorized server-only mutation");
  }
}

function limit(value: string, maxLength: number): string {
  const text = value.trim();
  return text.length <= maxLength ? text : text.slice(0, maxLength).trimEnd();
}
