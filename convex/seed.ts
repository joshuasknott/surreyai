import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { OWNER_EMAIL, PROTECTED_ADMIN_EMAILS, requireAuth } from "./permissions";

type SocietySocials = NonNullable<Doc<"societies">["socials"]>;
type CanonicalSocietyData = {
  name: string;
  shortName: string;
  slug: string;
  domain: string;
  establishedYear: number;
  logo: string;
  contactEmail: string;
  socials: {
    instagram: string;
    linkedin?: string;
    email: string;
  };
  membershipUrl: string;
  studentsUnionUrl: string;
};

type CanonicalMetadataPatch = {
  contactEmail?: string;
  membershipUrl?: string;
  studentsUnionUrl?: string;
  establishedYear?: number;
  socials?: SocietySocials;
};

const canonicalSocietyData: CanonicalSocietyData[] = [
  {
    name: "Surrey Artificial Intelligence Society",
    shortName: "AI Society",
    slug: "ai",
    domain: "surreyaisociety.org",
    establishedYear: 2025,
    logo: "/logos/optimized/ai-logo.optimized.png",
    contactEmail: PROTECTED_ADMIN_EMAILS.ai,
    socials: {
      instagram: "https://www.instagram.com/surrey.ai.ds/",
      email: PROTECTED_ADMIN_EMAILS.ai,
    },
    membershipUrl:
      "https://surreyunion.org/shop/ai-and-data-science-society/293e762b-01b8-46f4-a541-2260e4d9ec4f",
    studentsUnionUrl:
      "https://surreyunion.org/your-activity/clubs-and-societies-a-z/ai-and-data-science-society",
  },
  {
    name: "Surrey Business Society",
    shortName: "Business Society",
    slug: "business",
    domain: "surreybusinesssociety.org",
    establishedYear: 2021,
    logo: "/logos/sbs-logo.png",
    contactEmail: PROTECTED_ADMIN_EMAILS.business,
    socials: {
      instagram: "https://www.instagram.com/surreybusinesssociety",
      linkedin: "https://www.linkedin.com/company/surreybusinesssociety/",
      email: PROTECTED_ADMIN_EMAILS.business,
    },
    membershipUrl:
      "https://surreyunion.org/shop/business-society/5c580cdd-8641-44e0-acd6-69d9545eacdb",
    studentsUnionUrl:
      "https://surreyunion.org/your-activity/clubs-and-societies-a-z/business-society",
  },
  {
    name: "Surrey Neurotech Society",
    shortName: "Neurotech Society",
    slug: "neurotech",
    domain: "surreyneurotechsociety.org",
    establishedYear: 2024,
    logo: "/logos/neurotech-logo.png",
    contactEmail: PROTECTED_ADMIN_EMAILS.neurotech,
    socials: {
      instagram: "https://www.instagram.com/surreyneurotech/",
      linkedin:
        "https://www.linkedin.com/company/surrey-neurotech/posts/?feedView=all",
      email: PROTECTED_ADMIN_EMAILS.neurotech,
    },
    membershipUrl:
      "https://surreyunion.org/shop/neurotech-society/d5784e49-49f7-4bd4-a66c-b4f3971103af",
    studentsUnionUrl:
      "https://surreyunion.org/your-activity/clubs-and-societies-a-z/neurotech-society",
  },
];

export const seedSocieties = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("societies").collect();
    if (existing.length > 0) {
      return "Societies already seeded; run syncCanonicalSocietyMetadata as an authenticated owner to update metadata";
    }

    for (const data of canonicalSocietyData) {
      const societyId = await ctx.db.insert("societies", data);
      const email =
        PROTECTED_ADMIN_EMAILS[
          data.slug as keyof typeof PROTECTED_ADMIN_EMAILS
        ];

      let user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (!user) {
        const userId = await ctx.db.insert("users", {
          email,
          name: `${data.shortName} Admin`,
        });
        user = await ctx.db.get(userId);
      }

      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_user_society", (q) =>
          q.eq("userId", user!._id).eq("societyId", societyId)
        )
        .first();

      if (!existingMembership) {
        await ctx.db.insert("memberships", {
          userId: user!._id,
          societyId,
          role: "protectedAdmin",
          status: "active",
        });
      }
    }

    return "Societies seeded successfully";
  },
});

