export interface Society {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  adminBasePath: string;
  publicBasePath: string;
  domain: string;
  establishedYear?: number;
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

export interface AuthenticatedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

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

export interface CreatePastCommitteeMemberInput {
  name: string;
  role: string;
  yearLabel: string;
  bio?: string;
  image?: string;
  email?: string;
  linkedIn?: string;
  displayOrder?: number;
}

export interface UpdatePastCommitteeMemberInput extends Partial<CreatePastCommitteeMemberInput> {}

export interface InviteAdminInput {
  email: string;
  role: 'admin' | 'member';
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

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
