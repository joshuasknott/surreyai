import { getDb } from '../db/connection.js';
import { hashPassword } from '../auth/passwords.js';
import { v4 as uuidv4 } from 'uuid';
import type { SafeAdminUser, AdminRole, Invitation, InviteAdminInput } from '../types.js';

function rowToSafeUser(row: any): SafeAdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    societyId: row.society_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToInvitation(row: any): Invitation {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    societyId: row.society_id,
    invitedBy: row.invited_by,
    token: row.token,
    expiresAt: row.expires_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAdmins(societyId: string): SafeAdminUser[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM admin_users WHERE society_id = ? OR role = 'owner' ORDER BY role ASC, name ASC").all(societyId);
  return rows.map(rowToSafeUser);
}

export function getAdminById(userId: string): SafeAdminUser | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(userId);
  return row ? rowToSafeUser(row) : null;
}

export function getInvitations(societyId: string): Invitation[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM invitations WHERE society_id = ? ORDER BY created_at DESC").all(societyId);
  return rows.map(rowToInvitation);
}

export function inviteAdmin(societyId: string, input: InviteAdminInput, invitedBy: string): Invitation {
  const db = getDb();
  const id = uuidv4();
  const token = uuidv4();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare(`
    INSERT INTO invitations (id, email, role, society_id, invited_by, token, expires_at, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, input.email.toLowerCase().trim(), input.role, societyId, invitedBy, token, expiresAt, now, now);

  return db.prepare('SELECT * FROM invitations WHERE id = ?').get(id) as any as Invitation;
}

export function revokeInvitation(societyId: string, invitationId: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare("UPDATE invitations SET status = 'revoked', updated_at = ? WHERE id = ? AND society_id = ? AND status = 'pending'").run(now, invitationId, societyId);
  return result.changes > 0;
}

export async function acceptInvitation(token: string, name: string, password: string): Promise<SafeAdminUser | null> {
  const db = getDb();
  const invitation = db.prepare("SELECT * FROM invitations WHERE token = ? AND status = 'pending' AND expires_at > datetime('now')").get(token) as any;

  if (!invitation) return null;

  // Check if user already exists
  const existing = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(invitation.email) as any;
  if (existing) {
    // Update existing user
    const now = new Date().toISOString();
    db.prepare("UPDATE admin_users SET role = ?, society_id = ?, status = 'active', updated_at = ? WHERE id = ?").run(invitation.role, invitation.society_id, now, existing.id);
    db.prepare("UPDATE invitations SET status = 'accepted', updated_at = ? WHERE id = ?").run(now, invitation.id);
    return rowToSafeUser({ ...existing, role: invitation.role, society_id: invitation.society_id, status: 'active' });
  }

  // Create new user
  const id = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  db.prepare(`
    INSERT INTO admin_users (id, name, email, password_hash, role, society_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(id, name, invitation.email, passwordHash, invitation.role, invitation.society_id, now, now);

  db.prepare("UPDATE invitations SET status = 'accepted', updated_at = ? WHERE id = ?").run(now, invitation.id);

  return getAdminById(id);
}

export function removeAdminAccess(societyId: string, userId: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  // Don't allow removing owners
  const user = db.prepare("SELECT * FROM admin_users WHERE id = ? AND role != 'owner'").get(userId) as any;
  if (!user) return false;
  if (user.society_id !== societyId && user.role !== 'owner') return false;

  const result = db.prepare("UPDATE admin_users SET status = 'disabled', updated_at = ? WHERE id = ? AND role != 'owner'").run(now, userId);
  return result.changes > 0;
}

export function getInvitationByToken(token: string): Invitation | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM invitations WHERE token = ? AND status = 'pending' AND expires_at > datetime('now')").get(token);
  return row ? rowToInvitation(row) : null;
}