async function requireMetadataSyncOwner(
  ctx: MutationCtx
): Promise<Doc<"users">> {
  const user = await requireAuth(ctx);
  if (user.email.toLowerCase() === OWNER_EMAIL) return user;

  const memberships = ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id));

  for await (const membership of memberships) {
    if (membership.status === "active" && membership.role === "owner") {
      return user;
    }
  }

  throw new Error("Owner permissions required to sync canonical metadata");
}

function buildCanonicalMetadataPatch(
  society: Doc<"societies">,
  data: CanonicalSocietyData
): CanonicalMetadataPatch {
  const updates: CanonicalMetadataPatch = {};

  if (society.contactEmail !== data.contactEmail) {
    updates.contactEmail = data.contactEmail;
  }
  if (society.membershipUrl !== data.membershipUrl) {
    updates.membershipUrl = data.membershipUrl;
  }
  if (society.studentsUnionUrl !== data.studentsUnionUrl) {
    updates.studentsUnionUrl = data.studentsUnionUrl;
  }
  if (society.establishedYear !== data.establishedYear) {
    updates.establishedYear = data.establishedYear;
  }

  const mergedSocials: SocietySocials = { ...(society.socials ?? {}) };
  let socialsChanged = false;

  const canonicalSocials: Partial<SocietySocials> = {
    email: data.socials.email,
    instagram: data.socials.instagram,
  };
  if (data.socials.linkedin) {
    canonicalSocials.linkedin = data.socials.linkedin;
  }

  for (const [key, value] of Object.entries(canonicalSocials) as [
    keyof SocietySocials,
    string,
  ][]) {
    if (mergedSocials[key] !== value) {
      mergedSocials[key] = value;
      socialsChanged = true;
    }
  }

  if (socialsChanged) {
    updates.socials = mergedSocials;
  }

  return updates;
}

export const syncCanonicalSocietyMetadata = mutation({
  args: {},
  handler: async (ctx) => {
    await requireMetadataSyncOwner(ctx);

    let changed = 0;
    let missing = 0;
    let unchanged = 0;

    for (const data of canonicalSocietyData) {
      const society = await ctx.db
        .query("societies")
        .withIndex("by_slug", (q) => q.eq("slug", data.slug))
        .first();

      if (!society) {
        missing++;
        continue;
      }

      const updates = buildCanonicalMetadataPatch(society, data);
      if (Object.keys(updates).length === 0) {
        unchanged++;
        continue;
      }

      await ctx.db.patch(society._id, updates);
      changed++;
    }

    return `Canonical society metadata synced (${changed} updated, ${unchanged} unchanged, ${missing} missing)`;
  },
});

export const seedOwnerMemberships = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { email, name }) => {
    const ownerEmail = (email || OWNER_EMAIL).toLowerCase().trim();

    let owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", ownerEmail))
      .first();

    if (!owner) {
      const ownerId = await ctx.db.insert("users", {
        email: ownerEmail,
        name: name || "Josh Knott",
      });
      owner = await ctx.db.get(ownerId);
    }

    const societies = await ctx.db.query("societies").collect();
    let changed = 0;

    for (const society of societies) {
      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_user_society", (q) =>
          q.eq("userId", owner!._id).eq("societyId", society._id)
        )
        .first();

      if (existingMembership) {
        if (
          existingMembership.role !== "owner" ||
          existingMembership.status !== "active"
        ) {
          await ctx.db.patch(existingMembership._id, {
            role: "owner",
            status: "active",
          });
          changed++;
        }
      } else {
        await ctx.db.insert("memberships", {
          userId: owner!._id,
          societyId: society._id,
          role: "owner",
          status: "active",
        });
        changed++;
      }
    }

    return `Owner seeded across ${societies.length} societies (${changed} memberships changed)`;
  },
});
