import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation, internalMutation, internalQuery, type QueryCtx, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { OWNER_EMAIL, getUserByIdentity, ensureUser } from "./permissions";
import {
  activityValidator, cleanActivity, planningStage, activePlanningStage, plannerTeam, publicFields,
  plannerItemValidator, publicActivityValidator, taskValidator, plannerAttachmentValidator, plannerFileValidator, plannerProfileValidator,
  calendarItemValidator, plannerToday,
  plannerCommentValidator, plannerActivityValidator, personInitials, type PlannerPerson, type PlannerActivity,
  plannerMentionValidator, plannerNotificationValidator, type PlannerMention, type PlannerNotification,
} from "./plannerModel";
import { mentionTokens } from "./lib/plannerMentions";
import { plannerLeads, plannerTeams, type PlannerTeam } from "./plannerTeams";

function validateAssignment(teams?: PlannerTeam[], lead?: string | null) {
  if (teams && (teams.length > plannerTeams.length || new Set(teams).size !== teams.length)) throw new Error("Choose each team only once");
  if (lead !== undefined && lead !== null && !plannerLeads.includes(lead)) throw new Error("Choose a lead from the committee board");
}

function cleanWaitingOn(value: string) {
  const clean = value.trim();
  if (clean.length > 160) throw new Error('Keep the waiting status under 160 characters');
  return clean;
}

function cleanAttachments(attachments: { name: string; url: string }[]) {
  if (attachments.length > 10) throw new Error("Attach up to 10 links per card");
  return attachments.map(attachment => {
    const name = attachment.name.trim(); const url = attachment.url.trim();
    if (!name || name.length > 160 || url.length > 1500) throw new Error("Add a name and a complete https:// link");
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error("Use a complete https:// attachment link"); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error("Use a secure https:// attachment link");
    return { name, url };
  });
}

async function society(ctx: QueryCtx | MutationCtx) {
  const row = await ctx.db.query("societies").withIndex("by_slug", q => q.eq("slug", "ai")).unique();
  if (!row) throw new Error("AI Society is not configured");
  return row;
}

async function committeeAccess(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const ai = await society(ctx);
  const user = await getUserByIdentity(ctx, identity);
  // Access is tied to the authenticated email claim, never an editable profile
  // or an inherited society role. The owner can bootstrap without a membership.
  const email = (identity.email || "").trim().toLowerCase();
  if (!email || identity.emailVerified === false) return null;
  const manager = email === OWNER_EMAIL;
  const grant = email ? await ctx.db.query("plannerAccess")
    .withIndex("by_societyId_and_email", q => q.eq("societyId", ai._id).eq("email", email)).unique() : null;
  if (!manager && !grant?.active) return null;
  return { ai, identity, user, email, manager };
}

async function requireCommittee(ctx: QueryCtx | MutationCtx) {
  const access = await committeeAccess(ctx);
  if (!access) throw new Error("Committee access required");
  return access;
}

async function requireItem(ctx: MutationCtx, id: Id<"plannerItems">, revision: number) {
  const access = await requireCommittee(ctx);
  const item = await ctx.db.get(id);
  if (!item || item.societyId !== access.ai._id) throw new Error("Activity not found");
  if (item.revision !== revision) throw new Error("Someone else updated this activity. Close it and reopen the latest version.");
  return { ...access, item };
}

async function audit(ctx: MutationCtx, action: string, targetId: string, title: string, plannerMessage?: string) {
  const access = await requireCommittee(ctx);
  const user = await ensureUser(ctx, access.identity);
  await ctx.db.insert("auditLogs", {
    societyId: access.ai._id, userId: user._id, action, targetId, targetType: "plannerItem", details: title,
    ...(plannerMessage ? { plannerMessage } : {}),
  });
}

const plannerActivityActions = new Set([
  "create_planner_item", "save_planner_draft", "move_planner_item", "publish_planner_item", "unpublish_planner_item",
  "attach_planner_file", "remove_planner_file",
]);

function stageLabel(stage: string) {
  return ({ ideas: "Ideas", planning: "In progress", ready: "Ready", done: "Done", published: "Published", archived: "Archived" } as Record<string, string>)[stage] || stage;
}

/**
 * A dated public event is considered finished after its London-local date.
 * When an end time is present, it can also finish during today's local date;
 * date-only cards retain the whole due day for committee work and calendar
 * visibility. Internal work and projects never enter the automatic archive.
 */
function isPastDueEvent(item: Pick<Doc<"plannerItems">, "date" | "kind" | "endTime" | "internalOnly">, now = new Date()) {
  if (item.internalOnly || (item.kind !== "event" && item.kind !== "hackathon") || !item.date) return false;
  const today = plannerToday(now);
  if (item.date < today) return true;
  if (item.date > today || !item.endTime) return false;
  const londonTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(now);
  return item.endTime <= londonTime;
}

function isLegacyDone(item: Pick<Doc<"plannerItems">, "stage" | "workflowStage">) {
  return item.stage === "done" || (item.stage === "published" && item.workflowStage === "done");
}

function isEffectivelyArchived(item: Doc<"plannerItems">, now = new Date()) {
  return item.stage === "archived" || isLegacyDone(item) || isPastDueEvent(item, now);
}

/** Project legacy/due rows as archived for read paths before the cron persists them. */
function archivedProjection(item: Doc<"plannerItems">): Doc<"plannerItems"> {
  if (item.stage === "archived") return item;
  const { published: _published, publishedAt: _publishedAt, workflowStage: _workflowStage, ...rest } = item;
  return { ...rest, stage: "archived" };
}

async function auditAuthor(ctx: QueryCtx, societyId: Id<"societies">, userId: Id<"users">): Promise<PlannerPerson | null> {
  const user = await ctx.db.get(userId);
  if (!user) return null;
  const profile = await ctx.db.query("plannerProfiles").withIndex("by_societyId_and_userId", q => q.eq("societyId", societyId).eq("userId", userId)).unique();
  const name = (profile?.displayName || user.name || user.email.split("@")[0]).trim();
  return { userId, name, email: user.email, initials: personInitials(name, user.email) };
}

async function actor(ctx: MutationCtx, access: Awaited<ReturnType<typeof requireCommittee>>): Promise<PlannerPerson> {
  const user = await ensureUser(ctx, access.identity);
  const profile = await ctx.db.query('plannerProfiles').withIndex('by_societyId_and_userId', q => q.eq('societyId', access.ai._id).eq('userId', user._id)).unique();
  const name = (profile?.displayName || access.identity.name || user.name || access.email.split("@")[0]).trim().slice(0, 100);
  return { userId: user._id, name, email: access.email, initials: personInitials(name, access.email) };
}

function contributorsFor(item: Pick<Doc<"plannerItems">, "createdBy" | "contributors">, person: PlannerPerson) {
  const people = new Map((item.contributors || []).map(member => [member.userId, member]));
  people.delete(person.userId); people.set(person.userId, person);
  if (item.createdBy) people.delete(item.createdBy.userId);
  return [...(item.createdBy ? [item.createdBy] : []), ...[...people.values()].slice(-199)];
}

