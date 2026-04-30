// ─── Data Models ─────────────────────────────────────────────────────────────

export interface Society {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  adminBasePath: string;
  publicBasePath: string;
  domain: string;
  logo: string;
  contactEmail: string;
  socials: SocietySocials;
  membershipUrl: string;
  studentsUnionUrl: string;
}

export interface SocietySocials {
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  twitter?: string;
  discord?: string;
  whatsapp?: string;
  email?: string;
}

export interface Event {
  id: string;
  societyId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
  image: string;
  registrationUrl: string;
  status: 'draft' | 'published';
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeMember {
  id: string;
  societyId: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  email: string;
  linkedIn: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminRole = 'owner' | 'societyAdmin' | 'editor';
export type AdminStatus = 'invited' | 'active' | 'disabled';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  societyId: string;
  status: AdminStatus;
  createdAt: string;
  updatedAt: string;
}

/** AdminUser without passwordHash, safe for client-side use */
export type SafeAdminUser = Omit<AdminUser, 'passwordHash'>;

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  email: string;
  role: AdminRole;
  societyId: string;
  invitedBy: string;
  token: string;
  expiresAt: string;
  status: InvitationStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateEventInput {
  title: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  category?: string;
  image?: string;
  registrationUrl?: string;
  status?: 'draft' | 'published';
  isFeatured?: boolean;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {}

export interface CreateCommitteeMemberInput {
  name: string;
  role: string;
  bio?: string;
  image?: string;
  email?: string;
  linkedIn?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCommitteeMemberInput extends Partial<CreateCommitteeMemberInput> {}

export interface InviteAdminInput {
  email: string;
  role: AdminRole;
}

// ─── Validation Result ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// ─── Event Categories ────────────────────────────────────────────────────────

export const EVENT_CATEGORIES = [
  'Workshop',
  'Talk',
  'Social',
  'Hackathon',
  'Careers',
  'Panel',
  'Reading Group',
  'Networking',
  'Other',
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];
