import { useState, useEffect, useCallback, useMemo } from 'react';
import WeekCalendar from './WeekCalendar';
import ActivityModal from './ActivityModal';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import MemberLegend, { SHARED_FILTER_ID } from './MemberLegend';
import dataService from '../services/dataService';
import { formatLocalDate } from '../utils/timeUtils';
import './MainPage.css';

const MainPage = ({ currentWeek }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [calendarSources, setCalendarSources] = useState([]);
  const [activities, setActivities] = useState([]);
  const [editingActivity, setEditingActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [error, setError] = useState('');
  const [activeFilters, setActiveFilters] = useState(null); // null = not initialized yet

  const getWeekStart = useCallback(() => {
    const weekStart = new Date(currentWeek);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    return weekStart;
  }, [currentWeek]);

  const getWeekEnd = useCallback(() => {
    const weekEnd = new Date(getWeekStart());
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekEnd;
  }, [getWeekStart]);

  // Load family members and calendar sources
  useEffect(() => {
    const loadFamilyMembers = async () => {
      setIsLoadingMembers(true);
      setError('');
      try {
        const members = await dataService.getFamilyMembers();
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
        setError(error.message || 'Failed to load family members');
      } finally {
        setIsLoadingMembers(false);
      }
    };

    const loadCalendarSources = async () => {
      try {
        const sources = await dataService.getCalendarSources();
        setCalendarSources(sources || []);
      } catch (error) {
        console.error('Error loading calendar sources:', error);
        // Don't set error state - calendar sources are optional
      }
    };

    loadFamilyMembers();
    loadCalendarSources();
  }, []);

  // Load all activities for the week (not filtered by member)
  useEffect(() => {
    const loadActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const startDateStr = formatLocalDate(getWeekStart());
        const endDateStr = formatLocalDate(getWeekEnd());

        // Fetch ALL activities for the week (no member filter)
        const activitiesData = await dataService.getActivities({
          startDate: startDateStr,
          endDate: endDateStr,
        });

        // Filter out declined Spond activities
        const filteredActivities = activitiesData.filter(
          activity =>
            !(
              activity.source === 'spond' &&
              activity.responseStatus === 'declined'
            )
        );

        setActivities(filteredActivities);

        // Background sync for Spond activities
        if (familyMembers.length > 0) {
          const syncPromises = familyMembers.map(async member => {
            try {
              const syncStatus = await dataService.checkSpondSyncStatus(
                member.id,
                5
              );

              if (syncStatus.needsSync) {
                console.log(
                  `Syncing Spond for ${member.name}: ${syncStatus.reason}`
                );
                await dataService.syncSpondActivities(
                  member.id,
                  startDateStr,
                  endDateStr
                );
              }
            } catch (error) {
              console.warn(
                `Background sync check/update failed for ${member.name}:`,
                error
              );
            }
          });

          // After background sync, refresh activities
          Promise.all(syncPromises).then(async () => {
            try {
              const refreshedData = await dataService.getActivities({
                startDate: startDateStr,
                endDate: endDateStr,
              });

              const refreshedFiltered = refreshedData.filter(
                activity =>
                  !(
                    activity.source === 'spond' &&
                    activity.responseStatus === 'declined'
                  )
              );

              setActivities(refreshedFiltered);
            } catch (error) {
              console.error('Error refreshing activities after sync:', error);
            }
          });
        }

        setError('');
      } catch (error) {
        console.error('Error loading activities:', error);
        setError(error.message || 'Failed to load activities');
      } finally {
        setIsLoadingActivities(false);
      }
    };

    loadActivities();
  }, [currentWeek, getWeekStart, getWeekEnd, familyMembers]);

  const handleAddActivity = activityData => {
    setEditingActivity(activityData);
    setShowActivityModal(true);
  };

  const handleDeleteActivity = async activityId => {
    if (!activityId) {
      console.error('Cannot delete activity: no ID provided');
      return;
    }

    try {
      await dataService.deleteActivity(activityId);
      setActivities(prev => prev.filter(a => a.id !== activityId));
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  };

  const handleSaveActivity = async activityData => {
    try {
      let savedActivity;
      if (activityData.id) {
        savedActivity = await dataService.updateActivity(
          activityData.id,
          activityData
        );
        setActivities(prev =>
          prev.map(a => (a.id === savedActivity.id ? savedActivity : a))
        );
      } else {
        savedActivity = await dataService.createActivity(activityData);
        setActivities(prev => [...prev, savedActivity]);
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }

    setShowActivityModal(false);
    setEditingActivity(null);
  };

  // Initialize filters when family members are loaded
  useEffect(() => {
    if (familyMembers.length > 0 && activeFilters === null) {
      // Start with all filters active (all members + shared)
      const initialFilters = new Set(familyMembers.map(m => m.id));
      initialFilters.add(SHARED_FILTER_ID);
      setActiveFilters(initialFilters);
    }
  }, [familyMembers, activeFilters]);

  // Create a member lookup map for the calendar to use
  const memberMap = familyMembers.reduce((acc, member) => {
    acc[member.id] = member;
    return acc;
  }, {});

  // Create a calendar sources lookup map
  const calendarSourcesMap = calendarSources.reduce((acc, source) => {
    acc[source.id] = source;
    return acc;
  }, {});

  // Filter activities based on active filters
  const filteredActivities = useMemo(() => {
    if (!activeFilters || activeFilters.size === 0) {
      return []; // No filters active = show nothing
    }

    return activities.filter(activity => {
      if (activity.memberId) {
        // Member-specific activity
        return activeFilters.has(activity.memberId);
      } else {
        // Shared/family-wide activity (no memberId)
        return activeFilters.has(SHARED_FILTER_ID);
      }
    });
  }, [activities, activeFilters]);

  const handleFilterChange = newFilters => {
    setActiveFilters(newFilters);
  };

  return (
    <main className="main-page">
      <div className="container">
        {isLoadingMembers || isLoadingActivities ? (
          <LoadingState text="Loading your weekly schedule..." />
        ) : error ? (
          <ErrorState
            title="Something went wrong"
            message={error}
            onRetry={() => window.location.reload()}
          />
        ) : familyMembers.length === 0 ? (
          <EmptyState
            icon="👨‍👩‍👧‍👦"
            title="No Family Members Yet"
            message="Go to Settings to add family members and start planning your week!"
          />
        ) : (
          <div className="calendar-container">
            <MemberLegend
              members={familyMembers}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
            />
            <WeekCalendar
              activities={filteredActivities}
              members={familyMembers}
              memberMap={memberMap}
              calendarSourcesMap={calendarSourcesMap}
              weekStart={getWeekStart()}
              onAddActivity={handleAddActivity}
              onDeleteActivity={handleDeleteActivity}
            />
          </div>
        )}
      </div>

      {showActivityModal && (
        <ActivityModal
          activity={editingActivity}
          members={familyMembers}
          onSave={handleSaveActivity}
          onClose={() => {
            setShowActivityModal(false);
            setEditingActivity(null);
          }}
        />
      )}
    </main>
  );
};

export default MainPage;