async function profileNames(ctx: QueryCtx | MutationCtx, societyId: Id<'societies'>) {
  const profiles = await ctx.db.query('plannerProfiles').withIndex('by_societyId', q => q.eq('societyId', societyId)).take(200);
  const byUser = new Map(profiles.map(profile => [profile.userId, profile]));
  const byEmail = new Map(profiles.map(profile => [profile.email, profile]));
  const person = (value: PlannerPerson): PlannerPerson => {
    const profile = byUser.get(value.userId);
    return profile ? { ...value, name: profile.displayName, initials: personInitials(profile.displayName, value.email) } : value;
  };
  const mention = (value: PlannerMention): PlannerMention => {
    const profile = byEmail.get(value.email);
    return profile ? { ...value, name: profile.displayName, initials: personInitials(profile.displayName, value.email) } : value;
  };
  return { person, mention, item: (item: Doc<'plannerItems'>) => ({ ...item, ...(item.createdBy ? { createdBy: person(item.createdBy) } : {}), ...(item.contributors ? { contributors: item.contributors.map(person) } : {}) }) };
}

export const profiles = query({
  args: {}, returns: v.array(plannerProfileValidator),
  handler: async ctx => {
    const { ai } = await requireCommittee(ctx);
    return (await ctx.db.query('plannerProfiles').withIndex('by_societyId', q => q.eq('societyId', ai._id)).take(200))
      .map(profile => ({ userId: profile.userId, email: profile.email, name: profile.displayName, initials: personInitials(profile.displayName, profile.email), rosterName: profile.rosterName }));
  },
});

export const setDisplayName = mutation({
  args: { name: v.string() }, returns: v.null(),
  handler: async (ctx, { name }) => {
    const access = await requireCommittee(ctx); const user = await ensureUser(ctx, access.identity);
    const clean = name.trim().replace(/\s+/gu, ' ');
    if (!clean || clean.length > 80 || /[\p{Cc}\p{Cf}]/u.test(clean)) throw new Error('Use a name between 1 and 80 characters');
    const existing = await ctx.db.query('plannerProfiles').withIndex('by_societyId_and_userId', q => q.eq('societyId', access.ai._id).eq('userId', user._id)).unique();
    const knownNames = [access.identity.name, user.name, clean];
    const rosterName = existing?.rosterName || (access.email === OWNER_EMAIL ? 'Joshua Knott' : plannerLeads.find(value => knownNames.some(name => name?.trim().toLocaleLowerCase() === value.toLocaleLowerCase())));
    const fields = { societyId: access.ai._id, userId: user._id, email: access.email, displayName: clean, rosterName };
    if (existing) await ctx.db.patch(existing._id, fields); else await ctx.db.insert('plannerProfiles', fields);
    return null;
  },
});

export const fileService = query({
  args: {}, returns: v.string(),
  handler: async ctx => {
    await requireCommittee(ctx);
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) throw new Error('File storage is not configured');
    return `${siteUrl}/planner/files`;
  },
});

export const listFiles = query({
  args: { id: v.id('plannerItems') }, returns: v.array(plannerFileValidator),
  handler: async (ctx, { id }) => {
    const { ai } = await requireCommittee(ctx); const item = await ctx.db.get(id);
    if (!item || item.societyId !== ai._id) throw new Error('Activity not found');
    const files = await ctx.db.query('plannerFiles').withIndex('by_itemId', q => q.eq('itemId', id)).take(10);
    const result = [];
    for (const file of files) {
      const uploadedBy = await auditAuthor(ctx, ai._id, file.uploadedBy);
      result.push({ _id: file._id, _creationTime: file._creationTime, name: file.name, contentType: file.contentType, size: file.size, ...(uploadedBy ? { uploadedBy } : {}) });
    }
    return result;
  },
});

export const fileUploadAccess = internalQuery({
  args: { id: v.id('plannerItems'), requestId: v.string() }, returns: v.null(),
  handler: async (ctx, { id, requestId }) => {
    const { ai, user } = await requireCommittee(ctx); const item = await ctx.db.get(id);
    if (!item || item.societyId !== ai._id) throw new Error('Activity not found');
    const existing = await ctx.db.query('plannerFiles').withIndex('by_itemId_and_requestId', q => q.eq('itemId', id).eq('requestId', requestId)).unique();
    if (existing) { if (existing.uploadedBy !== user?._id) throw new Error('Upload request belongs to another person'); return null; }
    const files = await ctx.db.query('plannerFiles').withIndex('by_itemId', q => q.eq('itemId', id)).take(10);
    if (files.length >= 10) throw new Error('Attach up to 10 files per card');
    return null;
  },
});

export const attachUploadedFile = internalMutation({
  args: { id: v.id('plannerItems'), storageId: v.id('_storage'), name: v.string(), contentType: v.string(), requestId: v.string() },
  returns: v.object({ id: v.id('plannerFiles'), reused: v.boolean() }),
  handler: async (ctx, args) => {
    const access = await requireCommittee(ctx); const item = await ctx.db.get(args.id);
    if (!item || item.societyId !== access.ai._id) throw new Error('Activity not found');
    const person = await actor(ctx, access);
    const existing = await ctx.db.query('plannerFiles').withIndex('by_itemId_and_requestId', q => q.eq('itemId', args.id).eq('requestId', args.requestId)).unique();
    if (existing) {
      if (existing.uploadedBy !== person.userId) throw new Error('Upload request belongs to another person');
      return { id: existing._id, reused: true };
    }
    if ((await ctx.db.query('plannerFiles').withIndex('by_itemId', q => q.eq('itemId', args.id)).take(10)).length >= 10) throw new Error('Attach up to 10 files per card');
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata || metadata.size > 10 * 1024 * 1024 || metadata.size === 0) throw new Error('Choose a file up to 10 MB');
    const id = await ctx.db.insert('plannerFiles', { societyId: access.ai._id, itemId: item._id, storageId: args.storageId, name: args.name, contentType: args.contentType, size: metadata.size, uploadedBy: person.userId, requestId: args.requestId });
    await ctx.db.patch(item._id, { contributors: contributorsFor(item, person), updatedAt: Date.now() });
    await audit(ctx, "attach_planner_file", item._id, item.title, `Attached ${args.name}`);
    return { id, reused: false };
  },
});

export const fileDownloadAccess = internalQuery({
  args: { id: v.id('plannerFiles') }, returns: v.object({ storageId: v.id('_storage'), name: v.string(), contentType: v.string() }),
  handler: async (ctx, { id }) => {
    const { ai } = await requireCommittee(ctx); const file = await ctx.db.get(id);
    if (!file || file.societyId !== ai._id) throw new Error('Attachment not found');
    const item = await ctx.db.get(file.itemId);
    if (!item || item.societyId !== ai._id) throw new Error('Attachment not found');
    return { storageId: file.storageId, name: file.name, contentType: file.contentType };
  },
});

