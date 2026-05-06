import type { Society } from './types.js';

export const SOCIETIES: Record<string, Society> = {
  ai: {
    id: 'ai',
    name: 'Surrey Artificial Intelligence Society',
    shortName: 'AI Society',
    slug: 'ai',
    adminBasePath: '/admin',
    publicBasePath: '/',
    domain: 'surreyaisociety.org',
    logo: '/logos/optimized/ai-logo.optimized.png',
    contactEmail: 'ussu.aianddatascience@surrey.ac.uk',
    socials: {
      instagram: '',
      linkedin: '',
      email: 'ussu.aianddatascience@surrey.ac.uk',
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
    contactEmail: 'ussu.neurotechsoc@surrey.ac.uk',
    socials: {
      instagram: '',
      linkedin: '',
      email: 'ussu.neurotechsoc@surrey.ac.uk',
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
    contactEmail: 'ussu.bizsoc@surrey.ac.uk',
    socials: {
      instagram: '',
      linkedin: '',
      email: 'ussu.bizsoc@surrey.ac.uk',
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
