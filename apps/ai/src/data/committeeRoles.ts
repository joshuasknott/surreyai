export interface CommitteeRole {
  slug: string;
  title: string;
  summary: string;
  intro: string;
  responsibilities: string[];
  task: string;
  questions: { key: string; label: string; hint: string }[];
}

export const committeeRoles: CommitteeRole[] = [
  {
    slug: 'workshops-learning', title: 'Workshops & Learning Officer',
    summary: 'Make AI easier to explore, understand and use.',
    intro: 'Plan practical learning opportunities for curious students at every level.',
    responsibilities: ['Plan approachable workshops', 'Support facilitators and speakers', 'Create useful take-home resources'],
    task: 'Sketch a 45-minute beginner-friendly AI workshop you would run for society members.',
    questions: [
      { key: 'workshopTopic', label: 'What would the workshop cover?', hint: 'Tell us who it is for and what attendees would leave knowing.' },
      { key: 'workshopOutline', label: 'How would you structure the 45 minutes?', hint: 'A short outline is enough.' },
    ],
  },
  {
    slug: 'industry-partnerships', title: 'Industry & Partnerships Officer',
    summary: 'Open up useful connections and opportunities.',
    intro: 'Connect our members with people and organisations putting AI to work.',
    responsibilities: ['Find relevant partners and speakers', 'Shape valuable collaborations', 'Build thoughtful, lasting relationships'],
    task: 'Imagine an organisation you would approach for a society collaboration.',
    questions: [
      { key: 'partnerIdea', label: 'Who would you approach, and why are they a fit?', hint: 'A type of organisation is fine; no existing contact is needed.' },
      { key: 'partnershipPitch', label: 'What would your first message propose?', hint: 'Show how members and the partner would both benefit.' },
    ],
  },
  {
    slug: 'career-opportunities', title: 'Career & Opportunities Officer',
    summary: 'Help members find their next step in AI.',
    intro: 'Make career paths, experience and opportunities easier for members to explore.',
    responsibilities: ['Find and share relevant placements, internships and events', 'Connect members with useful career insight and resources', 'Make opportunities accessible to students at different stages'],
    task: 'Plan one career-focused activity or resource that would help AI Society members explore their next step.',
    questions: [
      { key: 'careerIdea', label: 'What would you create or organise?', hint: 'Describe who it is for and what members would gain.' },
      { key: 'careerPlan', label: 'How would you find opportunities and make them accessible?', hint: 'Consider different experience levels and how you would keep information current.' },
    ],
  },
  {
    slug: 'projects-hackathons', title: 'Projects & Hackathons Officer',
    summary: 'Help students build and experiment together.',
    intro: 'Turn interesting ideas into collaborative projects and memorable hackathons.',
    responsibilities: ['Create project opportunities', 'Plan inclusive hackathon challenges', 'Help teams move from idea to demo'],
    task: 'Pitch a small project or hackathon challenge the society could run this year.',
    questions: [
      { key: 'challengeIdea', label: 'What is the challenge, and who could take part?', hint: 'Keep it achievable for mixed experience levels.' },
      { key: 'challengeDelivery', label: 'How would teams get from kickoff to demo?', hint: 'Mention support, timing and how you would celebrate the results.' },
    ],
  },
  {
    slug: 'social-media-content', title: 'Social Media & Content Officer',
    summary: 'Tell the society’s story with clarity and creativity.',
    intro: 'Make our activities easy to find and exciting to take part in.',
    responsibilities: ['Plan engaging social posts', 'Make clear, on-brand visuals', 'Keep our channels welcoming and consistent'],
    task: 'Create one mock Surrey AI Society social post using the brand assets below, then upload it with your application. You could promote a fictional beginner AI workshop; label invented event details as a concept.',
    questions: [
      { key: 'postCaption', label: 'What caption would you publish with your post?', hint: 'Include a clear invitation or next step.' },
      { key: 'postApproach', label: 'Who is the post for, and why this approach?', hint: 'A few sentences are enough.' },
    ],
  },
  {
    slug: 'events-socials', title: 'Events & Socials Officer',
    summary: 'Bring members together, on and off campus.',
    intro: 'Create events that make it easy for people to meet and find their place.',
    responsibilities: ['Plan talks, events and socials', 'Coordinate the practical details', 'Make events accessible and inviting'],
    task: 'Plan one society social or event that would help new members connect.',
    questions: [
      { key: 'eventIdea', label: 'What would the event look like?', hint: 'Include format, audience and what people would do.' },
      { key: 'eventPlan', label: 'How would you make it welcoming and practical to run?', hint: 'Consider accessibility, communication and a simple backup plan.' },
    ],
  },
  {
    slug: 'wellbeing-champion', title: 'Wellbeing Champion',
    summary: 'Help make our community welcoming for everyone.',
    intro: 'Be a thoughtful voice for inclusion and help members find appropriate support.',
    responsibilities: ['Promote inclusive community habits', 'Notice barriers to participation', 'Signpost to appropriate University support'],
    task: 'A new member says they feel left out at technical events. How would you respond?',
    questions: [
      { key: 'wellbeingResponse', label: 'What would you say or do first?', hint: 'Focus on listening and practical support, without sharing private details.' },
      { key: 'wellbeingImprovement', label: 'What would you change for future events?', hint: 'You do not need to disclose personal experiences.' },
    ],
  },
];

export const getCommitteeRole = (slug: string) => committeeRoles.find((role) => role.slug === slug);
