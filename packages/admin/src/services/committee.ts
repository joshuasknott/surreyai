import { getDb } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';
import type { CommitteeMember, CreateCommitteeMemberInput, UpdateCommitteeMemberInput } from '../types.js';

function rowToMember(row: any): CommitteeMember {
  return {
    id: row.id,
    societyId: row.society_id,
    name: row.name,
    role: row.role,
    bio: row.bio,
    image: row.image,
    email: row.email,
    linkedIn: row.linkedin,
    displayOrder: row.display_order,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getCommittee(societyId: string): CommitteeMember[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM committee_members WHERE society_id = ? ORDER BY display_order ASC, name ASC').all(societyId);
  return rows.map(rowToMember);
}

export function getActiveCommittee(societyId: string): CommitteeMember[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM committee_members WHERE society_id = ? AND is_active = 1 ORDER BY display_order ASC, name ASC').all(societyId);
  return rows.map(rowToMember);
}

export function getCommitteeMemberById(societyId: string, memberId: string): CommitteeMember | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM committee_members WHERE id = ? AND society_id = ?').get(memberId, societyId);
  return row ? rowToMember(row) : null;
}

export function createCommitteeMember(societyId: string, input: CreateCommitteeMemberInput): CommitteeMember {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  // Get max display order
  const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM committee_members WHERE society_id = ?').get(societyId) as any;
  const displayOrder = input.displayOrder ?? ((maxOrder?.max_order || 0) + 1);

  db.prepare(`
    INSERT INTO committee_members (id, society_id, name, role, bio, image, email, linkedin, display_order, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, societyId,
    input.name,
    input.role,
    input.bio || '',
    input.image || '',
    input.email || '',
    input.linkedIn || '',
    displayOrder,
    (input.isActive ?? true) ? 1 : 0,
    now, now
  );

  return getCommitteeMemberById(societyId, id)!;
}

export function updateCommitteeMember(societyId: string, memberId: string, input: UpdateCommitteeMemberInput): CommitteeMember | null {
  const existing = getCommitteeMemberById(societyId, memberId);
  if (!existing) return null;

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE committee_members SET
      name = ?, role = ?, bio = ?, image = ?, email = ?, linkedin = ?,
      display_order = ?, is_active = ?, updated_at = ?
    WHERE id = ? AND society_id = ?
  `).run(
    input.name ?? existing.name,
    input.role ?? existing.role,
    input.bio ?? existing.bio,
    input.image ?? existing.image,
    input.email ?? existing.email,
    input.linkedIn ?? existing.linkedIn,
    input.displayOrder ?? existing.displayOrder,
    (input.isActive ?? existing.isActive) ? 1 : 0,
    now,
    memberId, societyId
  );

  return getCommitteeMemberById(societyId, memberId);
}

export function deleteCommitteeMember(societyId: string, memberId: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM committee_members WHERE id = ? AND society_id = ?').run(memberId, societyId);
  return result.changes > 0;
}
