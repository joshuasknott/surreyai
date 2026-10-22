export type ResourceAccess = 'free' | 'ai-plus';
export type ResourceStatus = 'available' | 'planned';
export type ResourceIcon = 'book' | 'code' | 'file' | 'layout' | 'calendar' | 'workflow';

export interface SocietyResource {
  title: string;
  description: string;
  access: ResourceAccess;
  status: ResourceStatus;
  icon: ResourceIcon;
  href?: string;
  action?: string;
}

export const societyResources: SocietyResource[] = [
  {
    title: 'AI Learning Guides',
    description: 'Beginner-friendly guides to AI, prompting and machine learning.',
    access: 'free',
    status: 'planned',
    icon: 'book',
  },
  {
    title: 'Project Starters',
    description: 'Project ideas, starter repositories and practical tutorials.',
    access: 'free',
    status: 'planned',
    icon: 'code',
  },
  {
    title: 'Workshop Materials',
    description: 'Slides, tutorials and references from society sessions.',
    access: 'free',
    status: 'planned',
    icon: 'file',
  },
  {
    title: 'Portfolio Studio',
    description: 'Build, customise and publish your own portfolio website.',
    access: 'ai-plus',
    status: 'available',
    icon: 'layout',
    href: 'https://portfolio-studio-1uu.pages.dev',
    action: 'Open Portfolio Studio',
  },
  {
    title: 'Internship Tracker',
    description: 'Organise applications, deadlines and assessments in one place.',
    access: 'ai-plus',
    status: 'planned',
    icon: 'calendar',
  },
  {
    title: 'Automation Library',
    description: 'Reusable AI workflows, n8n templates and productivity tools.',
    access: 'ai-plus',
    status: 'planned',
    icon: 'workflow',
  },
];
