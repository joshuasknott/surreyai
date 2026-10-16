import type { PublicActivity } from './programme';

const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const timestamp = (date: string, time: string) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;

export function calendarFeed(items: PublicActivity[], origin: string, now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Surrey AI Society//Programme//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Surrey AI Society', 'X-WR-TIMEZONE:Europe/London',
    'BEGIN:VTIMEZONE', 'TZID:Europe/London', 'BEGIN:STANDARD', 'DTSTART:19701025T020000', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0000', 'TZNAME:GMT', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700329T010000', 'TZOFFSETFROM:+0000', 'TZOFFSETTO:+0100', 'TZNAME:BST', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT', 'END:VTIMEZONE'];
  for (const item of items) {
    if (!item.date) continue;
    lines.push('BEGIN:VEVENT', `UID:${item.id}@surreyaisociety.org`, `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      item.startTime ? `DTSTART;TZID=Europe/London:${timestamp(item.date, item.startTime)}` : `DTSTART;VALUE=DATE:${item.date.replaceAll('-', '')}`,
      ...(item.endTime ? [`DTEND;TZID=Europe/London:${timestamp(item.date, item.endTime)}`] : []),
      `SUMMARY:${escape(item.title)}`, `DESCRIPTION:${escape(item.description)}`, `LOCATION:${escape(item.location)}`, `URL:${origin}/activities/${item.id}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // RFC 5545 folds content lines at 75 octets without splitting a UTF-8 character.
  return lines.map(line => {
    let result = '', size = 0;
    for (const char of line) { const bytes = new TextEncoder().encode(char).length; if (size + bytes > 75) { result += '\r\n '; size = 1; } result += char; size += bytes; }
    return result;
  }).join('\r\n') + '\r\n';
}
