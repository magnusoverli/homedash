import { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';

export const useSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await dataService.getSettings();
      setSettings(data);
      return data;
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err.message || 'Failed to load settings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    try {
      await dataService.updateSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value }));
      return value;
    } catch (err) {
      console.error('Error updating setting:', err);
      throw err;
    }
  }, []);

  const refetch = useCallback(() => {
    return loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, loading, error, updateSetting, refetch };
};
