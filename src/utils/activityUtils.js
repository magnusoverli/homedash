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
 * Check if activity is school-related (schedule or activity)
 * @param {Object} activity - The activity object
 * @returns {boolean} True if school-related
 */
export const isSchoolActivity = activity => {
  return (
    activity.description?.includes('[TYPE:school_schedule]') ||
    activity.description?.includes('[TYPE:school_activity]')
  );
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
 * Check if activity is a school activity (special event)
 * @param {Object} activity - The activity object
 * @returns {boolean} True if school activity
 */
export const isSchoolActivityEvent = activity => {
  return activity.description?.includes('[TYPE:school_activity]');
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
 * Check if activity is tentative (Spond activity with no response)
 * @param {Object} activity - The activity object
 * @returns {boolean} True if tentative
 */
export const isTentativeActivity = activity => {
  return activity.source === 'spond' && !activity.response_status;
};

/**
 * Check if activity is from municipal calendar
 * @param {Object} activity - The activity object
 * @returns {boolean} True if from municipal calendar
 */
export const isMunicipalCalendarActivity = activity => {
  return activity.source === 'municipal_calendar';
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
