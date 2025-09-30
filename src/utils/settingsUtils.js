/**
 * Settings persistence utility functions
 * Handles saving and loading settings with localStorage fallback
 */

import dataService from '../services/dataService';

/**
 * Save a setting with localStorage fallback
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 * @returns {Promise<boolean>} Success status
 */
export const saveSetting = async (key, value) => {
  try {
    await dataService.updateSetting(key, value);
    return true;
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
    // Fallback to localStorage
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (localError) {
      console.error(`localStorage fallback failed for ${key}:`, localError);
      return false;
    }
  }
};