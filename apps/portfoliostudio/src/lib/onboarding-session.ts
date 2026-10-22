export type OnboardingEntryIntent = "default" | "scratch" | `design:${string}`;

const maxDesignIdLength = 80;

export function entryIntentFromParams(
  params: Pick<URLSearchParams, "get" | "has">,
): OnboardingEntryIntent {
  if (params.has("scratch")) return "scratch";
  const design = params
    .get("design")
    ?.trim()
    .toLowerCase()
    .slice(0, maxDesignIdLength);
  return design ? `design:${design}` : "default";
}

export function normalizeStoredEntryIntent(
  value: unknown,
): OnboardingEntryIntent {
  if (value === "default" || value === "scratch") return value;
  if (
    typeof value === "string" &&
    value.startsWith("design:") &&
    value.slice("design:".length).length > 0 &&
    value.slice("design:".length).length <= maxDesignIdLength
  ) {
    return `design:${value.slice("design:".length).trim().toLowerCase()}`;
  }
  return "default";
}

export function matchesEntryIntent(
  current: OnboardingEntryIntent,
  stored: OnboardingEntryIntent,
): boolean {
  return current === "default" || current === stored;
}
