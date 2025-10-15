/**
 * File Validation Utilities
 *
 * Centralized file validation functions for upload features
 */

/**
 * Validate image file type and size
 *
 * @param {File} file - File object to validate
 * @param {number} maxSizeMB - Maximum file size in megabytes (default: 5)
 * @returns {Object} Validation result with valid flag and error message
 *
 * @example
 * const result = validateImageFile(file, 5);
 * if (!result.valid) {
 *   showError(result.error);
 *   return;
 * }
 */
export const validateImageFile = (file, maxSizeMB = 5) => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
  ];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid image or PDF file (JPEG, PNG, GIF, or PDF)',
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};
