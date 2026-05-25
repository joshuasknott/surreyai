import type { SocietySettingsInput, ValidationResult } from '../types.js';

const URL_REGEX = /^https?:\/\/.+/;
const PATH_REGEX = /^\/[A-Za-z0-9._~!$&'()*+,;=:@\/-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateOptionalUrl(value: string | undefined, field: string, label: string, errors: Record<string, string>) {
  if (value && !URL_REGEX.test(value)) {
    errors[field] = `${label} must be a valid URL`;
  }
}

export function validateSocietySettingsInput(input: SocietySettingsInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.contactEmail && !EMAIL_REGEX.test(input.contactEmail)) {
    errors.contactEmail = 'Contact email must be a valid email address';
  }

  validateOptionalUrl(input.instagram, 'instagram', 'Instagram URL', errors);
  validateOptionalUrl(input.linkedin, 'linkedin', 'LinkedIn URL', errors);
  validateOptionalUrl(input.membershipUrl, 'membershipUrl', 'Membership URL', errors);
  validateOptionalUrl(input.studentsUnionUrl, 'studentsUnionUrl', "Students' Union URL", errors);

  if (input.logo && !URL_REGEX.test(input.logo) && !PATH_REGEX.test(input.logo)) {
    errors.logo = 'Logo path must be a valid URL or site path beginning with /';
  }

  if (input.establishedYear !== undefined) {
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(input.establishedYear) || input.establishedYear < 1800 || input.establishedYear > maxYear) {
      errors.establishedYear = `Established year must be between 1800 and ${maxYear}`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
