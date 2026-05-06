import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  societies: defineTable({
    name: v.string(),
    shortName: v.string(),
    slug: v.string(),
    domain: v.string(),
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
    email: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    displayOrder: v.number(),
    isActive: v.boolean(),
  })
    .index("by_society", ["societyId"])
    .index("by_society_active", ["societyId", "isActive"]),

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
  })
    .index("by_society", ["societyId"]),
});
