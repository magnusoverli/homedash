import { useState, useEffect, useCallback } from 'react';
import MobileHeader from '../navigation/MobileHeader';
import { HomeDashIcon } from '../../icons';
import LoadingState from '../../LoadingState';
import ErrorState from '../../ErrorState';
import EmptyState from '../../EmptyState';
import PersonCarousel from '../timeline/PersonCarousel';
import MobilePersonCard from '../timeline/MobilePersonCard';

import PersonCardSkeleton from '../loading/PersonCardSkeleton';
import dataService from '../../../services/dataService';
import { formatLocalDate } from '../../../utils/timeUtils';
import { useToast } from '../../../contexts/ToastContext';
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
 * - Touch-to-create activities
 * - Drag-to-resize task section
 *
 * @param {Object} props
 * @param {Date} props.currentWeek - Current week to display
 * @param {Function} props.onWeekChange - Callback when week changes
 */
const MobileOverview = ({ currentWeek, onWeekChange }) => {
  const { showSuccess, showError } = useToast();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [activities, setActivities] = useState({});
  const [homework, setHomework] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
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

  // Load family members
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

  // Load activities and homework
  const loadData = useCallback(async () => {
    if (familyMembers.length === 0) return;

    setIsLoadingActivities(true);
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
          activity.response_status === 'declined'
        ) {
          return;
        }

        if (!activitiesByMember[activity.member_id]) {
          activitiesByMember[activity.member_id] = [];
        }

        activitiesByMember[activity.member_id].push({
          id: activity.id,
          memberId: activity.member_id,
          title: activity.title,
          date: activity.date,
          startTime: activity.start_time,
          endTime: activity.end_time,
          description: activity.description,
          source: activity.source || 'manual',
          location_name: activity.location_name,
          is_cancelled: activity.is_cancelled,
        });
      });

      setActivities(activitiesByMember);

      // Load homework
      const homeworkData = {};
      for (const member of familyMembers) {
        const memberHomework = await dataService.getHomework({
          member_id: member.id,
          week_start_date: startDateStr,
        });
        homeworkData[member.id] = memberHomework;
      }
      setHomework(homeworkData);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [familyMembers, getWeekStart]);

  useEffect(() => {
    loadData();
  }, [loadData, currentWeek]);

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    onWeekChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    onWeekChange(newDate);
  };

  const handleToday = () => {
    onWeekChange(new Date());
  };

  const getWeekDisplay = () => {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const formatDate = date => {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    };

    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  const handleDeleteActivity = async activityId => {
    try {
      await dataService.deleteActivity(activityId);

      // Update local state
      setActivities(prev => {
        const updated = {};
        Object.keys(prev).forEach(memberId => {
          updated[memberId] = prev[memberId].filter(a => a.id !== activityId);
        });
        return updated;
      });

      showSuccess('Activity deleted');
    } catch (error) {
      console.error('Error deleting activity:', error);
      showError('Failed to delete activity');
    }
  };

  const handleDeleteTask = async (memberId, taskId) => {
    try {
      await dataService.deleteHomework(taskId);

      // Update local state
      setHomework(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).filter(hw => hw.id !== taskId),
      }));

      showSuccess('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task');
    }
  };

  if (isLoading) {
    return (
      <div className="mobile-overview">
        <MobileHeader
          variant="overview"
          leftSlot={
            <div className="mobile-overview-logo">
              <HomeDashIcon size={28} color="white" />
            </div>
          }
          centerSlot={
            <div className="mobile-overview-week">
              <div className="mobile-week-display">
                <span className="mobile-week-text">Loading...</span>
              </div>
            </div>
          }
          rightSlot={<div style={{ width: '40px' }} />}
        />
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
      {/* Header */}
      <MobileHeader
        variant="overview"
        leftSlot={
          <div className="mobile-overview-logo">
            <HomeDashIcon size={28} color="white" />
          </div>
        }
        centerSlot={
          <div className="mobile-overview-week">
            <button
              className="mobile-week-nav-button"
              onClick={handlePreviousWeek}
              aria-label="Previous week"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button
              className="mobile-week-display"
              onClick={handleToday}
              aria-label="Go to today"
            >
              <span className="mobile-week-text">{getWeekDisplay()}</span>
            </button>

            <button
              className="mobile-week-nav-button"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        }
        rightSlot={<div style={{ width: '40px' }} />}
      />

      {/* Person Carousel */}
      <PersonCarousel
        members={familyMembers}
        currentIndex={currentPersonIndex}
        onIndexChange={setCurrentPersonIndex}
        renderMember={(member, isActive) => (
          <MobilePersonCard
            member={member}
            activities={activities[member.id] || []}
            homework={homework[member.id] || []}
            weekStart={getWeekStart()}
            onDeleteActivity={handleDeleteActivity}
            onDeleteTask={handleDeleteTask}
            isActive={isActive}
          />
        )}
      />
    </div>
  );
};

export default MobileOverview;
