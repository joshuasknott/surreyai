const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed.' };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'File must be under 5MB.' };
  }

  return { valid: true };
}
