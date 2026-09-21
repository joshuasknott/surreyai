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
    logo: '/logos/society.png',
    contactEmail: 'ussu.aianddatascience@surrey.ac.uk',
    socials: {
      instagram: 'https://www.instagram.com/surreyaisociety/',
      linkedin: 'https://www.linkedin.com/company/surreyaisociety/',
      linktree: 'https://linktr.ee/surreyaisociety',
      discord: 'https://discord.com/invite/NcGrRGMdYR',
      whatsapp: 'https://chat.whatsapp.com/HUQ8KayHBwXJsFYaRFk9Ge',
      email: 'ussu.aianddatascience@surrey.ac.uk',
    },
    membershipUrl: 'https://surreyunion.org/shop/artificial-intelligence-society/9a8a30d9-b5e2-4d40-a864-8e688f5a306a',
    studentsUnionUrl: 'https://surreyunion.org/your-activity/clubs-and-societies-a-z/artificial-intelligence-society',
    signatories: [
      { name: 'Joshua Knott', role: 'President' },
      { name: 'Poppy Holmes', role: 'Vice President' },
      { name: 'Vinayak Manojkumar Vadhera', role: 'Treasurer' },
    ],
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
    logo: '/logos/society.png',
    contactEmail: 'ussu.neurotechsoc@surrey.ac.uk',
    socials: {
      instagram: 'https://www.instagram.com/surreyneurotech/',
      linkedin: 'https://www.linkedin.com/company/surrey-neurotech/',
      linktree: 'https://linktr.ee/surreyneurotechsociety',
      whatsapp: 'https://chat.whatsapp.com/K15uhzpUn1OIaywBjcehk9',
      email: 'ussu.neurotechsoc@surrey.ac.uk',
    },
    membershipUrl: 'https://surreyunion.org/shop/neurotech-society/dff8af2e-9be8-4415-ba54-6e492d3daca8',
    studentsUnionUrl: 'https://surreyunion.org/your-activity/clubs-and-societies-a-z/neurotech-society',
    signatories: [
      { name: 'Poppy Holmes', role: 'President' },
      { name: 'Joshua Knott', role: 'Vice President' },
      { name: 'Anna Zamojska', role: 'Treasurer' },
    ],
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
    logo: '/logos/society.png',
    contactEmail: 'ussu.bizsoc@surrey.ac.uk',
    socials: {
      instagram: 'https://www.instagram.com/surreybusinesssociety',
      linkedin: 'https://www.linkedin.com/company/surreybusinesssociety/',
      linktree: 'https://linktr.ee/surreybusinesssociety',
      tiktok: 'https://www.tiktok.com/@surreybusinesssociety',
      whatsapp: 'https://chat.whatsapp.com/IIk88Q5Y2Du65aC5wmkAPE',
      email: 'ussu.bizsoc@surrey.ac.uk',
    },
    membershipUrl: '',
    studentsUnionUrl: 'https://surreyunion.org/your-activity/clubs-and-societies-a-z/business-society',
    signatories: [
      { name: 'Meerab Zahoor', role: 'President' },
      { name: 'Anjika Gurung', role: 'Vice President' },
      { name: 'Aleenah Akhtar', role: 'Treasurer' },
    ],
  },
};

export function getSocietyById(id: string): Society | undefined {
  return SOCIETIES[id];
}

export function getAllSocieties(): Society[] {
  return Object.values(SOCIETIES);
}
