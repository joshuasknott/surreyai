import type { Society } from './types.js';

export const SOCIETIES: Record<string, Society> = {
  ai: {
    id: 'ai',
    name: 'Surrey Artificial Intelligence Society',
    shortName: 'Surrey AI Society',
    slug: 'ai',
    adminBasePath: '/admin',
    publicBasePath: '/',
    domain: 'surreyaisociety.org',
    establishedYear: 2025,
    logo: '/logos/brand/surrey-ai-avatar-light.png',
    contactEmail: 'ussu.aianddatascience@surrey.ac.uk',
    socials: {
      instagram: 'https://www.instagram.com/surreyaisociety/',
      email: 'ussu.aianddatascience@surrey.ac.uk',
    },
    membershipUrl: 'https://surreyunion.org/shop/ai-and-data-science-society/293e762b-01b8-46f4-a541-2260e4d9ec4f',
    studentsUnionUrl: 'https://surreyunion.org/your-activity/clubs-and-societies-a-z/artificial-intelligence-society',
  },
  neurotech: {
    id: 'neurotech',
    name: 'Surrey Neurotech Society',
    shortName: 'Neurotech Society',
    slug: 'neurotech',
    adminBasePath: '/admin',
    publicBasePath: '/',
    domain: 'surreyneurotechsociety.org',
    establishedYear: 2024,
    logo: '/logos/brand/surrey-neurotech-logo.png',
    contactEmail: 'ussu.neurotechsoc@surrey.ac.uk',
    socials: {
      instagram: 'https://www.instagram.com/surreyneurotech/',
      linkedin: 'https://www.linkedin.com/company/surrey-neurotech/posts/?feedView=all',
      email: 'ussu.neurotechsoc@surrey.ac.uk',
    },
    membershipUrl: 'https://surreyunion.org/shop/neurotech-society/d5784e49-49f7-4bd4-a66c-b4f3971103af',
    studentsUnionUrl: 'https://surreyunion.org/your-activity/clubs-and-societies-a-z/neurotech-society',
  },
  business: {
    id: 'business',
    name: 'Surrey Business Society',
    shortName: 'Business Society',
    slug: 'business',
    adminBasePath: '/admin',
    publicBasePath: '/',
    domain: 'surreybusinesssociety.org',
    establishedYear: 2021,
    logo: '/logos/sbs-logo.png',
    contactEmail: 'ussu.bizsoc@surrey.ac.uk',
    socials: {
      instagram: 'https://www.instagram.com/surreybusinesssociety',
      linkedin: 'https://www.linkedin.com/company/surreybusinesssociety/',
      email: 'ussu.bizsoc@surrey.ac.uk',
    },
    membershipUrl: 'https://surreyunion.org/shop/business-society/5c580cdd-8641-44e0-acd6-69d9545eacdb',
    studentsUnionUrl: 'https://surreyunion.org/your-activity/clubs-and-societies-a-z/business-society',
  },
};

export function getSocietyById(id: string): Society | undefined {
  return SOCIETIES[id];
}

export function getAllSocieties(): Society[] {
  return Object.values(SOCIETIES);
}
