import type { CreateEventInput, UpdateEventInput, ValidationResult, EVENT_CATEGORIES } from '../types.js';

const URL_REGEX = /^https?:\/\/.+/;

export function validateEventInput(input: CreateEventInput | UpdateEventInput, isUpdate = false): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isUpdate || input.title !== undefined) {
    if (!input.title || input.title.trim().length === 0) {
      errors.title = 'Title is required';
    }
  }

  if (!isUpdate || input.date !== undefined) {
    if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      errors.date = 'Date must be in YYYY-MM-DD format';
    }
  }

  if (input.startTime && !/^\d{2}:\d{2}$/.test(input.startTime)) {
    errors.startTime = 'Start time must be in HH:MM format';
  }

  if (input.endTime && !/^\d{2}:\d{2}$/.test(input.endTime)) {
    errors.endTime = 'End time must be in HH:MM format';
  }

  if (input.registrationUrl && !URL_REGEX.test(input.registrationUrl)) {
    errors.registrationUrl = 'Registration URL must be a valid URL';
  }

  if (input.image && !URL_REGEX.test(input.image) && !input.image.startsWith('/')) {
    errors.image = 'Image must be a valid URL or path';
  }

  if (input.status && !['draft', 'published'].includes(input.status)) {
    errors.status = 'Status must be draft or published';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
