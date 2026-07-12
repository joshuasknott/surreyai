import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireAuth,
  requireAdmin,
  requireExistingAdmin,
  canManageRole,
  isProtectedEmail,
  logAction,
  ensureUser,
  getUserByIdentity,
} from "./permissions";
import type { Role } from "./permissions";

export const listBySociety = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    try {
      await requireExistingAdmin(ctx, society._id);
    } catch {
      return [];
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_society_status", (q) =>
        q.eq("societyId", society._id).eq("status", "active")
      )
      .take(500);

    const result = [];
    for (const m of memberships) {
      const user = await ctx.db.get(m.userId);
      result.push({
        _id: m._id,
        role: m.role,
        status: m.status,
        user: user
          ? { _id: user._id, name: user.name, email: user.email }
          : null,
      });
    }
    return result;
  },
});

export const getMyMembership = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getUserByIdentity(ctx, identity);
    if (!user) return null;

    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_society", (q) =>
        q.eq("userId", user._id).eq("societyId", society._id)
      )
      .first();

    if (!membership || membership.status !== "active") return null;

    return {
      _id: membership._id,
      role: membership.role,
      societyId: society._id,
      societySlug: society.slug,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    };
  },
});

export const inviteUser = mutation({
  args: {
    societySlug: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, { societySlug, email, role }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user, membership } = await requireAdmin(ctx, society._id);

    const normalizedEmail = email.toLowerCase().trim();
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const invitationId = await ctx.db.insert("invitations", {
      email: normalizedEmail,
      societyId: society._id,
      role,
      invitedBy: membership._id,
      token,
      expiresAt,
      status: "pending",
    });

    await logAction(
      ctx,
      society._id,
      user._id,
      "invite_user",
      invitationId,
      "invitation",
      `Invited ${normalizedEmail} as ${role}`
    );

    return { invitationId, token };
  },
});

export const listInvitations = query({
  args: { societySlug: v.string() },
  handler: async (ctx, { societySlug }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) return [];

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await getUserByIdentity(ctx, identity);
    if (!user) return [];

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_society", (q) =>
        q.eq("userId", user._id).eq("societyId", society._id)
      )
      .first();
    if (!membership || membership.status !== "active") return [];

    try {
      await requireExistingAdmin(ctx, society._id);
    } catch {
      return [];
    }

    return await ctx.db
      .query("invitations")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .take(500);
  },
});

export const revokeInvitation = mutation({
  args: {
    societySlug: v.string(),
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, { societySlug, invitationId }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user } = await requireAdmin(ctx, society._id);

    const invitation = await ctx.db.get(invitationId);
    if (!invitation || invitation.societyId !== society._id) {
      throw new Error("Invitation not found");
    }

    await ctx.db.patch(invitationId, { status: "revoked" });
    await logAction(
      ctx,
      society._id,
      user._id,
      "revoke_invitation",
      invitationId,
      "invitation"
    );
    return true;
  },
});

export const acceptInvitation = mutation({
  args: { token: v.string(), societySlug: v.optional(v.string()) },
  handler: async (ctx, { token, societySlug }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!invitation) throw new Error("Invalid invitation token");

    const society = await ctx.db.get(invitation.societyId);
    if (!society || (societySlug && society.slug !== societySlug)) {
      throw new Error("Invalid invitation token");
    }

    if (invitation.status === "accepted") {
      throw new Error("Invitation has already been accepted");
    }
    if (invitation.status === "revoked") {
      throw new Error("Invitation has been revoked");
    }
    if (invitation.status === "expired") {
      throw new Error("Invitation has expired");
    }
    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    const authedEmail = identity.email?.toLowerCase().trim();
    if (!authedEmail || authedEmail !== invitation.email.toLowerCase()) {
      throw new Error(
        "The authenticated email does not match the invited email"
      );
    }

    const user = await ensureUser(ctx, identity);

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_society", (q) =>
        q.eq("userId", user._id).eq("societyId", invitation.societyId)
      )
      .first();

    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, {
        role: invitation.role,
        status: "active",
      });
    } else {
      await ctx.db.insert("memberships", {
        userId: user._id,
        societyId: invitation.societyId,
        role: invitation.role,
        status: "active",
      });
    }

    await ctx.db.patch(invitation._id, { status: "accepted" });

    await logAction(
      ctx,
      invitation.societyId,
      user._id,
      "accept_invitation",
      invitation._id,
      "invitation",
      `${user.email} accepted invitation as ${invitation.role}`
    );

    return { success: true, societyId: invitation.societyId, societySlug: society.slug };
  },
});

export const changeRole = mutation({
  args: {
    societySlug: v.string(),
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, { societySlug, targetUserId, newRole }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user, membership } = await requireAdmin(ctx, society._id);

    const targetMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_society", (q) =>
        q.eq("userId", targetUserId).eq("societyId", society._id)
      )
      .first();

    if (!targetMembership) throw new Error("Target user is not a member");
    if (!canManageRole(membership.role as Role, targetMembership.role as Role)) {
      throw new Error(
        "Insufficient permissions to change this user's role"
      );
    }
    if (targetMembership.role === "owner") {
      throw new Error("Cannot change the role of the owner");
    }
    const targetUser = await ctx.db.get(targetUserId);
    if (targetUser && isProtectedEmail(targetUser.email) && membership.role !== "owner") {
      throw new Error("Cannot change the role of a protected admin");
    }

    await ctx.db.patch(targetMembership._id, { role: newRole });

    const resolvedTargetUser = await ctx.db.get(targetUserId);
    await logAction(
      ctx,
      society._id,
      user._id,
      "change_role",
      targetMembership._id,
      "membership",
      `Changed ${resolvedTargetUser?.email} role from ${targetMembership.role} to ${newRole}`
    );

    return true;
  },
});

export const removeMember = mutation({
  args: {
    societySlug: v.string(),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { societySlug, targetUserId }) => {
    const society = await ctx.db
      .query("societies")
      .withIndex("by_slug", (q) => q.eq("slug", societySlug))
      .first();
    if (!society) throw new Error("Society not found");

    const { user, membership } = await requireAdmin(ctx, society._id);

    const targetMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_society", (q) =>
        q.eq("userId", targetUserId).eq("societyId", society._id)
      )
      .first();

    if (!targetMembership) throw new Error("Target user is not a member");
    if (!canManageRole(membership.role as Role, targetMembership.role as Role)) {
      throw new Error("Insufficient permissions to remove this user");
    }
    if (targetMembership.role === "owner") {
      throw new Error("Cannot remove the owner");
    }
    const targetUser = await ctx.db.get(targetUserId);
    if (targetUser && isProtectedEmail(targetUser.email) && membership.role !== "owner") {
      throw new Error("Cannot remove a protected admin");
    }

    await ctx.db.patch(targetMembership._id, { status: "disabled" });

    const resolvedTargetUser = await ctx.db.get(targetUserId);
    await logAction(
      ctx,
      society._id,
      user._id,
      "remove_member",
      targetMembership._id,
      "membership",
      `Removed ${resolvedTargetUser?.email}`
    );

    return true;
  },
});
