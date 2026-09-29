// Fixed release deadline shared by both society sites and their application handlers.
export const COMMITTEE_APPLICATIONS_CLOSE_AT = '2026-10-06T13:37:24Z';

export const committeeApplicationsClosed = (now = Date.now()) =>
  now >= Date.parse(COMMITTEE_APPLICATIONS_CLOSE_AT);
