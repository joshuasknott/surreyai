import { v, type Infer } from "convex/values";

export const activityFields = {
  title: v.string(),
  kind: v.union(v.literal("event"), v.literal("project"), v.literal("hackathon")),
  category: v.string(),
  description: v.string(),
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  location: v.string(),
  registrationUrl: v.string(),
};
export const activityValidator = v.object(activityFields);
export type Activity = Infer<typeof activityValidator>;
export const planningStage = v.union(v.literal("ideas"), v.literal("planning"), v.literal("ready"));
export const itemStage = v.union(planningStage, v.literal("published"), v.literal("archived"));
export const taskValidator = v.object({ text: v.string(), done: v.boolean() });
export const plannerPersonValidator = v.object({
  userId: v.id("users"), name: v.string(), email: v.string(), initials: v.string(),
});
export type PlannerPerson = Infer<typeof plannerPersonValidator>;
export const plannerMentionValidator = v.object({ email: v.string(), name: v.string(), initials: v.string() });
export type PlannerMention = Infer<typeof plannerMentionValidator>;
export function personInitials(name: string, email: string): string {
  const source = name && !name.includes("@") ? name : email.split("@")[0];
  const words = source.split(/[\s._+\-]+/u).filter(Boolean);
  const first = [...(words[0] || "?")][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : "";
  return [...`${first}${last}`.toUpperCase()].slice(0, 2).join("");
}
export const plannerCommentFields = {
  societyId: v.id("societies"), itemId: v.id("plannerItems"),
  author: plannerPersonValidator, text: v.string(), requestId: v.string(),
  revision: v.optional(v.number()), editedAt: v.optional(v.number()),
  mentions: v.optional(v.array(plannerMentionValidator)),
};
export const plannerCommentValidator = v.object({
  ...plannerCommentFields, _id: v.id("plannerComments"), _creationTime: v.number(),
});
export const plannerNotificationValidator = v.object({
  _id: v.id("plannerNotifications"), _creationTime: v.number(), read: v.boolean(),
  itemId: v.id("plannerItems"), commentId: v.id("plannerComments"), title: v.string(),
  author: plannerPersonValidator, text: v.string(), mentions: v.array(plannerMentionValidator),
});
export type PlannerNotification = Infer<typeof plannerNotificationValidator>;
export const plannerFields = {
  ...activityFields,
  societyId: v.id("societies"),
  stage: itemStage,
  notes: v.string(),
  owner: v.string(),
  tasks: v.array(taskValidator),
  revision: v.number(),
  updatedAt: v.number(),
  published: v.optional(activityValidator),
  publishedAt: v.optional(v.number()),
  createdBy: v.optional(plannerPersonValidator),
  contributors: v.optional(v.array(plannerPersonValidator)),
  commentCount: v.optional(v.number()),
};
export const plannerItemValidator = v.object({
  ...plannerFields, _id: v.id("plannerItems"), _creationTime: v.number(),
});
export const publicActivityValidator = v.object({ id: v.id("plannerItems"), ...activityFields });
export const calendarItemValidator = v.object({
  _id: v.id("plannerItems"), stage: itemStage,
  title: v.string(), kind: activityFields.kind, category: v.string(),
  date: v.string(), startTime: v.string(), endTime: v.string(), location: v.string(),
});
export type PlannerCalendarItem = Infer<typeof calendarItemValidator>;

export function plannerToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function cleanActivity(input: Activity, publishing = false): Activity {
  const result = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value.trim()])) as Activity;
  const limits: Record<keyof Activity, number> = {
    title: 160, kind: 20, category: 60, description: 4000, date: 10,
    startTime: 5, endTime: 5, location: 200, registrationUrl: 1500,
  };
  for (const key of Object.keys(limits) as (keyof Activity)[]) {
    if (result[key].length > limits[key]) throw new Error(`${key} is too long`);
  }
  if (!result.title) throw new Error("Give this activity a title");
  if (result.date) {
    const parsed = new Date(`${result.date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result.date) {
      throw new Error("Choose a valid date");
    }
  }
  for (const time of [result.startTime, result.endTime]) {
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Choose a valid time");
  }
  if (result.startTime && result.endTime && result.endTime <= result.startTime) throw new Error("End time must be after start time");
  if (result.registrationUrl) {
    let url: URL;
    try { url = new URL(result.registrationUrl); } catch { throw new Error("Use a complete https:// registration link"); }
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use a secure https:// registration link");
  }
  if (publishing) {
    if (!result.description) throw new Error("Add a public description before publishing");
    if (result.kind !== "project" && (!result.date || !result.startTime || !result.location)) {
      throw new Error("Add a date, start time and location before publishing");
    }
    if (result.kind !== "project" && !result.registrationUrl) throw new Error("Add a booking link before publishing");
  }
  return result;
}

/** Explicit whitelist: committee notes and planning metadata never enter the public snapshot. */
export function publicFields(item: Activity): Activity {
  return {
    title: item.title, kind: item.kind, category: item.category, description: item.description,
    date: item.date, startTime: item.startTime, endTime: item.endTime,
    location: item.location, registrationUrl: item.registrationUrl,
  };
}
