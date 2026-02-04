/**
 * Activity utility functions for the application
 */

/**
 * Get the activity type based on activity properties
 * Priority order: school types > category > source > manual
 *
 * @param {Object} activity - The activity object
 * @returns {string} The activity type identifier
 *
 * @example
 * getActivityType({ description: '[TYPE:school_schedule]' }) // 'school_schedule'
 * getActivityType({ category: 'work' }) // 'category_work'
 * getActivityType({ source: 'spond' }) // 'spond'
 * getActivityType({}) // 'manual'
 */
export const getActivityType = activity => {
  // Check for school types first (highest priority)
  if (activity.description?.includes('[TYPE:school_schedule]')) {
    return 'school_schedule';
  }
  if (activity.description?.includes('[TYPE:school_activity]')) {
    return 'school_activity';
  }

  // Check for category (second priority)
  if (activity.category) {
    return `category_${activity.category}`;
  }

  // Check source (third priority)
  if (activity.source === 'spond') {
    return 'spond';
  }
  if (activity.source === 'municipal_calendar') {
    return 'municipal_calendar';
  }

  // Default to manual
  return 'manual';
};

/**
 * Check if activity is specifically a school schedule entry
 * @param {Object} activity - The activity object
 * @returns {boolean} True if school schedule
 */
export const isSchoolScheduleActivity = activity => {
  return activity.description?.includes('[TYPE:school_schedule]');
};

/**
 * Check if activity is from Spond
 * @param {Object} activity - The activity object
 * @returns {boolean} True if from Spond
 */
export const isSpondActivity = activity => {
  return activity.source === 'spond';
};

/**
 * Get the icon for a Spond activity based on type
 * @param {Object} activity - The activity object
 * @returns {string} The emoji icon
 */
export const getSpondActivityIcon = activity => {
  const activityType = (
    activity.activity_type ||
    activity.activityType ||
    'EVENT'
  ).toUpperCase();
  const title = (activity.title || '').toLowerCase();

  // Check for theater/drama practice first (specific case)
  if (title.includes('teater') || title.includes('drama')) {
    return '🎭';
  }

  // Check activity type from Spond API
  if (
    activityType.includes('GAME') ||
    activityType.includes('MATCH') ||
    activityType.includes('KAMP')
  ) {
    return '⚽';
  }
  if (
    activityType.includes('TRAINING') ||
    activityType.includes('PRACTICE') ||
    activityType.includes('TRENING')
  ) {
    return '🏃';
  }

  // Title-based detection for matches/games (using "–" dash or "vs" pattern)
  if (
    title.includes('–') ||
    title.includes(' - ') ||
    title.includes(' vs ') ||
    title.includes(' v ')
  ) {
    return '⚽';
  }

  // Other title keywords
  if (
    title.includes('kamp') ||
    title.includes('match') ||
    title.includes('game')
  ) {
    return '⚽';
  }
  if (
    title.includes('trening') ||
    title.includes('training') ||
    title.includes('practice') ||
    title.includes('øvelse')
  ) {
    return '🏃';
  }
  if (
    title.includes('cup') ||
    title.includes('turnering') ||
    title.includes('tournament')
  ) {
    return '🏆';
  }

  // Default Spond icon
  return '📅';
};

/**
 * Check if activity is tentative (Spond activity with no response or declined)
 * @param {Object} activity - The activity object
 * @returns {boolean} True if tentative
 */
export const isTentativeActivity = activity => {
  return (
    activity.source === 'spond' &&
    (!activity.responseStatus || activity.responseStatus === 'declined')
  );
};

/**
 * Check if activity is from a calendar import (municipal/external calendar)
 * @param {Object} activity - The activity object
 * @returns {boolean} True if from calendar import
 */
export const isMunicipalCalendarActivity = activity => {
  return (
    activity.source === 'municipal_calendar' ||
    activity.source === 'calendar_import'
  );
};

/**
 * Check if activity is from any calendar source (has sourceId)
 * @param {Object} activity - The activity object
 * @returns {boolean} True if from a calendar source
 */
export const isCalendarSourceActivity = activity => {
  return activity.sourceId != null || activity.source === 'calendar_import';
};

/**
 * Get the municipal event type
 * @param {Object} activity - The activity object
 * @returns {string|null} Event type or null if not municipal
 */
export const getMunicipalEventType = activity => {
  if (!isMunicipalCalendarActivity(activity)) return null;

  // Check activity_type field for specific event types
  if (activity.activity_type === 'vacation') return 'vacation';
  if (activity.activity_type === 'planning_day') return 'planning_day';
  if (activity.activity_type === 'holiday') return 'holiday';
  if (activity.activity_type === 'school_event') return 'school_event';

  // Fallback to checking title
  const title = (activity.title || '').toLowerCase();
  if (title.includes('ferie')) return 'vacation';
  if (title.includes('planleggingsdag')) return 'planning_day';
  if (title.includes('fridag')) return 'holiday';

  return 'school_event';
};

/**
 * Get the icon for a municipal event
 * @param {Object} activity - The activity object
 * @returns {string} The emoji icon
 */
export const getMunicipalEventIcon = activity => {
  const eventType = getMunicipalEventType(activity);
  switch (eventType) {
    case 'vacation':
      return '🏖️';
    case 'planning_day':
      return '📋';
    case 'holiday':
      return '🎉';
    case 'school_event':
      return '🏫';
    default:
      return '📅';
  }
};

/**
 * Get the display color for an activity
 * Uses pastel colors from design system based on activity type
 *
 * @param {Object} activity - The activity object
 * @returns {string} HEX color code
 */
export const getActivityColor = activity => {
  const type = getActivityType(activity);

  // Color mapping from design manual
  const colorMap = {
    // Source-based
    manual: '#B2AEFF', // Pastell Light Purple
    spond: '#D2FCC3', // Pastell Green
    municipal_calendar: '#FCDD8C', // Pastell Orange

    // School types
    school_schedule: '#BADAF8', // Pastell Blue
    school_activity: '#DEB2FA', // Pastell Pink
  };

  return colorMap[type] || '#B2AEFF'; // Default to light purple
};

/**
 * Get the display icon for an activity
 * Returns emoji icon based on activity type
 *
 * @param {Object} activity - The activity object
 * @returns {string} Emoji icon
 */
export const getActivityIcon = activity => {
  const type = getActivityType(activity);

  // Special handling for municipal events
  if (type === 'municipal_calendar') {
    return getMunicipalEventIcon(activity);
  }

  // Special handling for Spond events
  if (type === 'spond') {
    return getSpondActivityIcon(activity);
  }

  // Icon mapping
  const iconMap = {
    // Source-based
    manual: '✏️',

    // School types
    school_schedule: '🏫',
    school_activity: '🎓',
  };

  return iconMap[type] || '📅'; // Default icon
};
