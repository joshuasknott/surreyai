import { v } from 'convex/values';
import { internalAction, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { OWNER_EMAIL } from './permissions';
import { mentionEmailSignature, type MentionEmail } from './lib/plannerMentionEmail';

const payload = v.object({ notificationId: v.string(), recipientEmail: v.string(), author: v.string(), title: v.string(), excerpt: v.string(), itemId: v.string(), commentId: v.string() });
const args = { id: v.id('plannerNotifications') };
const retryDelays = [10_000, 60_000, 300_000, 900_000, 3_600_000];

export const prepare = internalMutation({
  args, returns: v.union(v.null(), v.object({ payload, attempt: v.number() })),
  handler: async (ctx, { id }) => {
    const notification = await ctx.db.get(id);
    if (!notification || !notification.emailDelivery) return null; // No historic inbox backfill.
    const delivery = notification.emailDelivery;
    if (delivery.status !== 'pending' || delivery.nextAttemptAt > Date.now()) return null;
    // Resend retains idempotency keys for 24 hours. Never resend an uncertain
    // attempt after that window, even if scheduled work resumes after downtime.
    if (delivery.attempts >= 6 || Date.now() - notification._creationTime >= 23 * 60 * 60 * 1000) {
      await ctx.db.patch(id, { emailDelivery: { ...delivery, status: 'failed' } }); return null;
    }
    const comment = await ctx.db.get(notification.commentId);
    const item = await ctx.db.get(notification.itemId);
    const society = await ctx.db.get(notification.societyId);
    const grant = await ctx.db.query('plannerAccess').withIndex('by_societyId_and_email', q => q.eq('societyId', notification.societyId).eq('email', notification.recipientEmail)).unique();
    const preference = await ctx.db.query('plannerEmailPreferences').withIndex('by_societyId_and_email', q => q.eq('societyId', notification.societyId).eq('email', notification.recipientEmail)).unique();
    if (!comment || !item || society?.slug !== 'ai' || comment.itemId !== item._id || comment.societyId !== notification.societyId || item.societyId !== notification.societyId ||
      comment.author.email === notification.recipientEmail || !comment.mentions?.some(person => person.email === notification.recipientEmail) ||
      (notification.recipientEmail !== OWNER_EMAIL && !grant?.active) || preference?.enabled === false) {
      await ctx.db.patch(id, { emailDelivery: { ...delivery, status: 'skipped' } }); return null;
    }
    // Freeze the provider payload across retries, including edits made after the
    // first attempt, so its idempotency key always describes the same email.
    let excerpt = comment.text;
    for (const mention of comment.mentions || []) excerpt = excerpt.replaceAll(`@${mention.email}`, `@${mention.name}`);
    const message: MentionEmail = delivery.payload || { notificationId: id, recipientEmail: notification.recipientEmail, author: comment.author.name, title: item.title, excerpt: excerpt.slice(0, 300), itemId: item._id, commentId: comment._id };
    const attempt = delivery.attempts + 1;
    await ctx.db.patch(id, { emailDelivery: { ...delivery, payload: message, attempts: attempt, nextAttemptAt: Date.now() + 120_000 } });
    // A watchdog also covers action interruption after the provider accepted an email.
    await ctx.scheduler.runAfter(120_000, internal.plannerEmail.deliver, { id });
    return { payload: message, attempt };
  },
});

export const finish = internalMutation({
  args: { ...args, attempt: v.number(), result: v.union(v.literal('sent'), v.literal('retry'), v.literal('failed')) }, returns: v.null(),
  handler: async (ctx, { id, attempt, result }) => {
    const row = await ctx.db.get(id); const delivery = row?.emailDelivery;
    if (!delivery || delivery.status !== 'pending' || delivery.attempts !== attempt) return null;
    if (result !== 'retry' || attempt >= 6) {
      await ctx.db.patch(id, { emailDelivery: { ...delivery, status: result === 'sent' ? 'sent' : 'failed' } });
    } else {
      const delay = retryDelays[attempt - 1];
      await ctx.db.patch(id, { emailDelivery: { ...delivery, nextAttemptAt: Date.now() + delay } });
      await ctx.scheduler.runAfter(delay, internal.plannerEmail.deliver, { id });
    }
    return null;
  },
});

export const deliver = internalAction({
  args, returns: v.null(),
  handler: async (ctx, { id }) => {
    const prepared: { payload: MentionEmail; attempt: number } | null = await ctx.runMutation(internal.plannerEmail.prepare, { id });
    if (!prepared) return null;
    let result: 'sent' | 'retry' | 'failed' = 'retry';
    try {
      const secret = process.env.PLANNER_EMAIL_SECRET;
      if (!secret || secret.length < 32) throw new Error('Email relay not configured');
      const body = JSON.stringify({ timestamp: Date.now(), message: prepared.payload });
      const response = await fetch('https://surreyaisociety.org/api/planner-mention-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Planner-Signature': await mentionEmailSignature(secret, body) },
        body, signal: AbortSignal.timeout(20_000),
      });
      result = response.status === 204 ? 'sent' : response.status === 422 ? 'failed' : 'retry';
    } catch { /* Retry without logging credentials, recipients or private comments. */ }
    await ctx.runMutation(internal.plannerEmail.finish, { id, attempt: prepared.attempt, result });
    return null;
  },
});
