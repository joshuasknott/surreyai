import { getDb } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';
import type { Event, CreateEventInput, UpdateEventInput } from '../types.js';

function rowToEvent(row: any): Event {
  return {
    id: row.id,
    societyId: row.society_id,
    title: row.title,
    description: row.description,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    category: row.category,
    image: row.image,
    registrationUrl: row.registration_url,
    status: row.status,
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getEvents(societyId: string): Event[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM events WHERE society_id = ? ORDER BY date DESC, created_at DESC').all(societyId);
  return rows.map(rowToEvent);
}

export function getPublishedEvents(societyId: string): Event[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM events WHERE society_id = ? AND status = 'published' ORDER BY date ASC").all(societyId);
  return rows.map(rowToEvent);
}

export function getFeaturedEvents(societyId: string): Event[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM events WHERE society_id = ? AND status = 'published' AND is_featured = 1 ORDER BY date ASC").all(societyId);
  return rows.map(rowToEvent);
}

export function getEventById(societyId: string, eventId: string): Event | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM events WHERE id = ? AND society_id = ?').get(eventId, societyId);
  return row ? rowToEvent(row) : null;
}

export function createEvent(societyId: string, input: CreateEventInput): Event {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO events (id, society_id, title, description, date, start_time, end_time, location, category, image, registration_url, status, is_featured, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, societyId,
    input.title,
    input.description || '',
    input.date || '',
    input.startTime || '',
    input.endTime || '',
    input.location || '',
    input.category || 'Other',
    input.image || '',
    input.registrationUrl || '',
    input.status || 'draft',
    input.isFeatured ? 1 : 0,
    now, now
  );

  return getEventById(societyId, id)!;
}

export function updateEvent(societyId: string, eventId: string, input: UpdateEventInput): Event | null {
  const existing = getEventById(societyId, eventId);
  if (!existing) return null;

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE events SET
      title = ?, description = ?, date = ?, start_time = ?, end_time = ?,
      location = ?, category = ?, image = ?, registration_url = ?,
      status = ?, is_featured = ?, updated_at = ?
    WHERE id = ? AND society_id = ?
  `).run(
    input.title ?? existing.title,
    input.description ?? existing.description,
    input.date ?? existing.date,
    input.startTime ?? existing.startTime,
    input.endTime ?? existing.endTime,
    input.location ?? existing.location,
    input.category ?? existing.category,
    input.image ?? existing.image,
    input.registrationUrl ?? existing.registrationUrl,
    input.status ?? existing.status,
    (input.isFeatured ?? existing.isFeatured) ? 1 : 0,
    now,
    eventId, societyId
  );

  return getEventById(societyId, eventId);
}

export function deleteEvent(societyId: string, eventId: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM events WHERE id = ? AND society_id = ?').run(eventId, societyId);
  return result.changes > 0;
}
