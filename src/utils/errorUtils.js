/**
 * Error Handling Utilities
 *
 * Centralized error message formatting and handling functions
 */

/**
 * Get user-friendly error message from API error
 *
 * @param {Error} error - Error object
 * @param {Response} response - Optional fetch Response object
 * @returns {string} User-friendly error message
 *
 * @example
 * try {
 *   const response = await fetch(url);
 *   // ...
 * } catch (error) {
 *   const message = getApiErrorMessage(error);
 *   showError(message);
 * }
 */
export const getApiErrorMessage = (error, response = null) => {
  if (error.message?.toLowerCase().includes('network')) {
    return 'Network connection failed. Please check your internet connection.';
  }

  if (
    error.message?.toLowerCase().includes('timeout') ||
    error.message?.toLowerCase().includes('timed out')
  ) {
    return 'Request timed out. Please try again.';
  }

  if (error.message?.includes('529')) {
    return 'Anthropic API is currently overloaded. Please try again in a few moments.';
  }

  if (
    error.message?.includes('401') ||
    error.message?.includes('Invalid API key')
  ) {
    return 'Invalid API key. Please verify your API key in Settings.';
  }

  if (error.message?.includes('429')) {
    return 'Rate limit exceeded. Please wait a moment before trying again.';
  }

  if (response && response.status >= 500) {
    return `Server error (${response.status}). Please try again later.`;
  }

  if (response && response.status === 400) {
    return 'Invalid request. Please check your input and try again.';
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};
