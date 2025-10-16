import { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';
import { formatLocalDate } from '../utils/timeUtils';

export const useHomework = (familyMembers, weekStart) => {
  const [homework, setHomework] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHomework = useCallback(async () => {
    if (!familyMembers || familyMembers.length === 0) {
      setLoading(false);
      return {};
    }

    setLoading(true);
    setError('');

    try {
      const weekStartStr = formatLocalDate(weekStart);
      const homeworkData = {};

      for (const member of familyMembers) {
        const memberHomework = await dataService.getHomework({
          member_id: member.id,
          week_start_date: weekStartStr,
        });
        homeworkData[member.id] = memberHomework;
      }

      setHomework(homeworkData);
      return homeworkData;
    } catch (err) {
      console.error('Error loading homework:', err);
      setError(err.message || 'Failed to load homework');
    } finally {
      setLoading(false);
    }
  }, [familyMembers, weekStart]);

  const refetch = useCallback(() => {
    return loadHomework();
  }, [loadHomework]);

  useEffect(() => {
    loadHomework();
  }, [loadHomework]);

  return { homework, loading, error, refetch, setHomework };
};
