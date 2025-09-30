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

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid image file (JPEG, PNG, or GIF)',
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

/**
 * Validate file with custom allowed types
 * 
 * @param {File} file - File object to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @param {number} maxSizeMB - Maximum file size in megabytes
 * @returns {Object} Validation result with valid flag and error message
 * 
 * @example
 * const result = validateFile(file, ['application/pdf', 'image/png'], 10);
 */
export const validateFile = (file, allowedTypes, maxSizeMB = 10) => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!allowedTypes.includes(file.type)) {
    const typeNames = allowedTypes
      .map(type => type.split('/')[1].toUpperCase())
      .join(', ');
    return {
      valid: false,
      error: `Please select a valid file type (${typeNames})`,
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

/**
 * Format file size to human-readable string
 * 
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "2.5 MB", "150 KB")
 * 
 * @example
 * formatFileSize(1536000) // "1.5 MB"
 */
export const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if file is an image
 * 
 * @param {File} file - File object to check
 * @returns {boolean} True if file is an image
 */
export const isImageFile = file => {
  return file && file.type.startsWith('image/');
};

/**
 * Get file extension from filename
 * 
 * @param {string} filename - Filename to extract extension from
 * @returns {string} File extension (lowercase, without dot)
 * 
 * @example
 * getFileExtension('photo.JPG') // 'jpg'
 */
export const getFileExtension = filename => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
};
