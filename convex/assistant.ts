import { query } from "./_generated/server";
import { v } from "convex/values";

export const getPublicContext = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();

    if (!society) return null;

    const events = await ctx.db
      .query("events")
      .withIndex("by_society_status", (q) =>
        q.eq("societyId", society._id).eq("status", "published")
      )
      .order("desc")
      .take(12);

    const committee = await ctx.db
      .query("committeeMembers")
      .withIndex("by_society_active", (q) =>
        q.eq("societyId", society._id).eq("isActive", true)
      )
      .take(30);

    committee.sort((a, b) => a.displayOrder - b.displayOrder);

    return {
      society: {
        name: society.name,
        shortName: society.shortName,
        slug: society.slug,
        domain: society.domain,
        establishedYear: society.establishedYear ?? null,
        contactEmail: society.contactEmail ?? null,
        membershipUrl: society.membershipUrl ?? null,
        studentsUnionUrl: society.studentsUnionUrl ?? null,
        socials: {
          instagram: society.socials?.instagram ?? null,
          linkedin: society.socials?.linkedin ?? null,
          email: society.socials?.email ?? null,
        },
      },
      events: events.map((event) => ({
        title: event.title,
        description: event.description || null,
        date: event.date || null,
        startTime: event.startTime || null,
        endTime: event.endTime || null,
        location: event.location || null,
        category: event.category || null,
        registrationUrl: event.registrationUrl || null,
        isFeatured: event.isFeatured,
      })),
      committee: committee.map((member) => ({
        name: member.name,
        role: member.role,
        bio: member.bio || null,
      })),
    };
  },
});
