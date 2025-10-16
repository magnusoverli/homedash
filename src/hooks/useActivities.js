import { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';
import { formatLocalDate } from '../utils/timeUtils';

export const useActivities = (weekStart, weekEnd, familyMembers = []) => {
  const [activities, setActivities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const startDateStr = formatLocalDate(weekStart);
      const endDateStr = formatLocalDate(weekEnd);

      const activitiesData = await dataService.getActivities({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      const weekKey = startDateStr;
      const structured = { [weekKey]: {} };

      activitiesData.forEach(activity => {
        if (
          activity.source === 'spond' &&
          activity.responseStatus === 'declined'
        ) {
          return;
        }

        if (!structured[weekKey][activity.memberId]) {
          structured[weekKey][activity.memberId] = [];
        }
        structured[weekKey][activity.memberId].push(activity);
      });

      if (familyMembers.length > 0) {
        const syncPromises = familyMembers.map(async member => {
          try {
            const syncStatus = await dataService.checkSpondSyncStatus(
              member.id,
              5
            );

            if (syncStatus.needsSync) {
              await dataService.syncSpondActivities(
                member.id,
                startDateStr,
                endDateStr
              );
            }
          } catch (error) {
            console.warn(`Sync failed for ${member.name}:`, error);
          }
        });

        await Promise.all(syncPromises);

        const refreshedData = await dataService.getActivities({
          startDate: startDateStr,
          endDate: endDateStr,
        });

        const refreshedStructured = { [weekKey]: {} };

        refreshedData.forEach(activity => {
          if (
            activity.source === 'spond' &&
            activity.responseStatus === 'declined'
          ) {
            return;
          }

          if (!refreshedStructured[weekKey][activity.memberId]) {
            refreshedStructured[weekKey][activity.memberId] = [];
          }
          refreshedStructured[weekKey][activity.memberId].push(activity);
        });

        setActivities(refreshedStructured);
      } else {
        setActivities(structured);
      }

      return structured;
    } catch (err) {
      console.error('Error loading activities:', err);
      setError(err.message || 'Failed to load activities');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, familyMembers]);

  const refetch = useCallback(() => {
    return loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return { activities, loading, error, refetch, setActivities };
};
