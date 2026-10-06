// Applications stay open until an explicit closing date is agreed.
// Set an ISO timestamp to restore a shared countdown and server-side cutoff.
export const COMMITTEE_APPLICATIONS_CLOSE_AT: string | null = null;

export const committeeApplicationsClosed = (now = Date.now()) =>
  COMMITTEE_APPLICATIONS_CLOSE_AT !== null && now >= Date.parse(COMMITTEE_APPLICATIONS_CLOSE_AT);
