import type { Society } from './types.js';

export const SOCIETIES: Record<string, Society> = {
  ai: {
    id: 'ai',
    name: 'Surrey AI Society',
    shortName: 'AI Society',
    slug: 'ai',
    adminBasePath: '/admin',
    publicBasePath: '/',
    domain: 'surreyaisociety.org',
    logo: '/logos/ai-logo.png',
    contactEmail: '',
    socials: {
      instagram: '',
      linkedin: '',
      email: '',
    },
    membershipUrl: '',
    studentsUnionUrl: '',
  },
  neurotech: {
    id: 'neurotech',
    name: 'Surrey Neurotech Society',
    shortName: 'Neurotech Society',
    slug: 'neurotech',
    adminBasePath: '/admin',
    publicBasePath: '/',
    domain: 'surreyneurotechsociety.org',
    logo: '/logos/neurotech-logo.png',
    contactEmail: '',
    socials: {
      instagram: '',
      linkedin: '',
      email: '',
    },
    membershipUrl: '',
    studentsUnionUrl: '',
  },
  business: {
    id: 'business',
    name: 'Surrey Business Society',
    shortName: 'Business Society',
    slug: 'business',
    adminBasePath: '/admin',
    publicBasePath: '/',
    domain: 'surreybusinesssociety.org',
    logo: '/logos/sbs-logo.png',
    contactEmail: '',
    socials: {
      instagram: '',
      linkedin: '',
      email: '',
    },
    membershipUrl: '',
    studentsUnionUrl: '',
  },
};

export function getSocietyById(id: string): Society | undefined {
  return SOCIETIES[id];
}

export function getAllSocieties(): Society[] {
  return Object.values(SOCIETIES);
}
