import { describe, expect, it } from "vitest";
import {
  entryIntentFromParams,
  matchesEntryIntent,
  normalizeStoredEntryIntent,
} from "../src/lib/onboarding-session";

describe("onboarding session entry intent", () => {
  it("restores an explicit design URL only when it is the same design", () => {
    const current = entryIntentFromParams(new URLSearchParams("design=Cobalt"));
    expect(current).toBe("design:cobalt");
    expect(matchesEntryIntent(current, "design:cobalt")).toBe(true);
    expect(matchesEntryIntent(current, "design:mono")).toBe(false);
  });

  it("lets the default /new route resume any saved journey", () => {
    const current = entryIntentFromParams(new URLSearchParams());
    expect(matchesEntryIntent(current, "scratch")).toBe(true);
  });

  it("normalizes malformed stored values to the safe default", () => {
    expect(normalizeStoredEntryIntent("design:COBALT")).toBe("design:cobalt");
    expect(normalizeStoredEntryIntent("design:")).toBe("default");
    expect(normalizeStoredEntryIntent({})).toBe("default");
  });
});
