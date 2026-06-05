import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_TASK_LENGTH = 600;
const MAX_TITLE_LENGTH = 90;
const MAX_STEP_TEXT_LENGTH = 8000;
const MAX_CODE_LENGTH = 120000;
const BUILDER_RATE_LIMIT_SCOPE = "agenticBuilder";
const BUILDER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const BUILDER_RATE_LIMIT_REQUESTS = 2;

export const create = mutation({
  args: {
    task: v.string(),
    title: v.string(),
    plannerThinking: v.string(),
    plannerOutput: v.string(),
    researcherThinking: v.string(),
    researcherOutput: v.string(),
    builderThinking: v.string(),
    builderOutput: v.string(),
    reviewerThinking: v.string(),
    reviewerOutput: v.string(),
    source: v.union(v.literal("ai"), v.literal("fallback")),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentBuilds", {
      task: limit(args.task, MAX_TASK_LENGTH),
      title: limit(args.title, MAX_TITLE_LENGTH) || "Agentic Builder draft",
      plannerThinking: limit(args.plannerThinking, MAX_STEP_TEXT_LENGTH),
      plannerOutput: limit(args.plannerOutput, MAX_STEP_TEXT_LENGTH),
      researcherThinking: limit(args.researcherThinking, MAX_STEP_TEXT_LENGTH),
      researcherOutput: limit(args.researcherOutput, MAX_STEP_TEXT_LENGTH),
      builderThinking: limit(args.builderThinking, MAX_STEP_TEXT_LENGTH),
      builderOutput: limit(args.builderOutput, MAX_CODE_LENGTH),
      reviewerThinking: limit(args.reviewerThinking, MAX_STEP_TEXT_LENGTH),
      reviewerOutput: limit(args.reviewerOutput, MAX_CODE_LENGTH),
      source: args.source,
      model: limit(args.model, 80) || "gemini-3.1-flash-lite",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: {
    id: v.id("agentBuilds"),
  },
  handler: async (ctx, args) => {
    const build = await ctx.db.get(args.id);
    if (!build) return null;
    return build;
  },
});

export const consumeRateLimit = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const key = limit(args.key, 120) || "unknown";
    const existing = await ctx.db
      .query("agentRateLimits")
      .withIndex("by_scope_and_key", (q) =>
        q.eq("scope", BUILDER_RATE_LIMIT_SCOPE).eq("key", key)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("agentRateLimits", {
        scope: BUILDER_RATE_LIMIT_SCOPE,
        key,
        count: 1,
        resetAt: now + BUILDER_RATE_LIMIT_WINDOW_MS,
        updatedAt: now,
      });
      return { allowed: true, remaining: BUILDER_RATE_LIMIT_REQUESTS - 1, retryAfterSeconds: 0 };
    }

    if (existing.resetAt <= now) {
      await ctx.db.patch(existing._id, {
        count: 1,
        resetAt: now + BUILDER_RATE_LIMIT_WINDOW_MS,
        updatedAt: now,
      });
      return { allowed: true, remaining: BUILDER_RATE_LIMIT_REQUESTS - 1, retryAfterSeconds: 0 };
    }

    if (existing.count >= BUILDER_RATE_LIMIT_REQUESTS) {
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
      remaining: Math.max(0, BUILDER_RATE_LIMIT_REQUESTS - existing.count - 1),
      retryAfterSeconds: 0,
    };
  },
});

function limit(value: string, maxLength: number): string {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd();
}
