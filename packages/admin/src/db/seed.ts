import { getDb } from './connection.js';
import { runMigrations } from './schema.js';
import { hashPassword } from '../auth/passwords.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed the database with realistic placeholder data.
 * Only runs if the database is empty (no admin users exist).
 */
export async function seedDatabase(): Promise<void> {
  try {
    const db = getDb();

    // Run migrations first
    runMigrations();

    // Check if already seeded
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number };
    if (existingUsers.count > 0) {
      console.log(`[admin] Database already seeded (${existingUsers.count} users)`);
      return;
    }

    console.log('[admin] Seeding database...');

  // ─── Owner / Developer Admin ──────────────────────────────────────────────
  const ownerHash = await hashPassword('admin123');
  db.prepare(`
    INSERT INTO admin_users (id, name, email, password_hash, role, society_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), 'Josh (Owner)', 'admin@surreysocieties.org', ownerHash, 'owner', 'ai', 'active');

  // ─── Society Admins ────────────────────────────────────────────────────────
  const aiAdminHash = await hashPassword('aiadmin123');
  db.prepare(`
    INSERT INTO admin_users (id, name, email, password_hash, role, society_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), 'AI Admin', 'admin@surreyaisociety.org', aiAdminHash, 'societyAdmin', 'ai', 'active');

  const neuroAdminHash = await hashPassword('neuroadmin123');
  db.prepare(`
    INSERT INTO admin_users (id, name, email, password_hash, role, society_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), 'Neurotech Admin', 'admin@surreyneurotechsociety.org', neuroAdminHash, 'societyAdmin', 'neurotech', 'active');

  const bizAdminHash = await hashPassword('bizadmin123');
  db.prepare(`
    INSERT INTO admin_users (id, name, email, password_hash, role, society_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), 'Business Admin', 'admin@surreybusinesssociety.org', bizAdminHash, 'societyAdmin', 'business', 'active');

  // ─── AI Society Events ─────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const aiEvents = [
    {
      title: 'Intro to AI at Surrey',
      description: 'Our opening event for the year. What is AI? Why does it matter? What will we be doing? Open to all students — no experience needed.',
      date: '2026-10-15',
      startTime: '18:00',
      endTime: '20:00',
      location: 'LT1, University of Surrey',
      category: 'Talk',
      status: 'published',
      isFeatured: true,
    },
    {
      title: 'Practical AI Build Night',
      description: 'A hands-on evening where you build something with AI tools. Bring a laptop, we provide the guidance. Beginners welcome.',
      date: '2026-10-29',
      startTime: '18:30',
      endTime: '21:00',
      location: 'Computing Lab 2, AP Building',
      category: 'Workshop',
      status: 'published',
      isFeatured: false,
    },
    {
      title: 'Responsible AI Discussion',
      description: 'An open discussion on the ethics and societal implications of AI. What should we be thinking about as the next generation of technologists?',
      date: '2026-11-12',
      startTime: '17:00',
      endTime: '19:00',
      location: 'Seminar Room 3, Library',
      category: 'Panel',
      status: 'draft',
      isFeatured: false,
    },
  ];

  for (const event of aiEvents) {
    db.prepare(`
      INSERT INTO events (id, society_id, title, description, date, start_time, end_time, location, category, status, is_featured, created_at, updated_at)
      VALUES (?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), event.title, event.description, event.date, event.startTime, event.endTime, event.location, event.category, event.status, event.isFeatured ? 1 : 0, now, now);
  }

  // ─── Neurotech Society Events ──────────────────────────────────────────────
  const neuroEvents = [
    {
      title: 'Intro to Neurotech',
      description: 'What is neurotechnology? An accessible overview for students from any background — covering the key concepts, applications, and why it matters.',
      date: '2026-10-18',
      startTime: '18:00',
      endTime: '19:30',
      location: 'LT3, University of Surrey',
      category: 'Talk',
      status: 'published',
      isFeatured: true,
    },
    {
      title: 'Brain-Computer Interfaces 101',
      description: 'A beginner-friendly introduction to BCIs — how they work, current applications, and the challenges of connecting brains to machines.',
      date: '2026-11-01',
      startTime: '17:00',
      endTime: '19:00',
      location: 'Computing Lab 1, AP Building',
      category: 'Workshop',
      status: 'published',
      isFeatured: false,
    },
    {
      title: 'Research Reading Group',
      description: 'A regular session where we pick a recent paper in neuroscience or neurotechnology and discuss it together. No expertise required — just curiosity.',
      date: '2026-11-08',
      startTime: '16:00',
      endTime: '17:30',
      location: 'Seminar Room 5, Library',
      category: 'Reading Group',
      status: 'draft',
      isFeatured: false,
    },
  ];

  for (const event of neuroEvents) {
    db.prepare(`
      INSERT INTO events (id, society_id, title, description, date, start_time, end_time, location, category, status, is_featured, created_at, updated_at)
      VALUES (?, 'neurotech', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), event.title, event.description, event.date, event.startTime, event.endTime, event.location, event.category, event.status, event.isFeatured ? 1 : 0, now, now);
  }

  // ─── Business Society Events ───────────────────────────────────────────────
  const bizEvents = [
    {
      title: 'Careers Evening',
      description: 'An evening exploring graduate careers and internship opportunities across industries. Hear from professionals, ask questions, and make connections.',
      date: '2026-10-22',
      startTime: '18:00',
      endTime: '20:30',
      location: 'Lecture Theatre A, Surrey Business School',
      category: 'Careers',
      status: 'published',
      isFeatured: true,
    },
    {
      title: 'Founder Talk',
      description: 'Hear from a founder about building a business — the reality, the challenges, and the lessons. Followed by audience Q&A.',
      date: '2026-11-05',
      startTime: '18:30',
      endTime: '20:00',
      location: 'Seminar Room 1, Surrey Business School',
      category: 'Talk',
      status: 'published',
      isFeatured: false,
    },
    {
      title: 'Networking Social',
      description: 'A relaxed social event designed to help you meet other ambitious students. No formal dress code, just good conversation.',
      date: '2026-11-19',
      startTime: '19:00',
      endTime: '22:00',
      location: 'Rubix Bar, Students Union',
      category: 'Networking',
      status: 'draft',
      isFeatured: false,
    },
  ];

  for (const event of bizEvents) {
    db.prepare(`
      INSERT INTO events (id, society_id, title, description, date, start_time, end_time, location, category, status, is_featured, created_at, updated_at)
      VALUES (?, 'business', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), event.title, event.description, event.date, event.startTime, event.endTime, event.location, event.category, event.status, event.isFeatured ? 1 : 0, now, now);
  }

  // ─── AI Committee Members ──────────────────────────────────────────────────
  const aiCommittee = [
    { name: 'Committee Member', role: 'President', displayOrder: 1 },
    { name: 'Committee Member', role: 'Vice President', displayOrder: 2 },
    { name: 'Committee Member', role: 'Treasurer', displayOrder: 3 },
    { name: 'Committee Member', role: 'Events Lead', displayOrder: 4 },
    { name: 'Committee Member', role: 'Technical Workshops Lead', displayOrder: 5 },
    { name: 'Committee Member', role: 'Marketing & Communications Lead', displayOrder: 6 },
    { name: 'Committee Member', role: 'Partnerships & Sponsorships Lead', displayOrder: 7 },
    { name: 'Committee Member', role: 'AI Policy & Ethics Lead', displayOrder: 8 },
  ];

  for (const member of aiCommittee) {
    db.prepare(`
      INSERT INTO committee_members (id, society_id, name, role, display_order, is_active, created_at, updated_at)
      VALUES (?, 'ai', ?, ?, ?, 1, ?, ?)
    `).run(uuidv4(), member.name, member.role, member.displayOrder, now, now);
  }

  // ─── Neurotech Committee Members ───────────────────────────────────────────
  const neuroCommittee = [
    { name: 'Committee Member', role: 'President', displayOrder: 1 },
    { name: 'Committee Member', role: 'Vice President', displayOrder: 2 },
    { name: 'Committee Member', role: 'Treasurer', displayOrder: 3 },
    { name: 'Committee Member', role: 'Academic & Research Lead', displayOrder: 4 },
    { name: 'Committee Member', role: 'Events Lead', displayOrder: 5 },
    { name: 'Committee Member', role: 'Partnerships Lead', displayOrder: 6 },
    { name: 'Committee Member', role: 'Marketing & Communications Lead', displayOrder: 7 },
  ];

  for (const member of neuroCommittee) {
    db.prepare(`
      INSERT INTO committee_members (id, society_id, name, role, display_order, is_active, created_at, updated_at)
      VALUES (?, 'neurotech', ?, ?, ?, 1, ?, ?)
    `).run(uuidv4(), member.name, member.role, member.displayOrder, now, now);
  }

  // ─── Business Committee Members ────────────────────────────────────────────
  const bizCommittee = [
    { name: 'Committee Member', role: 'President', displayOrder: 1 },
    { name: 'Committee Member', role: 'Vice President', displayOrder: 2 },
    { name: 'Committee Member', role: 'Treasurer', displayOrder: 3 },
    { name: 'Committee Member', role: 'Professional Events Lead', displayOrder: 4 },
    { name: 'Committee Member', role: 'Social Events Lead', displayOrder: 5 },
    { name: 'Committee Member', role: 'Marketing & Communications Lead', displayOrder: 6 },
    { name: 'Committee Member', role: 'Sponsorships & Partnerships Lead', displayOrder: 7 },
    { name: 'Committee Member', role: 'Finance & Operations Officer', displayOrder: 8 },
  ];

  for (const member of bizCommittee) {
    db.prepare(`
      INSERT INTO committee_members (id, society_id, name, role, display_order, is_active, created_at, updated_at)
      VALUES (?, 'business', ?, ?, ?, 1, ?, ?)
    `).run(uuidv4(), member.name, member.role, member.displayOrder, now, now);
  }

    console.log('[admin] Database seeded successfully');
  } catch (error) {
    console.error('[admin] Failed to seed database:', error);
  }
}
