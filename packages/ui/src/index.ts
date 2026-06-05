// Shared UI exports
// Add shared utilities, types, and component helpers here
export const SOCIETY_NAMES = {
  ai: 'Surrey Artificial Intelligence and Data Science Society',
  business: 'Surrey Business Society',
  neurotech: 'Surrey Neurotech Society',
} as const;

export const SOCIETY_DOMAINS = {
  ai: 'surreyaisociety.org',
  business: 'surreybusinesssociety.org',
  neurotech: 'surreyneurotechsociety.org',
} as const;

export type SocietyKey = keyof typeof SOCIETY_NAMES;

export {
  ASSISTANT_CONFIGS,
  type AssistantSocietyConfig,
  type AssistantSocietyKey,
} from './assistant.js';
