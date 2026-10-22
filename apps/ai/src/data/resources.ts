export interface SocietyResource {
  title: string;
  label: string;
  description: string;
  href: string;
  action: string;
}

export const societyResources: SocietyResource[] = [
  {
    title: 'Portfolio Studio',
    label: 'Build and publish',
    description:
      'Create a portfolio website from an editable design, import your CV, and publish a site you can take with you.',
    href: 'https://portfolio-studio-1uu.pages.dev',
    action: 'Open Portfolio Studio',
  },
];
