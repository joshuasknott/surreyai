import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

export type Role = "owner" | "protectedAdmin" | "admin" | "member";

export const OWNER_EMAIL = "joshhknott@gmail.com";

export const PROTECTED_ADMIN_EMAILS: Record<string, string> = {
  ai: "ussu.aianddatascience@surrey.ac.uk",
  business: "ussu.bizsoc@surrey.ac.uk",
  neurotech: "ussu.neurotechsoc@surrey.ac.uk",
};

export function isProtectedEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase();
  return (
    normalizedEmail === OWNER_EMAIL ||
    Object.values(PROTECTED_ADMIN_EMAILS).includes(normalizedEmail)
  );
}

export function canManageUsers(role: Role): boolean {
  return role === "owner" || role === "protectedAdmin" || role === "admin";
}

export function canEditContent(role: Role): boolean {
  return (
    role === "owner" ||
    role === "protectedAdmin" ||
    role === "admin" ||
    role === "member"
  );
}

export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "owner") return targetRole !== "owner";
  if (actorRole !== "protectedAdmin" && actorRole !== "admin") return false;
  if (targetRole === "owner" || targetRole === "protectedAdmin") return false;
  return true;
}

export async function getAuthedIdentity(
  ctx: QueryCtx | MutationCtx
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return identity;
}

export async function requireAuthedIdentity(
  ctx: QueryCtx | MutationCtx
) {
  const identity = await getAuthedIdentity(ctx);
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

type AuthIdentity = {
  tokenIdentifier?: string;
  subject: string;
  email?: string;
  name?: string;
};

function getAuthKey(identity: AuthIdentity): string {
  return identity.tokenIdentifier || identity.subject;
}

export async function getUserByIdentity(
  ctx: QueryCtx | MutationCtx,
  identity: AuthIdentity
): Promise<Doc<"users"> | null> {
  const authKey = getAuthKey(identity);

  const byTokenIdentifier = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", authKey))
    .first();
  if (byTokenIdentifier) return byTokenIdentifier;

  if (identity.subject !== authKey) {
    const bySubject = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (bySubject) return bySubject;
  }

  if (identity.email) {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!.toLowerCase()))
      .first();
  }

  return null;
}

export async function ensureUser(
  ctx: MutationCtx,
  identity: AuthIdentity
): Promise<Doc<"users">> {
  const authKey = getAuthKey(identity);

  const byTokenIdentifier = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", authKey))
    .first();
  if (byTokenIdentifier) return byTokenIdentifier;

  if (identity.subject !== authKey) {
    const bySubject = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (bySubject) {
      await ctx.db.patch(bySubject._id, { clerkId: authKey });
      return { ...bySubject, clerkId: authKey };
    }
  }

  if (identity.email) {
    const byEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!.toLowerCase()))
      .first();
    if (byEmail) {
      await ctx.db.patch(byEmail._id, { clerkId: authKey });
      return { ...byEmail, clerkId: authKey };
    }
  }

  const userId = await ctx.db.insert("users", {
    email: (identity.email || authKey).toLowerCase(),
    name: identity.name || identity.email || "Unknown",
    clerkId: authKey,
  });
  const user = await ctx.db.get(userId);
  return user!;
}

export async function requireAuth(
  ctx: MutationCtx
): Promise<Doc<"users">> {
  const identity = await requireAuthedIdentity(ctx);
  return ensureUser(ctx, identity);
}

export async function requireExistingAuth(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await requireAuthedIdentity(ctx);
  const user = await getUserByIdentity(ctx, identity);
  if (!user) throw new Error("Authenticated user is not provisioned");
  return user;
}

export async function getMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  societyId: Id<"societies">
): Promise<Doc<"memberships"> | null> {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user_society", (q) =>
      q.eq("userId", userId).eq("societyId", societyId)
    )
    .collect();
  return memberships.find((m) => m.status === "active") || null;
}

export async function requireMembership(
  ctx: MutationCtx,
  societyId: Id<"societies">
): Promise<{ user: Doc<"users">; membership: Doc<"memberships"> }> {
  const user = await requireAuth(ctx);
  const membership = await getMembership(ctx, user._id, societyId);
  if (!membership) throw new Error("Not a member of this society");
  if (membership.status !== "active")
    throw new Error("Membership is not active");
  return { user, membership };
}

export async function requireExistingMembership(
  ctx: QueryCtx | MutationCtx,
  societyId: Id<"societies">
): Promise<{ user: Doc<"users">; membership: Doc<"memberships"> }> {
  const user = await requireExistingAuth(ctx);
  const membership = await getMembership(ctx, user._id, societyId);
  if (!membership) throw new Error("Not a member of this society");
  if (membership.status !== "active")
    throw new Error("Membership is not active");
  return { user, membership };
}

export async function requireContentEditor(
  ctx: MutationCtx,
  societyId: Id<"societies">
): Promise<{ user: Doc<"users">; membership: Doc<"memberships"> }> {
  const result = await requireMembership(ctx, societyId);
  if (!canEditContent(result.membership.role)) {
    throw new Error("Insufficient permissions to edit content");
  }
  return result;
}

export async function requireAdmin(
  ctx: MutationCtx,
  societyId: Id<"societies">
): Promise<{ user: Doc<"users">; membership: Doc<"memberships"> }> {
  const result = await requireMembership(ctx, societyId);
  if (!canManageUsers(result.membership.role)) {
    throw new Error("Admin permissions required");
  }
  return result;
}

export async function requireExistingAdmin(
  ctx: QueryCtx | MutationCtx,
  societyId: Id<"societies">
): Promise<{ user: Doc<"users">; membership: Doc<"memberships"> }> {
  const result = await requireExistingMembership(ctx, societyId);
  if (!canManageUsers(result.membership.role)) {
    throw new Error("Admin permissions required");
  }
  return result;
}

export async function logAction(
  ctx: MutationCtx,
  societyId: Id<"societies">,
  userId: Id<"users">,
  action: string,
  targetId?: string,
  targetType?: string,
  details?: string
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    societyId,
    userId,
    action,
    targetId,
    targetType,
    details,
  });
}
