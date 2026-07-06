import type { CreateEventInput, UpdateEventInput, ValidationResult, EVENT_CATEGORIES } from '../types.js';

const URL_REGEX = /^https?:\/\/.+/;

export function validateEventInput(input: CreateEventInput | UpdateEventInput, isUpdate = false): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isUpdate || input.title !== undefined) {
    if (!input.title || input.title.trim().length === 0) {
      errors.title = 'Enter an event title.';
    }
  }

  if (!isUpdate || input.date !== undefined) {
    if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      errors.date = 'Choose a valid event date.';
    }
  }

  if (input.startTime && !/^\d{2}:\d{2}$/.test(input.startTime)) {
    errors.startTime = 'Choose a valid start time.';
  }

  if (input.endTime && !/^\d{2}:\d{2}$/.test(input.endTime)) {
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
