import type {
  CreateCommitteeMemberInput,
  CreatePastCommitteeMemberInput,
  UpdateCommitteeMemberInput,
  UpdatePastCommitteeMemberInput,
  ValidationResult,
} from '../types.js';

const URL_REGEX = /^https?:\/\/.+/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCommitteeInput(input: CreateCommitteeMemberInput | UpdateCommitteeMemberInput, isUpdate = false): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isUpdate || input.name !== undefined) {
    if (!input.name || input.name.trim().length === 0) {
      errors.name = 'Name is required';
    }
  }

  if (!isUpdate || input.role !== undefined) {
    if (!input.role || input.role.trim().length === 0) {
      errors.role = 'Role is required';
    }
  }

  if (input.email && !EMAIL_REGEX.test(input.email)) {
    errors.email = 'Email must be valid';
  }

  if (input.linkedIn && !URL_REGEX.test(input.linkedIn)) {
    errors.linkedIn = 'LinkedIn must be a valid URL';
  }

  if (input.image && !URL_REGEX.test(input.image) && !input.image.startsWith('/')) {
    errors.image = 'Image must be a valid URL or path';
  }

  if (input.displayOrder !== undefined && (typeof input.displayOrder !== 'number' || input.displayOrder < 0)) {
    errors.displayOrder = 'Display order must be a non-negative number';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePastCommitteeInput(
  input: CreatePastCommitteeMemberInput | UpdatePastCommitteeMemberInput,
  isUpdate = false
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isUpdate || input.name !== undefined) {
    if (!input.name || input.name.trim().length === 0) {
      errors.name = 'Name is required';
    }
  }

  if (!isUpdate || input.role !== undefined) {
    if (!input.role || input.role.trim().length === 0) {
      errors.role = 'Role is required';
    }
  }

  if (!isUpdate || input.yearLabel !== undefined) {
    if (!input.yearLabel || input.yearLabel.trim().length === 0) {
      errors.yearLabel = 'Year or term label is required';
    }
  }

  if (input.email && !EMAIL_REGEX.test(input.email)) {
    errors.email = 'Email must be valid';
  }

  if (input.linkedIn && !URL_REGEX.test(input.linkedIn)) {
    errors.linkedIn = 'LinkedIn must be a valid URL';
  }

  if (input.image && !URL_REGEX.test(input.image) && !input.image.startsWith('/')) {
    errors.image = 'Image must be a valid URL or path';
  }

  if (input.displayOrder !== undefined && (typeof input.displayOrder !== 'number' || input.displayOrder < 0)) {
    errors.displayOrder = 'Display order must be a non-negative number';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
