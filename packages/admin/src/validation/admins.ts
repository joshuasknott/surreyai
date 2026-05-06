import type { InviteAdminInput, ValidationResult } from '../types.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInviteInput(input: InviteAdminInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    errors.email = 'A valid email is required';
  }

  if (!input.role || !['admin', 'member'].includes(input.role)) {
    errors.role = 'Role must be admin or member';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