export const removeFile = mutation({
  args: { id: v.id('plannerFiles') }, returns: v.null(),
  handler: async (ctx, { id }) => {
    const access = await requireCommittee(ctx); const { ai } = access; const file = await ctx.db.get(id);
    if (!file) return null;
    const item = await ctx.db.get(file.itemId);
    if (file.societyId !== ai._id || !item || item.societyId !== ai._id) throw new Error('Attachment not found');
    const person = await actor(ctx, access);
    await ctx.storage.delete(file.storageId); await ctx.db.delete(id);
    await ctx.db.patch(item._id, { contributors: contributorsFor(item, person), updatedAt: Date.now() });
    await audit(ctx, "remove_planner_file", item._id, item.title, `Removed ${file.name}`);
    return null;
  },
});

function cleanComment(text: string) {
  const clean = text.trim();
  if (!clean || clean.length > 2000) throw new Error("Write a comment of up to 2,000 characters");
  return clean;
}

async function ownComment(ctx: MutationCtx, id: Id<"plannerComments">) {
  const access = await requireCommittee(ctx);
  const comment = await ctx.db.get(id);
  if (!comment) return null;
  const item = await ctx.db.get(comment.itemId);
  if (!item || item.societyId !== access.ai._id || comment.societyId !== access.ai._id) throw new Error("Comment not found");
  if (comment.author.userId !== access.user?._id) throw new Error("You can only change your own comments");
  return { comment, item };
}

async function mentionPerson(ctx: QueryCtx | MutationCtx, email: string, societyId: Id<'societies'>): Promise<PlannerMention> {
  const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", email)).first();
  const profile = await ctx.db.query('plannerProfiles').withIndex('by_societyId_and_email', q => q.eq('societyId', societyId).eq('email', email)).unique();
  const name = profile?.displayName || user?.name || email.split("@")[0];
  return { email, name, initials: personInitials(name, email) };
}

async function resolveMentions(ctx: MutationCtx, societyId: Id<"societies">, text: string) {
  const emails = [...new Set(mentionTokens(text).map(token => token.email))];
  if (emails.length > 10) throw new Error("Mention up to 10 people in one comment");
  const people: PlannerMention[] = [];
  for (const email of emails) {
    const grant = await ctx.db.query("plannerAccess").withIndex("by_societyId_and_email", q => q.eq("societyId", societyId).eq("email", email)).unique();
    if (email === OWNER_EMAIL || grant?.active) people.push(await mentionPerson(ctx, email, societyId));
  }
  return people;
}

async function notifyInboxChanged(ctx: MutationCtx, societyId: Id<"societies">, recipientEmail: string) {
  const state = await ctx.db.query("plannerNotificationState").withIndex("by_societyId_and_recipientEmail", q => q.eq("societyId", societyId).eq("recipientEmail", recipientEmail)).unique();
  if (state) await ctx.db.patch(state._id, { revision: state.revision + 1 });
  else await ctx.db.insert("plannerNotificationState", { societyId, recipientEmail, revision: 1 });
}

async function syncMentionNotifications(ctx: MutationCtx, item: Doc<"plannerItems">, commentId: Id<"plannerComments">, mentions: PlannerMention[], authorEmail: string) {
  const recipients = new Set(mentions.map(person => person.email).filter(email => email !== authorEmail));
  const existing = await ctx.db.query("plannerNotifications").withIndex("by_commentId", q => q.eq("commentId", commentId)).take(10);
  for (const notification of existing) if (!recipients.has(notification.recipientEmail)) await ctx.db.delete(notification._id);
  for (const email of recipients) if (!existing.some(notification => notification.recipientEmail === email)) {
    // An allowed email can be mentioned before its first sign-in. Reading is bound
    // to the verified session email, using the same allowlist as committee access.
    const id = await ctx.db.insert("plannerNotifications", { societyId: item.societyId, itemId: item._id, commentId, recipientEmail: email, read: false,
      emailDelivery: { status: 'pending', attempts: 0, nextAttemptAt: Date.now() + 10_000 } });
    await ctx.scheduler.runAfter(10_000, internal.plannerEmail.deliver, { id });
  }
  // One small reactive document invalidates the recipient's entire loaded inbox,
  // including edited/deleted/read notifications beyond the first history page.
  for (const email of new Set([...recipients, ...existing.map(notification => notification.recipientEmail)])) await notifyInboxChanged(ctx, item.societyId, email);
}

const archivedDeleteBatchSize = 100;

/**
 * Delete the private children of a card in bounded transactions. The card row
 * is removed by the public mutation first; scheduled continuations only need
 * the opaque item id and society id to finish the sweep.
 */
async function deleteArchivedChildren(ctx: MutationCtx, itemId: Id<"plannerItems">, societyId: Id<"societies">) {
  let hasMore = false;

  const files = await ctx.db.query("plannerFiles")
    .withIndex("by_itemId", q => q.eq("itemId", itemId))
    .take(archivedDeleteBatchSize + 1);
  if (files.length > archivedDeleteBatchSize) hasMore = true;
  for (const file of files.slice(0, archivedDeleteBatchSize)) {
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(file._id);
  }

  const notifications = await ctx.db.query("plannerNotifications")
    .withIndex("by_itemId", q => q.eq("itemId", itemId))
    .take(archivedDeleteBatchSize + 1);
  if (notifications.length > archivedDeleteBatchSize) hasMore = true;
  const recipients = new Set<string>();
  for (const notification of notifications.slice(0, archivedDeleteBatchSize)) {
    recipients.add(notification.recipientEmail);
    await ctx.db.delete(notification._id);
  }
  for (const email of recipients) await notifyInboxChanged(ctx, societyId, email);

  const comments = await ctx.db.query("plannerComments")
    .withIndex("by_itemId", q => q.eq("itemId", itemId))
    .take(archivedDeleteBatchSize + 1);
  if (comments.length > archivedDeleteBatchSize) hasMore = true;
  for (const comment of comments.slice(0, archivedDeleteBatchSize)) await ctx.db.delete(comment._id);

  const activity = await ctx.db.query("auditLogs")
    .withIndex("by_societyId_and_targetId", q => q.eq("societyId", societyId).eq("targetId", itemId))
    .take(archivedDeleteBatchSize + 1);
  if (activity.length > archivedDeleteBatchSize) hasMore = true;
  for (const row of activity.slice(0, archivedDeleteBatchSize)) await ctx.db.delete(row._id);

  return hasMore;
}

export const continueDeleteArchived = internalMutation({
  args: { id: v.id("plannerItems"), societyId: v.id("societies") }, returns: v.null(),
  handler: async (ctx, { id, societyId }) => {
    if (await deleteArchivedChildren(ctx, id, societyId)) {
      await ctx.scheduler.runAfter(0, internal.planner.continueDeleteArchived, { id, societyId });
    }
    return null;
  },
});

export const emailPreference = query({
  args: {}, returns: v.boolean(),
  handler: async ctx => {
    const { ai, email } = await requireCommittee(ctx);
    const preference = await ctx.db.query('plannerEmailPreferences').withIndex('by_societyId_and_email', q => q.eq('societyId', ai._id).eq('email', email)).unique();
    return preference?.enabled ?? true;
  },
});

