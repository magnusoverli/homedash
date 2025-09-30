/**
 * Time utility functions for the application
 */

/**
 * Format a Date object to YYYY-MM-DD in local timezone
 * This matches the backend's formatLocalDate function
 * @param {Date} date - Date object to format
 * @returns {string} Date string in YYYY-MM-DD format
 * 
 * @example
 * formatLocalDate(new Date(2025, 8, 29)) // returns '2025-09-29'
 */
export const formatLocalDate = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a time string to ensure consistent HH:MM format
 * @param {string} timeString - Time in HH:MM format
 * @returns {string} Formatted time string with padded zeros
 * 
 * @example
 * formatTime('9:00') // returns '09:00'
 * formatTime('14:30') // returns '14:30'
 */
export const formatTime = timeString => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Generate an array of time options for time selectors
 * @param {number} intervalMinutes - Interval between time options (default: 15)
 * @returns {Array<string>} Array of time strings in HH:MM format
 * 
 * @example
 * generateTimeOptions() // returns ['00:00', '00:15', '00:30', ..., '23:45']
 * generateTimeOptions(30) // returns ['00:00', '00:30', '01:00', ..., '23:30']
 */
export const generateTimeOptions = (intervalMinutes = 15) => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
};
