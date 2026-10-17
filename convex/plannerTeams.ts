import { SOCIETIES } from '@surreysocieties/admin/config';

/** Shared team identities; membership here does not grant planner access. */
export const plannerTeams = [
  { id: 'learning', name: 'Workshops & Learning', members: ["Amanda Lages O'Connor", 'Samuel Joyson Rekala', 'Tadavarthi Kusumitha'] },
  { id: 'events', name: 'Events & Socials', members: ['Fatima Waheed', 'George Mahon', 'Miguel Antonio'] },
  { id: 'industry', name: 'Industry & Partnerships', members: ['Ibrahim Haque', 'Samuel Young'] },
  { id: 'projects', name: 'Projects & Hackathons', members: ['Bibek Limbu', 'Muhammad Zain Khan'] },
  { id: 'careers', name: 'Careers & Opportunities', members: ['Deepanshu Dariya'] },
] as const;
export type PlannerTeam = typeof plannerTeams[number]['id'];
export const plannerLeads = [
  ...SOCIETIES.ai.signatories.map(person => person.name),
  ...plannerTeams.flatMap(team => team.members),
];