export const setEmailPreference = mutation({
  args: { enabled: v.boolean() }, returns: v.null(),
  handler: async (ctx, { enabled }) => {
    const { ai, email } = await requireCommittee(ctx);
    const preference = await ctx.db.query('plannerEmailPreferences').withIndex('by_societyId_and_email', q => q.eq('societyId', ai._id).eq('email', email)).unique();
    if (preference) await ctx.db.patch(preference._id, { enabled });
    else await ctx.db.insert('plannerEmailPreferences', { societyId: ai._id, email, enabled });
    return null;
  },
});

export const notificationChanges = query({
  args: {}, returns: v.number(),
  handler: async ctx => {
    const { ai, email } = await requireCommittee(ctx);
    const state = await ctx.db.query("plannerNotificationState").withIndex("by_societyId_and_recipientEmail", q => q.eq("societyId", ai._id).eq("recipientEmail", email)).unique();
    return state?.revision ?? 0;
  },
});

export const access = query({
  args: {},
  returns: v.union(v.null(), v.object({ name: v.string(), email: v.string(), userId: v.union(v.id("users"), v.null()), canManageAccess: v.boolean() })),
  handler: async ctx => {
    const result = await committeeAccess(ctx);
    if (!result) return null;
    const profile = await ctx.db.query('plannerProfiles').withIndex('by_societyId_and_email', q => q.eq('societyId', result.ai._id).eq('email', result.email)).unique();
    return { name: profile?.displayName || result.user?.name || result.identity.name || result.email, email: result.email, userId: result.user?._id || null, canManageAccess: result.manager };
  },
});

export const mentionPeople = query({
  args: {}, returns: v.array(plannerMentionValidator),
  handler: async ctx => {
    const { ai } = await requireCommittee(ctx);
    const grants = await ctx.db.query("plannerAccess").withIndex("by_societyId_and_active_and_email", q => q.eq("societyId", ai._id).eq("active", true)).take(200);
    const emails = [...new Set([OWNER_EMAIL, ...grants.map(grant => grant.email)])];
    return (await Promise.all(emails.map(email => mentionPerson(ctx, email, ai._id)))).sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const notifications = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(plannerNotificationValidator), isDone: v.boolean(), continueCursor: v.string(), unreadCount: v.number() }),
  handler: async (ctx, { paginationOpts }) => {
    const { ai, email } = await requireCommittee(ctx);
    const result = await ctx.db.query("plannerNotifications").withIndex("by_societyId_and_recipientEmail", q => q.eq("societyId", ai._id).eq("recipientEmail", email))
      .order("desc").paginate({ ...paginationOpts, numItems: Math.min(30, Math.max(1, paginationOpts.numItems)) });
    const unread = await ctx.db.query("plannerNotifications").withIndex("by_societyId_and_recipientEmail_and_read", q => q.eq("societyId", ai._id).eq("recipientEmail", email).eq("read", false)).take(100);
    const page: PlannerNotification[] = [];
    const names = await profileNames(ctx, ai._id);
    for (const notification of result.page) {
      const comment = await ctx.db.get(notification.commentId); const item = await ctx.db.get(notification.itemId);
      if (!comment || !item || comment.societyId !== ai._id || item.societyId !== ai._id || comment.itemId !== item._id) continue;
      page.push({ _id: notification._id, _creationTime: notification._creationTime, read: notification.read,
        itemId: item._id, commentId: comment._id, title: item.title, author: names.person(comment.author), text: comment.text.slice(0, 220), mentions: (comment.mentions || []).map(names.mention) });
    }
    return { page, isDone: result.isDone, continueCursor: result.continueCursor, unreadCount: unread.length };
  },
});

export const markNotificationRead = mutation({
  args: { id: v.id("plannerNotifications") }, returns: v.null(),
  handler: async (ctx, { id }) => {
    const { ai, email } = await requireCommittee(ctx);
    const notification = await ctx.db.get(id);
    if (!notification || notification.societyId !== ai._id || notification.recipientEmail !== email) throw new Error("Notification not found");
    if (!notification.read) {
      await ctx.db.patch(id, { read: true });
      await notifyInboxChanged(ctx, ai._id, email);
    }
    return null;
  },
});

export const markAllNotificationsRead = mutation({
  args: {}, returns: v.object({ hasMore: v.boolean() }),
  handler: async ctx => {
    const { ai, email } = await requireCommittee(ctx);
    const unread = await ctx.db.query("plannerNotifications").withIndex("by_societyId_and_recipientEmail_and_read", q => q.eq("societyId", ai._id).eq("recipientEmail", email).eq("read", false)).take(100);
    for (const notification of unread) await ctx.db.patch(notification._id, { read: true });
    if (unread.length) await notifyInboxChanged(ctx, ai._id, email);
    return { hasMore: unread.length === 100 };
  },
});

export const list = query({
  args: { archived: v.optional(v.boolean()), now: v.optional(v.number()) },
  returns: v.array(plannerItemValidator),
  handler: async (ctx, { archived, now }) => {
    const { ai } = await requireCommittee(ctx);
    const names = await profileNames(ctx, ai._id);
    const clock = now === undefined ? new Date() : new Date(now);
    const today = plannerToday(clock);
    if (archived) {
      // The archive view must not wait for the hourly sweep. Include rows that
      // are already due directly from the date index, then dedupe against rows
      // the sweep has persisted as archived. Legacy `done` rows are included
      // here so removing the board column cannot hide existing cards.
      const [persisted, legacyDone, published, due] = await Promise.all([
        ctx.db.query("plannerItems").withIndex("by_societyId_and_stage", q => q.eq("societyId", ai._id).eq("stage", "archived")).order("desc").take(200),
        ctx.db.query("plannerItems").withIndex("by_societyId_and_stage", q => q.eq("societyId", ai._id).eq("stage", "done")).order("desc").take(200),
        ctx.db.query("plannerItems").withIndex("by_societyId_and_stage", q => q.eq("societyId", ai._id).eq("stage", "published")).order("desc").take(200),
        Promise.all((["ideas", "planning", "ready", "published"] as const).flatMap(stage => (["event", "hackathon"] as const).map(kind =>
          ctx.db.query("plannerItems").withIndex("by_societyId_and_stage_and_kind_and_date", q => q.eq("societyId", ai._id)
            .eq("stage", stage).eq("kind", kind).lte("date", today)).order("desc").take(50)))),
      ]);
      const result = new Map<string, Doc<"plannerItems">>();
      for (const item of [...persisted, ...legacyDone, ...published, ...due.flat()]) {
        if (isEffectivelyArchived(item, clock)) result.set(item._id, item);
      }
      return [...result.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 200).map(item => names.item(archivedProjection(item)));
    }
    const stages = ["ideas", "planning", "ready", "published"] as const;
    return (await Promise.all(stages.map(stage => ctx.db.query("plannerItems")
      .withIndex("by_societyId_and_stage", q => q.eq("societyId", ai._id).eq("stage", stage)).order("desc").take(100)))).flat()
      .filter(item => !isEffectivelyArchived(item, clock)).map(names.item);
  },
});

