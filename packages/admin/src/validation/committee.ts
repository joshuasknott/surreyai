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
      errors.name = 'Enter the committee member name.';
    }
  }

  if (!isUpdate || input.role !== undefined) {
    if (!input.role || input.role.trim().length === 0) {
      errors.role = 'Enter the committee role.';
    }
  }

  if (input.email && !EMAIL_REGEX.test(input.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (input.linkedIn && !URL_REGEX.test(input.linkedIn)) {
    errors.linkedIn = 'Enter a full LinkedIn URL starting with http:// or https://.';
  }

  if (input.image && !URL_REGEX.test(input.image) && !input.image.startsWith('/')) {
    errors.image = 'Enter a full image URL or a site path beginning with /.';
  }

  if (input.displayOrder !== undefined && (typeof input.displayOrder !== 'number' || input.displayOrder < 0)) {
    errors.displayOrder = 'Enter zero or a positive number for display order.';
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
      errors.name = 'Enter the past committee member name.';
    }
  }

  if (!isUpdate || input.role !== undefined) {
    if (!input.role || input.role.trim().length === 0) {
      errors.role = 'Enter the committee role.';
    }
  }

  if (!isUpdate || input.yearLabel !== undefined) {
    if (!input.yearLabel || input.yearLabel.trim().length === 0) {
      errors.yearLabel = 'Enter the year or term label.';
    }
  }

  if (input.email && !EMAIL_REGEX.test(input.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (input.linkedIn && !URL_REGEX.test(input.linkedIn)) {
    errors.linkedIn = 'Enter a full LinkedIn URL starting with http:// or https://.';
  }

  if (input.image && !URL_REGEX.test(input.image) && !input.image.startsWith('/')) {
    errors.image = 'Enter a full image URL or a site path beginning with /.';
  }

  if (input.displayOrder !== undefined && (typeof input.displayOrder !== 'number' || input.displayOrder < 0)) {
    errors.displayOrder = 'Enter zero or a positive number for display order.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
