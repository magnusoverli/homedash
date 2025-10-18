import { useState, useEffect, useCallback } from 'react';
import ErrorState from '../../ErrorState';
import EmptyState from '../../EmptyState';
import PersonCarousel from '../timeline/PersonCarousel';
import MobilePersonCard from '../timeline/MobilePersonCard';
import PersonCardSkeleton from '../loading/PersonCardSkeleton';
import dataService from '../../../services/dataService';
import { formatLocalDate } from '../../../utils/timeUtils';
import './MobileOverview.css';

/**
 * Mobile Overview Screen
 *
 * Main view showing person carousel with weekly schedule.
 * Touch-optimized for mobile devices.
 *
 * Features:
 * - Swipeable person carousel
 * - Timeline with hourly activity blocks
 *
 * @param {Object} props
 * @param {Date} props.currentWeek - Current week to display
 */
const MobileOverview = ({ currentWeek }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [activities, setActivities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPersonIndex, setCurrentPersonIndex] = useState(0);

  // Get week start helper
  const getWeekStart = useCallback(() => {
    const weekStart = new Date(currentWeek);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    return weekStart;
  }, [currentWeek]);

  useEffect(() => {
    const loadFamilyMembers = async () => {
      setIsLoading(true);
      try {
        const members = await dataService.getFamilyMembers();
        const mappedMembers = members.map(m => ({
          ...m,
          avatarColor: m.color,
        }));
        setFamilyMembers(mappedMembers);
        setError('');
      } catch (error) {
        console.error('Error loading family members:', error);
        setError('Failed to load family members');
      } finally {
        setIsLoading(false);
      }
    };
    loadFamilyMembers();
  }, []);

  const loadData = useCallback(async () => {
    if (familyMembers.length === 0) return;

    try {
      const weekStart = getWeekStart();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startDateStr = formatLocalDate(weekStart);
      const endDateStr = formatLocalDate(weekEnd);

      // Load activities
      const activitiesData = await dataService.getActivities({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      // Group by member
      const activitiesByMember = {};
      activitiesData.forEach(activity => {
        if (
          activity.source === 'spond' &&
          activity.responseStatus === 'declined'
        ) {
          return;
        }

        if (!activitiesByMember[activity.memberId]) {
          activitiesByMember[activity.memberId] = [];
        }

        // Use the full activity object from activityFromAPI transformer
        // which includes all necessary fields like category, activityType, etc.
        activitiesByMember[activity.memberId].push(activity);
      });

      setActivities(activitiesByMember);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }, [familyMembers, getWeekStart]);

  useEffect(() => {
    loadData();
  }, [loadData, currentWeek]);

  if (isLoading) {
    return (
      <div className="mobile-overview">
        <div style={{ padding: 'var(--mobile-space-m)' }}>
          <PersonCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-overview">
        <ErrorState
          title="Something went wrong"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <div className="mobile-overview">
        <EmptyState
          icon="👨‍👩‍👧‍👦"
          title="No Family Members Yet"
          message="Go to Settings to add family members and start planning your week!"
        />
      </div>
    );
  }

  return (
    <div className="mobile-overview">
      <PersonCarousel
        members={familyMembers}
        currentIndex={currentPersonIndex}
        onIndexChange={setCurrentPersonIndex}
        renderMember={(member, isActive) => (
          <MobilePersonCard
            member={member}
            activities={activities[member.id] || []}
            weekStart={getWeekStart()}
            isActive={isActive}
          />
        )}
      />
    </div>
  );
};

export default MobileOverview;