const defaultBoardOrder = ["ideas", "planning", "ready"] as const;
const boardLayoutValidator = v.object({ order: v.array(activePlanningStage), revision: v.number() });

function normalizeBoardOrder(order: readonly string[]): typeof defaultBoardOrder[number][] {
  const active = order.filter((stage): stage is typeof defaultBoardOrder[number] => stage !== "done" && defaultBoardOrder.includes(stage as typeof defaultBoardOrder[number]));
  return [...active, ...defaultBoardOrder.filter(stage => !active.includes(stage))];
}

export const boardLayout = query({
  args: {}, returns: boardLayoutValidator,
  handler: async ctx => {
    const { ai } = await requireCommittee(ctx);
    const layout = await ctx.db.query("plannerBoardLayouts").withIndex("by_societyId", q => q.eq("societyId", ai._id)).unique();
    return layout ? { order: normalizeBoardOrder(layout.order), revision: layout.revision } : { order: [...defaultBoardOrder], revision: 0 };
  },
});

export const reorderBoard = mutation({
  args: { order: v.array(activePlanningStage), revision: v.number() }, returns: v.number(),
  handler: async (ctx, { order, revision }) => {
    const { ai } = await requireCommittee(ctx);
    if (order.length !== defaultBoardOrder.length || new Set(order).size !== defaultBoardOrder.length ||
      defaultBoardOrder.some(stage => !order.includes(stage))) throw new Error("Include each active board list exactly once");
    const layout = await ctx.db.query("plannerBoardLayouts").withIndex("by_societyId", q => q.eq("societyId", ai._id)).unique();
    if ((layout?.revision ?? 0) !== revision) throw new Error("Someone else reordered the lists. The latest order has been loaded.");
    if (layout) await ctx.db.patch(layout._id, { order, revision: revision + 1 });
    else await ctx.db.insert("plannerBoardLayouts", { societyId: ai._id, order, revision: 1 });
    return revision + 1;
  },
});

export const get = query({
  args: { id: v.id("plannerItems"), now: v.optional(v.number()) }, returns: v.union(plannerItemValidator, v.null()),
  handler: async (ctx, { id, now }) => {
    const { ai } = await requireCommittee(ctx);
    const item = await ctx.db.get(id);
    const clock = now === undefined ? new Date() : new Date(now);
    return item?.societyId === ai._id ? (await profileNames(ctx, ai._id)).item(isEffectivelyArchived(item, clock) ? archivedProjection(item) : item) : null;
  },
});

