// This standalone recruitment round stays open unless its own deadline is set.
// It deliberately does not inherit the society site's expired campaign.
export function applicationsClosed(now = Date.now(), closeAt = process.env.APPLICATIONS_CLOSE_AT): boolean {
  if (!closeAt?.trim()) return false;
  const deadline = Date.parse(closeAt);
  return !Number.isFinite(deadline) || now >= deadline;
}
