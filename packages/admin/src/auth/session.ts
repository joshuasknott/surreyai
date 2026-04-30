import { getDb } from '../db/connection.js';
import { verifyPassword } from './passwords.js';
import { v4 as uuidv4 } from 'uuid';
import type { AdminUser, SafeAdminUser } from '../types.js';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const SESSION_COOKIE_NAME = 'admin_session';

/**
 * Attempt to log in with email and password.
 * Returns a session token on success, null on failure.
 */
export async function login(email: string, password: string): Promise<{ sessionId: string; user: SafeAdminUser } | null> {
  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE email = ? AND status = ?').get(email.toLowerCase().trim(), 'active') as AdminUser | undefined;

  if (!user) return null;
  if (!user.passwordHash && !(user as any).password_hash) return null;

  const hash = user.passwordHash || (user as any).password_hash;
  const valid = await verifyPassword(password, hash);
  if (!valid) return null;

  // Create session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt);

  return {
    sessionId,
    user: toSafeUser(user),
  };
}

/**
 * Validate a session token and return the user if valid.
 */
export function getSession(sessionId: string): SafeAdminUser | null {
  if (!sessionId) return null;

  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, u.id as uid, u.name, u.email, u.role, u.society_id, u.status
    FROM sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now') AND u.status = 'active'
  `).get(sessionId) as any;

  if (!session) return null;

  return {
    id: session.uid,
    name: session.name,
    email: session.email,
    role: session.role,
    societyId: session.society_id,
    status: session.status,
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * Destroy a session (logout).
 */
export function logout(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

/**
 * Check if a user can access a specific society's admin.
 */
export function canAccessSociety(user: SafeAdminUser, societyId: string): boolean {
  if (user.role === 'owner') return true;
  return user.societyId === societyId;
}

/**
 * Check if a user can manage admins (invite/remove).
 */
export function canManageAdmins(user: SafeAdminUser): boolean {
  return user.role === 'owner' || user.role === 'societyAdmin';
}

/**
 * Check if a user can edit content (events, committee).
 */
export function canEditContent(user: SafeAdminUser): boolean {
  return user.role === 'owner' || user.role === 'societyAdmin' || user.role === 'editor';
}

function toSafeUser(user: any): SafeAdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    societyId: user.society_id || user.societyId,
    status: user.status,
    createdAt: user.created_at || user.createdAt || '',
    updatedAt: user.updated_at || user.updatedAt || '',
  };
}

/**
 * Clean up expired sessions.
 */
export function cleanupSessions(): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}
