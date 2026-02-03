// Centralized color constants for the application
// These colors follow the design manual's pastel color scheme

/**
 * Avatar colors used for family member avatars
 * Used in: AddMemberForm, EditMemberModal, CalendarSourcesManager, etc.
 */
export const AVATAR_COLORS = [
  { name: 'Yellow', hex: '#FFF48D' },
  { name: 'Orange', hex: '#FCDD8C' },
  { name: 'Salmon', hex: '#F4B3BB' },
  { name: 'Pink', hex: '#DEB2FA' },
  { name: 'Purple', hex: '#B2AEFF' },
  { name: 'Blue', hex: '#BADAF8' },
  { name: 'Turquoise', hex: '#C1FDFD' },
  { name: 'Green', hex: '#D2FCC3' },
  { name: 'Gray', hex: '#ECECEC' },
];

/**
 * Category colors for activity blocks
 * Used in: ActivityBlock, ActivityModal, etc.
 */
export const CATEGORY_COLORS = {
  work: '#B2AEFF',
  exercise: '#D2FCC3',
  family: '#DEB2FA',
  meal: '#FCDD8C',
  personal: '#BADAF8',
  medical: '#F4B3BB',
  social: '#FFF48D',
  chores: '#ECECEC',
};

/**
 * Category icons for activity blocks
 * Used in: ActivityBlock
 */
export const CATEGORY_ICONS = {
  work: '💼',
  exercise: '🏃',
  family: '👨‍👩‍👧',
  meal: '🍽️',
  personal: '⭐',
  medical: '🏥',
  social: '👥',
  chores: '🧹',
};

/**
 * Categories with labels and colors for activity selection
 * Used in: ActivityModal
 */
export const CATEGORIES = [
  { value: 'work', label: 'Work', color: '#B2AEFF' },
  { value: 'exercise', label: 'Exercise', color: '#D2FCC3' },
  { value: 'family', label: 'Family', color: '#DEB2FA' },
  { value: 'meal', label: 'Meal', color: '#FCDD8C' },
  { value: 'personal', label: 'Personal', color: '#BADAF8' },
  { value: 'medical', label: 'Medical', color: '#F4B3BB' },
  { value: 'social', label: 'Social', color: '#FFF48D' },
  { value: 'chores', label: 'Chores', color: '#ECECEC' },
];

/**
 * Available colors for activity customization
 * Used in: WeekCalendar for member-colored activities
 */
export const AVAILABLE_COLORS = [
  { name: 'Light Purple', value: '#B2AEFF', hex: '#B2AEFF' },
  { name: 'Light Green', value: '#D2FCC3', hex: '#D2FCC3' },
  { name: 'Light Pink', value: '#DEB2FA', hex: '#DEB2FA' },
  { name: 'Light Orange', value: '#FCDD8C', hex: '#FCDD8C' },
  { name: 'Light Blue', value: '#BADAF8', hex: '#BADAF8' },
  { name: 'Light Salmon', value: '#F4B3BB', hex: '#F4B3BB' },
  { name: 'Light Yellow', value: '#FFF48D', hex: '#FFF48D' },
  { name: 'Light Gray', value: '#ECECEC', hex: '#ECECEC' },
  { name: 'Turquoise', value: '#C1FDFD', hex: '#C1FDFD' },
];
