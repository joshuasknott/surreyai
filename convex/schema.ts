import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { plannerFields, plannerCommentFields, plannerFileFields } from "./plannerModel";

export default defineSchema({
  plannerProfiles: defineTable({ societyId: v.id('societies'), userId: v.id('users'), email: v.string(), displayName: v.string(), rosterName: v.optional(v.string()) })
    .index('by_societyId_and_userId', ['societyId', 'userId'])
    .index('by_societyId_and_email', ['societyId', 'email'])
    .index('by_societyId', ['societyId']),
  plannerFiles: defineTable(plannerFileFields)
    .index('by_itemId', ['itemId'])
    .index('by_itemId_and_requestId', ['itemId', 'requestId']),
  plannerItems: defineTable(plannerFields)
    .index("by_societyId_and_updatedAt", ["societyId", "updatedAt"])
    .index("by_societyId_and_stage", ["societyId", "stage"])
    .index("by_societyId_and_date", ["societyId", "date"])
    .index("by_societyId_and_stage_and_kind_and_date", ["societyId", "stage", "kind", "date"]),

  plannerComments: defineTable(plannerCommentFields)
    .index("by_itemId", ["itemId"])
    .index("by_itemId_and_requestId", ["itemId", "requestId"]),

  plannerNotifications: defineTable({
    societyId: v.id("societies"), itemId: v.id("plannerItems"), commentId: v.id("plannerComments"),
    recipientEmail: v.string(), read: v.boolean(),
    emailDelivery: v.optional(v.object({
      status: v.union(v.literal('pending'), v.literal('sent'), v.literal('failed'), v.literal('skipped')),
      attempts: v.number(), nextAttemptAt: v.number(),
      payload: v.optional(v.object({ notificationId: v.string(), recipientEmail: v.string(), author: v.string(), title: v.string(), excerpt: v.string(), itemId: v.string(), commentId: v.string() })),
    })),
  })
    .index("by_societyId_and_recipientEmail", ["societyId", "recipientEmail"])
    .index("by_societyId_and_recipientEmail_and_read", ["societyId", "recipientEmail", "read"])
    .index("by_itemId", ["itemId"])
    .index("by_commentId", ["commentId"]),

  plannerNotificationState: defineTable({
    societyId: v.id("societies"), recipientEmail: v.string(), revision: v.number(),
  }).index("by_societyId_and_recipientEmail", ["societyId", "recipientEmail"]),

  plannerEmailPreferences: defineTable({ societyId: v.id('societies'), email: v.string(), enabled: v.boolean() })
    .index('by_societyId_and_email', ['societyId', 'email']),

  plannerAccess: defineTable({
    societyId: v.id("societies"),
    email: v.string(),
    active: v.boolean(),
  })
    .index("by_societyId_and_email", ["societyId", "email"])
    .index("by_societyId_and_active_and_email", ["societyId", "active", "email"])
    .index("by_societyId", ["societyId"]),

  plannerBoardLayouts: defineTable({
    societyId: v.id("societies"),
    order: v.array(v.union(v.literal("ideas"), v.literal("planning"), v.literal("ready"), v.literal("done"))),
    revision: v.number(),
  }).index("by_societyId", ["societyId"]),

  societies: defineTable({
    name: v.string(),
    shortName: v.string(),
    slug: v.string(),
    domain: v.string(),
    establishedYear: v.optional(v.number()),
    logo: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    socials: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        linkedin: v.optional(v.string()),
        tiktok: v.optional(v.string()),
        twitter: v.optional(v.string()),
        discord: v.optional(v.string()),
        whatsapp: v.optional(v.string()),
        email: v.optional(v.string()),
      })
    ),
    membershipUrl: v.optional(v.string()),
    studentsUnionUrl: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  memberships: defineTable({
    userId: v.id("users"),
    societyId: v.id("societies"),
    role: v.union(
      v.literal("owner"),
      v.literal("protectedAdmin"),
      v.literal("admin"),
      v.literal("member")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("disabled"),
      v.literal("invited")
    ),
  })
    .index("by_user", ["userId"])
    .index("by_society", ["societyId"])
    .index("by_user_society", ["userId", "societyId"])
    .index("by_society_status", ["societyId", "status"]),

  users: defineTable({
    email: v.string(),
    name: v.string(),
    clerkId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"]),

  invitations: defineTable({
    email: v.string(),
    societyId: v.id("societies"),
    role: v.union(
      v.literal("admin"),
      v.literal("member")
    ),
    invitedBy: v.id("memberships"),
    token: v.string(),
    expiresAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked")
    ),
  })
    .index("by_token", ["token"])
    .index("by_society", ["societyId"])
    .index("by_society_status", ["societyId", "status"])
    .index("by_email", ["email"]),

  events: defineTable({
    societyId: v.id("societies"),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    category: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    registrationUrl: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
    isFeatured: v.boolean(),
  })
    .index("by_society", ["societyId"])
    .index("by_society_status", ["societyId", "status"])
    .index("by_society_date", ["societyId", "date"]),

  committeeMembers: defineTable({
    societyId: v.id("societies"),
    name: v.string(),
    role: v.string(),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    email: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    displayOrder: v.number(),
    isActive: v.boolean(),
  })
    .index("by_society", ["societyId"])
    .index("by_society_active", ["societyId", "isActive"]),

  pastCommitteeMembers: defineTable({
    societyId: v.id("societies"),
    name: v.string(),
    role: v.string(),
    yearLabel: v.string(),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    email: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    displayOrder: v.number(),
  })
    .index("by_society", ["societyId"])
    .index("by_society_and_year_label", ["societyId", "yearLabel"]),

  siteSettings: defineTable({
    societyId: v.id("societies"),
    key: v.string(),
    value: v.string(),
  }).index("by_society_key", ["societyId", "key"]),

  auditLogs: defineTable({
    societyId: v.id("societies"),
    userId: v.id("users"),
    action: v.string(),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.string()),
    details: v.optional(v.string()),
    // Optional planner-only narration. Existing audit rows remain valid and
    // keep their original details field for backwards compatibility.
    plannerMessage: v.optional(v.string()),
  })
    .index("by_society", ["societyId"])
    .index("by_societyId_and_targetId", ["societyId", "targetId"]),

  agentBuilds: defineTable({
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
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  agentRateLimits: defineTable({
    scope: v.string(),
    key: v.string(),
    count: v.number(),
    resetAt: v.number(),
    updatedAt: v.number(),
  }).index("by_scope_and_key", ["scope", "key"]),
});
