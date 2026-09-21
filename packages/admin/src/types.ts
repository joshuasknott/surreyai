export interface Society {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  domain: string;
  establishedYear?: number;
  logo: string;
  contactEmail: string;
  socials: SocietySocials;
  membershipUrl: string;
  studentsUnionUrl: string;
  signatories: Array<{ name: string; role: 'President' | 'Vice President' | 'Treasurer' }>;
}

export interface SocietySocials {
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  twitter?: string;
  discord?: string;
  whatsapp?: string;
  linktree?: string;
  email?: string;
}
