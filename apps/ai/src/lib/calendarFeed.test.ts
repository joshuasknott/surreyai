import { describe, expect, it } from 'vitest';
import { calendarFeed } from './calendarFeed';
import { londonToday, upcomingActivities, type PublicActivity } from './programme';
const item: PublicActivity = { id: 'example', title: 'Build, learn; repeat', kind: 'event', category: 'Workshop', description: 'First line\nSecond line', date: '2026-10-29', startTime: '18:00', endTime: '20:00', location: 'Stag Hill', registrationUrl: '' };
describe('public calendar feed', () => {
  it('escapes text, preserves London daylight-saving rules and folds UTF-8 content lines', () => {
    const result = calendarFeed([{ ...item, description: '🤖'.repeat(80) + '\nSecond line' }], 'https://surreyaisociety.org', new Date('2026-10-15T12:00:00Z'));
    expect(result).toContain('SUMMARY:Build\\, learn\\; repeat');
    expect(result).toContain('DTSTART;TZID=Europe/London:20261029T180000');
    expect(result).toContain('DTEND;TZID=Europe/London:20261029T200000');
    expect(result).toContain('DTSTAMP:20261015T120000Z');
    expect(result).toContain('TZID:Europe/London');
    for (const line of result.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(result).not.toContain('\uFFFD');
  });
  it('does not invent dates for ongoing projects', () => {
    expect(calendarFeed([{ ...item, kind: 'project', date: '' }], 'https://example.test')).not.toContain('BEGIN:VEVENT');
  });
  it('escapes standalone carriage returns in public text', () => {
    const feed = calendarFeed([{ ...item, description: 'Hello\rBEGIN:VEVENT' }], 'https://example.test');
    expect(feed).toContain('DESCRIPTION:Hello\\nBEGIN:VEVENT');
    expect(feed.match(/\r\nBEGIN:VEVENT/g)).toHaveLength(1);
  });
});
it('sorts upcoming events while keeping undated projects separate', () => {
  const items = [item, { ...item, id: 'earlier', date: '2026-10-22' }, { ...item, id: 'past', date: '2026-09-01' }, { ...item, id: 'project', kind: 'project' as const, date: '' }];
  expect(upcomingActivities(items, '2026-10-15').map(row => row.id)).toEqual(['earlier', 'example']);
  expect(londonToday(new Date('2026-08-01T23:30:00Z'))).toBe('2026-08-02');
});
