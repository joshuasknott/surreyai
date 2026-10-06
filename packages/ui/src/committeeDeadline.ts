// Fixed deadlines used by each society's banner and application handlers.
export const COMMITTEE_APPLICATIONS_CLOSE_AT = '2026-10-06T13:44:00Z';
export const NEUROTECH_COMMITTEE_APPLICATIONS_CLOSE_AT = '2026-10-07T18:24:22Z';

export const committeeApplicationsClosed = (now = Date.now()) =>
  now >= Date.parse(COMMITTEE_APPLICATIONS_CLOSE_AT);

export const neurotechCommitteeApplicationsClosed = (now = Date.now()) =>
  now >= Date.parse(NEUROTECH_COMMITTEE_APPLICATIONS_CLOSE_AT);
