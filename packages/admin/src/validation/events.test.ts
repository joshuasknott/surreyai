import { describe, expect, it } from 'vitest';
import { validateEventInput } from './events';

describe('event date and time validation', () => {
  it.each(['2026-02-29', '2026-02-30', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '1900-02-29'])(
    'rejects the impossible date %s on create and update', (date) => {
      expect(validateEventInput({ title: 'Workshop', date }).errors.date).toBeTruthy();
      expect(validateEventInput({ date }, true).errors.date).toBeTruthy();
    },
  );
  it.each(['2028-02-29', '2000-02-29', '2026-04-30', '2026-12-31'])(
    'accepts the real date %s', (date) => {
      expect(validateEventInput({ title: 'Workshop', date }).valid).toBe(true);
    },
  );
  it.each(['24:00', '99:00', '12:60', '09:99', '-1:00'])(
    'rejects invalid start/end time %s', (time) => {
      const result = validateEventInput({ title: 'Workshop', startTime: time, endTime: time });
      expect(result.errors.startTime).toBeTruthy();
      expect(result.errors.endTime).toBeTruthy();
    },
  );
  it('preserves optional dates, partial updates and overnight event times', () => {
    expect(validateEventInput({ title: 'Draft' }).valid).toBe(true);
    expect(validateEventInput({}, true).valid).toBe(true);
    expect(validateEventInput({ title: 'Hackathon', startTime: '23:00', endTime: '08:00' }).valid).toBe(true);
  });
});
