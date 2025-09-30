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

/**
 * Load a setting with localStorage fallback
 * @param {string} key - Setting key
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>} Setting value or default
 */
export const loadSetting = async (key, defaultValue = null) => {
  try {
    const settings = await dataService.getSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    // Fallback to localStorage
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (localErr) {
      console.error(`localStorage fallback failed for ${key}:`, localErr);
      return defaultValue;
    }
  }
};

/**
 * Load multiple settings at once
 * @param {Array<{key: string, defaultValue: *}>} settings - Array of setting configurations
 * @returns {Promise<Object>} Object with setting keys and values
 */
export const loadSettings = async settings => {
  const result = {};
  
  try {
    const allSettings = await dataService.getSettings();
    settings.forEach(({ key, defaultValue }) => {
      result[key] =
        allSettings[key] !== undefined ? allSettings[key] : defaultValue;
    });
  } catch (error) {
    console.error('Error loading settings from API:', error);
    // Fallback to localStorage for each setting
    settings.forEach(({ key, defaultValue }) => {
      try {
        const value = localStorage.getItem(key);
        result[key] = value !== null ? value : defaultValue;
      } catch {
        result[key] = defaultValue;
      }
    });
  }
  
  return result;
};
