import type { CreateEventInput, UpdateEventInput, ValidationResult } from '../types.js';

const URL_REGEX = /^https?:\/\/.+/;
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateEventInput(input: CreateEventInput | UpdateEventInput, isUpdate = false): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isUpdate || input.title !== undefined) {
    if (!input.title || input.title.trim().length === 0) {
      errors.title = 'Enter an event title.';
    }
  }

  if (!isUpdate || input.date !== undefined) {
    if (input.date && !isCalendarDate(input.date)) {
      errors.date = 'Choose a valid event date.';
    }
  }

  if (input.startTime && !TIME_REGEX.test(input.startTime)) {
    errors.startTime = 'Choose a valid start time.';
  }

  if (input.endTime && !TIME_REGEX.test(input.endTime)) {
    errors.endTime = 'Choose a valid end time.';
  }

  if (input.registrationUrl && !URL_REGEX.test(input.registrationUrl)) {
    errors.registrationUrl = 'Enter a full registration URL starting with http:// or https://.';
  }

  if (input.image && !URL_REGEX.test(input.image) && !input.image.startsWith('/')) {
    errors.image = 'Enter a full image URL or a site path beginning with /.';
  }

  if (input.status && !['draft', 'published'].includes(input.status)) {
    errors.status = 'Choose Draft or Published.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
