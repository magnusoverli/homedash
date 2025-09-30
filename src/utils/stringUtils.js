/**
 * String utility functions for the application
 */

/**
 * Get initials from a person's name
 * @param {string} name - The full name
 * @param {string} defaultValue - Default value if name is empty (default: '?')
 * @returns {string} The initials in uppercase
 * 
 * @example
 * getInitials('John Doe') // returns 'JD'
 * getInitials('Alice') // returns 'AL'
 * getInitials('') // returns '?'
 * getInitials('', 'NN') // returns 'NN'
 */
export const getInitials = (name, defaultValue = '?') => {
  if (!name) return defaultValue;
  
  const parts = name.split(' ');
  
  // If there are multiple parts, use first and last
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  
  // If single word, use first two characters
  return name.slice(0, 2).toUpperCase();
};