export const listComments = query({
  args: { id: v.id("plannerItems"), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(plannerCommentValidator), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, { id, paginationOpts }) => {
    const { ai } = await requireCommittee(ctx);
    const item = await ctx.db.get(id);
    if (!item || item.societyId !== ai._id) throw new Error("Activity not found");
    const result = await ctx.db.query("plannerComments").withIndex("by_itemId", q => q.eq("itemId", id))
      .order("desc").paginate({ ...paginationOpts, numItems: Math.min(30, Math.max(1, paginationOpts.numItems)) });
    const names = await profileNames(ctx, ai._id);
    return { page: result.page.map(comment => ({ ...comment, author: names.person(comment.author), ...(comment.mentions ? { mentions: comment.mentions.map(names.mention) } : {}) })), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

/**
 * Private, card-scoped activity for the committee card detail view. General
 * audit rows and comment rows are deliberately excluded from this projection.
 */
export const listActivity = query({
  args: { id: v.id("plannerItems"), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(plannerActivityValidator), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, { id, paginationOpts }) => {
    const { ai } = await requireCommittee(ctx);
    const item = await ctx.db.get(id);
    if (!item || item.societyId !== ai._id) throw new Error("Activity not found");
    const result = await ctx.db.query("auditLogs")
      .withIndex("by_societyId_and_targetId", q => q.eq("societyId", ai._id).eq("targetId", id))
      .order("desc")
      .paginate({ ...paginationOpts, numItems: Math.min(30, Math.max(1, paginationOpts.numItems)) });
    const page: PlannerActivity[] = [];
    for (const row of result.page) {
      if (row.targetType !== "plannerItem" || !plannerActivityActions.has(row.action)) continue;
      const author = await auditAuthor(ctx, ai._id, row.userId);
      if (!author) continue;
      const text = row.plannerMessage || legacyPlannerMessage(row.action, row.details || item.title);
      if (!text) continue;
      page.push({ _id: row._id, _creationTime: row._creationTime, author, text });
    }
    return { page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

function legacyPlannerMessage(action: string, title: string) {
  switch (action) {
    case "create_planner_item": return "Created this card";
    case "move_planner_item": return "Moved this card";
    case "publish_planner_item": return "Published this card";
    case "unpublish_planner_item": return "Unpublished this card";
    case "attach_planner_file": return `Attached ${title}`;
    case "remove_planner_file": return `Removed ${title}`;
    // Legacy save rows are retained for attribution backfills but are not
    // presented as activity because their old details field was only a title.
    case "save_planner_draft": return null;
    default: return null;
  }
}

export const addComment = mutation({
  args: { id: v.id("plannerItems"), text: v.string(), requestId: v.string() },
  returns: v.id("plannerComments"),
  handler: async (ctx, { id, text, requestId }) => {
    const access = await requireCommittee(ctx);
    const item = await ctx.db.get(id);
    if (!item || item.societyId !== access.ai._id) throw new Error("Activity not found");
    const clean = cleanComment(text);
    if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(requestId)) throw new Error("Please try posting your comment again");
    const author = await actor(ctx, access);
    const existing = await ctx.db.query("plannerComments")
      .withIndex("by_itemId_and_requestId", q => q.eq("itemId", id).eq("requestId", requestId)).unique();
    if (existing) {
      if (existing.author.userId !== author.userId || existing.text !== clean) throw new Error("Please try posting your comment again");
      return existing._id;
    }
    const mentions = await resolveMentions(ctx, access.ai._id, clean);
    const commentId = await ctx.db.insert("plannerComments", { societyId: access.ai._id, itemId: id, author, text: clean, requestId, mentions });
    await syncMentionNotifications(ctx, item, commentId, mentions, author.email);
    // Discussion does not change the content revision or count as an edit.
    await ctx.db.patch(id, { commentCount: (item.commentCount || 0) + 1 });
    await audit(ctx, "comment_planner_item", id, item.title);
    return commentId;
  },
});

export const editComment = mutation({
  args: { id: v.id("plannerComments"), text: v.string(), revision: v.number() },
  returns: plannerCommentValidator,
  handler: async (ctx, { id, text, revision }) => {
    const own = await ownComment(ctx, id);
    if (!own) throw new Error("Comment not found");
    const { comment, item } = own;
    const clean = cleanComment(text);
    // A retry after a lost response is safe, while edits from another tab cannot be overwritten.
    if (clean === comment.text) return comment;
    if ((comment.revision ?? 0) !== revision) throw new Error("This comment changed. Cancel and edit the latest version.");
    const mentions = await resolveMentions(ctx, item.societyId, clean);
    const changes = { text: clean, editedAt: Date.now(), revision: (comment.revision ?? 0) + 1, mentions };
    await ctx.db.patch(id, changes);
    await syncMentionNotifications(ctx, item, id, mentions, comment.author.email);
    await audit(ctx, "edit_planner_comment", comment.itemId, item.title);
    return { ...comment, ...changes };
  },
});

export const deleteComment = mutation({
  args: { id: v.id("plannerComments") }, returns: v.null(),
  handler: async (ctx, { id }) => {
    const own = await ownComment(ctx, id);
    if (!own) return null;
    const { comment, item } = own;
    await syncMentionNotifications(ctx, item, id, [], comment.author.email);
    await ctx.db.delete(id);
    await ctx.db.patch(item._id, { commentCount: Math.max(0, (item.commentCount ?? 0) - 1) });
    await audit(ctx, "delete_planner_comment", comment.itemId, item.title);
    return null;
  },
});

/** Recover legacy attribution from server-written audit records, never owner text. */
export const backfillAttribution = internalMutation({
  args: { cursor: v.optional(v.string()) }, returns: v.number(),
  handler: async (ctx, { cursor }) => {
    const ai = await ctx.db.query("societies").withIndex("by_slug", q => q.eq("slug", "ai")).unique();
    if (!ai) return 0;
    const batch = await ctx.db.query("plannerItems").withIndex("by_societyId_and_updatedAt", q => q.eq("societyId", ai._id))
      .paginate({ numItems: 10, cursor: cursor || null });
    let changed = 0;
    for (const item of batch.page) {
      if (item.createdBy && item.contributors) continue;
      const history = await ctx.db.query("auditLogs")
        .withIndex("by_societyId_and_targetId", q => q.eq("societyId", ai._id).eq("targetId", item._id)).take(200);
      let createdBy = item.createdBy;
      let people = item.contributors || [];
      for (const entry of history) {
        if (entry.targetType !== "plannerItem" || !["create_planner_item", "save_planner_draft", "move_planner_item", "publish_planner_item", "unpublish_planner_item"].includes(entry.action)) continue;
        const user = await ctx.db.get(entry.userId);
        if (!user) continue;
        const person = { userId: user._id, name: user.name, email: user.email, initials: personInitials(user.name, user.email) };
        if (!createdBy && entry.action === "create_planner_item") createdBy = person;
        people = contributorsFor({ createdBy, contributors: people }, person);
      }
      if (createdBy || people.length) { await ctx.db.patch(item._id, { createdBy, contributors: people }); changed++; }
    }
    if (!batch.isDone) await ctx.scheduler.runAfter(0, internal.planner.backfillAttribution, { cursor: batch.continueCursor });
    return changed;
  },
});

/** Calendar history is independent of the board's active/archive limits. */
export const calendar = query({
  args: { month: v.string(), now: v.optional(v.number()) },
  returns: v.object({ items: v.array(calendarItemValidator), hasMore: v.boolean() }),
  handler: async (ctx, { month, now }) => {
    const { ai } = await requireCommittee(ctx);
    const clock = now === undefined ? new Date() : new Date(now);
    if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a valid calendar month");
    const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).toISOString().slice(0, 10);
    const rows = await ctx.db.query("plannerItems")
      .withIndex("by_societyId_and_date", q => q.eq("societyId", ai._id)
        .gte("date", `${month}-01`).lte("date", last))
      .take(201);
    return {
      items: rows.slice(0, 200).map(item => ({
        _id: item._id, stage: isEffectivelyArchived(item, clock) ? "archived" : item.stage, title: item.title, kind: item.kind, category: item.category,
        team: item.team, teams: item.teams, internalOnly: item.internalOnly,
        date: item.date, startTime: item.startTime, endTime: item.endTime, location: item.location,
      })),
      hasMore: rows.length > 200,
    };
  },
});

/** Runs without an open browser. Keep every event and its private details. */
export const archivePastEvents = internalMutation({
  args: {}, returns: v.number(),
  handler: async ctx => {
    const ai = await ctx.db.query("societies").withIndex("by_slug", q => q.eq("slug", "ai")).unique();
    if (!ai) return 0;
    const today = plannerToday();
    let count = 0;
    // Cards created before the Done column was removed may still be published
    // with workflowStage=done. Persist those as archived so they disappear
    // from the public event feed as well as the committee board.
    const legacyPublished = await ctx.db.query("plannerItems")
      .withIndex("by_societyId_and_stage", q => q.eq("societyId", ai._id).eq("stage", "published"))
      .order("desc").take(100);
    for (const item of legacyPublished) {
      if (item.workflowStage !== "done") continue;
      await ctx.db.patch(item._id, { stage: "archived", published: undefined, publishedAt: undefined,
        workflowStage: undefined, revision: item.revision + 1, updatedAt: Date.now() });
      count++;
    }
    if (count === 100) {
      await ctx.scheduler.runAfter(0, internal.planner.archivePastEvents, {});
      return count;
    }
    const stages = ["ideas", "planning", "ready", "published"] as const;
    const archive = async (rows: Doc<"plannerItems">[]) => {
      for (const item of rows) {
        if (count >= 100 || !isPastDueEvent(item, new Date())) continue;
        await ctx.db.patch(item._id, { stage: "archived", published: undefined, publishedAt: undefined,
          revision: item.revision + 1, updatedAt: Date.now() });
        count++;
      }
    };
    // Historical dates are the common path and remain index-bounded.
    for (const stage of stages) {
      for (const kind of ["event", "hackathon"] as const) {
        const rows = await ctx.db.query("plannerItems")
          .withIndex("by_societyId_and_stage_and_kind_and_date", q => q.eq("societyId", ai._id)
            .eq("stage", stage).eq("kind", kind).gt("date", "").lt("date", today))
          .take(100 - count);
        await archive(rows);
        if (count === 100) {
          await ctx.scheduler.runAfter(0, internal.planner.archivePastEvents, {});
          return count;
        }
      }
    }
    // An event with an end time can finish during today's London-local date.
    // Query today's bucket separately so a large historical backlog cannot
    // hide these rows behind the bounded historical read above.
    for (const stage of stages) {
      for (const kind of ["event", "hackathon"] as const) {
        const rows = await ctx.db.query("plannerItems")
          .withIndex("by_societyId_and_stage_and_kind_and_date", q => q.eq("societyId", ai._id)
            .eq("stage", stage).eq("kind", kind).eq("date", today))
          .take(100 - count);
        await archive(rows);
        if (count === 100) {
          await ctx.scheduler.runAfter(0, internal.planner.archivePastEvents, {});
          return count;
        }
      }
    }
    return count;
  },
});

export const create = mutation({
  args: { activity: activityValidator, stage: v.optional(planningStage), team: v.optional(v.union(plannerTeam, v.null())), teams: v.optional(v.array(plannerTeam)), lead: v.optional(v.union(v.string(), v.null())), waitingOn: v.optional(v.string()), internalOnly: v.optional(v.boolean()), notes: v.optional(v.string()), owner: v.optional(v.string()), tasks: v.optional(v.array(taskValidator)), attachments: v.optional(v.array(plannerAttachmentValidator)) },
  returns: v.id("plannerItems"),
  handler: async (ctx, args) => {
    const access = await requireCommittee(ctx);
    const person = await actor(ctx, access);
    const activity = cleanActivity(args.internalOnly ? { ...args.activity, kind: 'project' } : args.activity);
    validatePrivate(args.notes || "", args.owner || "", args.tasks || []);
    validateAssignment(args.teams, args.lead);
    const id = await ctx.db.insert("plannerItems", { ...activity, societyId: access.ai._id, createdBy: person, contributors: [person], commentCount: 0,
      stage: args.stage || "ideas", team: args.teams ? null : args.team, teams: args.teams, lead: args.lead, ...(args.waitingOn !== undefined ? { waitingOn: cleanWaitingOn(args.waitingOn) } : {}), internalOnly: args.internalOnly, notes: args.notes || "", owner: args.owner || "", tasks: args.tasks || [], attachments: cleanAttachments(args.attachments || []), revision: 1, updatedAt: Date.now() });
    await audit(ctx, "create_planner_item", id, activity.title, "Created this card");
    return id;
  },
});

export const save = mutation({
  args: { id: v.id("plannerItems"), revision: v.number(), activity: activityValidator, stage: v.optional(planningStage), workflowStage: v.optional(planningStage), team: v.optional(v.union(plannerTeam, v.null())), teams: v.optional(v.array(plannerTeam)), lead: v.optional(v.union(v.string(), v.null())), waitingOn: v.optional(v.string()), internalOnly: v.optional(v.boolean()), notes: v.string(), owner: v.string(), tasks: v.array(taskValidator), attachments: v.optional(v.array(plannerAttachmentValidator)) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const access = await requireItem(ctx, args.id, args.revision);
    const { item } = access;
    const person = await actor(ctx, access);
    validatePrivate(args.notes, args.owner, args.tasks);
    validateAssignment(args.teams, args.lead);
    const activity = cleanActivity((args.internalOnly ?? item.internalOnly) ? { ...args.activity, kind: 'project' } : args.activity);
    const effectivelyArchived = isEffectivelyArchived(item);
    if (item.stage === "published" && args.stage && !effectivelyArchived) throw new Error("Unpublish this activity before changing its stage");
    if (item.published && args.internalOnly) throw new Error("Unpublish this activity before making it an internal card");
    const nextTeam = args.teams !== undefined ? null : args.team !== undefined ? args.team : item.team;
    const nextTeams = args.teams !== undefined ? args.teams : args.team !== undefined ? undefined : item.teams;
    const nextLead = args.lead !== undefined ? args.lead : item.lead;
    const nextWaitingOn = args.waitingOn !== undefined ? cleanWaitingOn(args.waitingOn) : item.waitingOn;
    const nextInternalOnly = args.internalOnly !== undefined ? args.internalOnly : item.internalOnly;
    const nextAttachments = args.attachments !== undefined ? cleanAttachments(args.attachments) : item.attachments;
    const nextIsPastDue = isPastDueEvent({ ...item, ...activity, internalOnly: nextInternalOnly });
    if (effectivelyArchived && args.stage && args.stage !== "done" && nextIsPastDue) {
      throw new Error("Choose a future date before restoring this event");
    }
    const nextStage = nextIsPastDue ? "archived" : args.stage || (effectivelyArchived ? "archived" : item.stage);
    const changes: string[] = [];
    if (item.stage !== nextStage) changes.push(`Moved this card from ${stageLabel(item.stage)} to ${stageLabel(nextStage)}`);
    if (item.date !== activity.date) changes.push(item.date && !activity.date ? "Removed the due date" : `Changed the due date to ${activity.date}`);
    if ((item.lead ?? null) !== (nextLead ?? null)) changes.push(nextLead ? `Changed the lead to ${nextLead}` : "Removed the lead");
    if (JSON.stringify(item.tasks) !== JSON.stringify(args.tasks)) changes.push("Updated the checklist");
    if (JSON.stringify(item.attachments || []) !== JSON.stringify(nextAttachments || [])) changes.push("Updated attachments");
    if (JSON.stringify(item.teams || []) !== JSON.stringify(nextTeams || []) || (item.team ?? null) !== (nextTeam ?? null)) changes.push("Updated teams");
    if (item.kind !== activity.kind || item.category !== activity.category || item.location !== activity.location || item.startTime !== activity.startTime || item.endTime !== activity.endTime || item.registrationUrl !== activity.registrationUrl) changes.push("Updated card details");
    const nextWorkflowStage = args.workflowStage !== undefined && item.stage === 'published' ? args.workflowStage : item.workflowStage;
    const previousWorkflowStage = item.workflowStage || (item.stage === 'published' ? 'ready' : undefined);
    if (item.stage === 'published' && (previousWorkflowStage || 'ready') !== (nextWorkflowStage || 'ready')) changes.push(`Moved this card from ${stageLabel(previousWorkflowStage || 'ready')} to ${stageLabel(nextWorkflowStage || 'ready')}`);
    if (item.title !== activity.title || item.description !== activity.description || item.notes !== args.notes.trim() || item.owner !== args.owner.trim() || (item.internalOnly ?? false) !== (nextInternalOnly ?? false) || (item.waitingOn || '') !== (nextWaitingOn || '')) changes.push("Updated this card");
    await ctx.db.patch(item._id, { ...activity, stage: nextStage, notes: args.notes.trim(), owner: args.owner.trim(), tasks: args.tasks,
      ...(nextStage === "archived" || item.stage === "published" && nextStage !== "published" ? { published: undefined, publishedAt: undefined, workflowStage: undefined } : {}),
      ...(args.teams !== undefined ? { teams: args.teams, team: null } : args.team !== undefined ? { team: args.team, teams: undefined } : {}),
      ...(args.lead !== undefined ? { lead: args.lead } : {}),
      ...(args.waitingOn !== undefined ? { waitingOn: cleanWaitingOn(args.waitingOn) } : {}),
      ...(args.attachments !== undefined ? { attachments: cleanAttachments(args.attachments) } : {}),
      ...(args.internalOnly !== undefined ? { internalOnly: args.internalOnly } : {}),
      ...(args.workflowStage !== undefined && item.stage === 'published' && nextStage === 'published' ? { workflowStage: args.workflowStage } : {}),
      ...(changes.length ? { contributors: contributorsFor(item, person) } : {}),
      revision: item.revision + 1, updatedAt: changes.length ? Date.now() : item.updatedAt });
    await audit(ctx, "save_planner_draft", item._id, activity.title, changes.length ? changes.join(" · ") : undefined);
    return null;
  },
});

/** Moving a card on the board never publishes or withdraws its public snapshot. */
export const moveOnBoard = mutation({
  args: { id: v.id('plannerItems'), revision: v.number(), stage: planningStage }, returns: v.null(),
  handler: async (ctx, args) => {
    const access = await requireItem(ctx, args.id, args.revision);
    const { item } = access;
    if (item.stage === 'archived') throw new Error('Restore this card before moving it');
    const person = await actor(ctx, access);
    const previousStage = item.stage === 'published' ? (item.workflowStage || 'ready') : item.stage;
    await ctx.db.patch(item._id, {
      ...(item.stage === 'published' ? { workflowStage: args.stage } : { stage: args.stage }),
      contributors: contributorsFor(item, person), revision: item.revision + 1, updatedAt: Date.now(),
    });
    if (previousStage !== args.stage) await audit(ctx, 'move_planner_item', item._id, item.title, `Moved this card from ${stageLabel(previousStage)} to ${stageLabel(args.stage)}`);
    return null;
  },
});

export const move = mutation({
  args: { id: v.id("plannerItems"), revision: v.number(), stage: v.union(planningStage, v.literal("archived")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const access = await requireItem(ctx, args.id, args.revision);
    const { item } = access;
    if (args.stage !== "archived" && isPastDueEvent(item)) {
      throw new Error("Choose a future date before restoring this event");
    }
    const person = await actor(ctx, access);
    await ctx.db.patch(item._id, { stage: args.stage, published: undefined, publishedAt: undefined, workflowStage: undefined,
      contributors: contributorsFor(item, person), revision: item.revision + 1, updatedAt: Date.now() });
    const action = item.stage === "published" ? "unpublish_planner_item" : "move_planner_item";
    if (item.stage !== args.stage) await audit(ctx, action, item._id, item.title, action === "unpublish_planner_item" ? "Unpublished this card" : `Moved this card from ${stageLabel(item.stage)} to ${stageLabel(args.stage)}`);
    return null;
  },
});

/** Permanently delete a card that is already archived (including legacy/due rows). */
export const deleteArchived = mutation({
  args: { id: v.id("plannerItems"), revision: v.number() }, returns: v.null(),
  handler: async (ctx, { id, revision }) => {
    const access = await requireItem(ctx, id, revision);
    const { item } = access;
    if (!isEffectivelyArchived(item)) throw new Error("Archive this card before deleting it");
    const hasMore = await deleteArchivedChildren(ctx, item._id, access.ai._id);
    await ctx.db.delete(item._id);
    if (hasMore) await ctx.scheduler.runAfter(0, internal.planner.continueDeleteArchived, { id: item._id, societyId: access.ai._id });
    return null;
  },
});

export const publish = mutation({
  args: { id: v.id("plannerItems"), revision: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const access = await requireItem(ctx, args.id, args.revision);
    const { item } = access;
    const person = await actor(ctx, access);
    if (item.internalOnly) throw new Error("Internal cards cannot be published to the website");
    if (item.stage !== "ready" && item.stage !== "published") throw new Error("Move this activity to Ready before publishing");
    const snapshot = cleanActivity(publicFields(item), true);
    await ctx.db.patch(item._id, { stage: "published", workflowStage: item.workflowStage || 'ready', published: snapshot, publishedAt: Date.now(),
      contributors: contributorsFor(item, person), revision: item.revision + 1, updatedAt: Date.now() });
    await audit(ctx, "publish_planner_item", item._id, item.title, "Published this card");
    return null;
  },
});

export const listPublished = query({
  args: {}, returns: v.array(publicActivityValidator),
  handler: async ctx => {
    const ai = await ctx.db.query("societies").withIndex("by_slug", q => q.eq("slug", "ai")).unique();
    if (!ai) return [];
    const rows = await ctx.db.query("plannerItems")
      .withIndex("by_societyId_and_stage", q => q.eq("societyId", ai._id).eq("stage", "published")).order("desc").take(200);
    return rows.flatMap(item => !isEffectivelyArchived(item) && item.published ? [{ id: item._id, ...publicFields(item.published) }] : []);
  },
});

export const getPublished = query({
  args: { id: v.id("plannerItems") }, returns: v.union(publicActivityValidator, v.null()),
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    if (!item || item.stage !== "published" || !item.published || isEffectivelyArchived(item)) return null;
    const ai = await ctx.db.get(item.societyId);
    return ai?.slug === "ai" ? { id: item._id, ...publicFields(item.published) } : null;
  },
});

export const listAccess = query({
  args: {}, returns: v.array(v.object({ email: v.string(), active: v.boolean() })),
  handler: async ctx => {
    const { ai, manager } = await requireCommittee(ctx);
    if (!manager) throw new Error("Only the planner owner can manage committee access");
    const rows = await ctx.db.query("plannerAccess").withIndex("by_societyId", q => q.eq("societyId", ai._id)).take(200);
    return rows.map(row => ({ email: row.email, active: row.active }));
  },
});

export const setAccess = mutation({
  args: { email: v.string(), active: v.boolean() }, returns: v.null(),
  handler: async (ctx, { email, active }) => {
    const { ai, manager } = await requireCommittee(ctx);
    if (!manager) throw new Error("Only the planner owner can manage committee access");
    const normalized = email.trim().toLowerCase();
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Enter a valid committee email");
    if (normalized === OWNER_EMAIL) throw new Error("The planner owner always has access");
    const row = await ctx.db.query("plannerAccess").withIndex("by_societyId_and_email", q => q.eq("societyId", ai._id).eq("email", normalized)).unique();
    if (row) await ctx.db.patch(row._id, { active });
    else await ctx.db.insert("plannerAccess", { societyId: ai._id, email: normalized, active });
    await audit(ctx, active ? "grant_planner_access" : "revoke_planner_access", normalized, "Committee access");
    return null;
  },
});

export const reserveDraft = mutation({
  args: {}, returns: v.boolean(),
  handler: async ctx => {
    const { identity } = await requireCommittee(ctx);
    const now = Date.now();
    const key = identity.tokenIdentifier;
    const row = await ctx.db.query("agentRateLimits").withIndex("by_scope_and_key", q => q.eq("scope", "plannerDraft").eq("key", key)).unique();
    if (row && row.resetAt > now && row.count >= 10) return false;
    if (row) await ctx.db.patch(row._id, { count: row.resetAt > now ? row.count + 1 : 1, resetAt: row.resetAt > now ? row.resetAt : now + 3_600_000, updatedAt: now });
    else await ctx.db.insert("agentRateLimits", { scope: "plannerDraft", key, count: 1, resetAt: now + 3_600_000, updatedAt: now });
    return true;
  },
});

function validatePrivate(notes: string, owner: string, tasks: Doc<"plannerItems">["tasks"]) {
  if (notes.length > 8000 || owner.length > 160 || tasks.length > 30 || tasks.some(task => !task.text.trim() || task.text.length > 300)) {
    throw new Error("Keep notes under 8,000 characters and checklists to 30 short tasks");
  }
}
