import { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';

export const useFamilyMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await dataService.getFamilyMembers();
      setMembers(data);
      return data;
    } catch (err) {
      console.error('Error loading family members:', err);
      setError(err.message || 'Failed to load family members');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    return loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return { members, loading, error, refetch };
};
