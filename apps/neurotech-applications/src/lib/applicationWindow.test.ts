import { describe, expect, it } from 'vitest';
import { applicationsClosed } from './applicationWindow';

describe('standalone application window', () => {
  const now = Date.parse('2026-10-19T12:00:00Z');
  it('stays open without a deadline after the old round has ended', () => {
    expect(applicationsClosed(now, '')).toBe(false);
  });
  it('honours its own deadline and fails closed for invalid configuration', () => {
    expect(applicationsClosed(now, '2026-10-20T12:00:00Z')).toBe(false);
    expect(applicationsClosed(now, '2026-10-19T12:00:00Z')).toBe(true);
    expect(applicationsClosed(now, 'invalid')).toBe(true);
  });
});
