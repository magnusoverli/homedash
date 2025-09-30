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
  // Network errors
  if (error.message?.toLowerCase().includes('network')) {
    return 'Network connection failed. Please check your internet connection.';
  }

  // Timeout errors
  if (
    error.message?.toLowerCase().includes('timeout') ||
    error.message?.toLowerCase().includes('timed out')
  ) {
    return 'Request timed out. Please try again.';
  }

  // Anthropic API specific errors
  if (error.message?.includes('529')) {
    return 'Anthropic API is currently overloaded. Please try again in a few moments.';
  }

  if (error.message?.includes('401') || error.message?.includes('Invalid API key')) {
    return 'Invalid API key. Please verify your API key in Settings.';
  }

  if (error.message?.includes('429')) {
    return 'Rate limit exceeded. Please wait a moment before trying again.';
  }

  // Server errors
  if (response && response.status >= 500) {
    return `Server error (${response.status}). Please try again later.`;
  }

  // Bad request errors
  if (response && response.status === 400) {
    return 'Invalid request. Please check your input and try again.';
  }

  // Generic error with message
  if (error.message) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Get HTTP status code message
 * 
 * @param {number} statusCode - HTTP status code
 * @returns {string} User-friendly status message
 * 
 * @example
 * getHttpStatusMessage(404) // 'Not found'
 */
export const getHttpStatusMessage = statusCode => {
  const statusMessages = {
    400: 'Bad request',
    401: 'Unauthorized - Invalid credentials',
    403: 'Forbidden - Access denied',
    404: 'Not found',
    429: 'Too many requests - Rate limit exceeded',
    500: 'Internal server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
    504: 'Gateway timeout',
    529: 'API overloaded - Please try again later',
  };

  return statusMessages[statusCode] || `HTTP error ${statusCode}`;
};

/**
 * Check if error is network-related
 * 
 * @param {Error} error - Error object
 * @returns {boolean} True if error is network-related
 */
export const isNetworkError = error => {
  return (
    error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('fetch') ||
    error.message?.toLowerCase().includes('connection') ||
    error.name === 'NetworkError' ||
    error.name === 'TypeError'
  );
};

/**
 * Check if error is timeout-related
 * 
 * @param {Error} error - Error object
 * @returns {boolean} True if error is timeout-related
 */
export const isTimeoutError = error => {
  return (
    error.message?.toLowerCase().includes('timeout') ||
    error.message?.toLowerCase().includes('timed out') ||
    error.name === 'TimeoutError' ||
    error.name === 'AbortError'
  );
};

/**
 * Format error for logging
 * 
 * @param {Error} error - Error object
 * @param {Object} context - Additional context (e.g., { operation: 'fetchData', userId: '123' })
 * @returns {Object} Formatted error object for logging
 */
export const formatErrorForLogging = (error, context = {}) => {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  };
};

/**
 * Enhanced error handler for async operations
 * 
 * @param {Function} operation - Async operation to execute
 * @param {Function} errorCallback - Callback to handle errors
 * @param {Object} context - Additional context for error logging
 * @returns {Promise} Result of the operation
 * 
 * @example
 * await handleAsyncError(
 *   () => fetchData(id),
 *   (error) => showError(getApiErrorMessage(error)),
 *   { operation: 'fetchData', id }
 * );
 */
export const handleAsyncError = async (
  operation,
  errorCallback,
  context = {}
) => {
  try {
    return await operation();
  } catch (error) {
    console.error('Operation failed:', formatErrorForLogging(error, context));
    if (errorCallback) {
      errorCallback(error);
    }
    throw error;
  }
};
