import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import PersonCard from './PersonCard';
import ActivityModal from './ActivityModal';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import dataService from '../services/dataService';
import { formatLocalDate } from '../utils/timeUtils';
import './MainPage.css';

const MainPage = ({ currentWeek }) => {
  const location = useLocation();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [activities, setActivities] = useState({});
  const [homework, setHomework] = useState({});
  const [editingActivity, setEditingActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingHomework, setIsLoadingHomework] = useState(true);
  const [error, setError] = useState('');

  const getWeekStart = useCallback(() => {
    const weekStart = new Date(currentWeek);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    return weekStart;
  }, [currentWeek]);

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
    loadFamilyMembers();
  }, []);

  useEffect(() => {
    const loadActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const weekStart = getWeekStart();
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startDateStr = formatLocalDate(weekStart);
        const endDateStr = formatLocalDate(weekEnd);

        const activitiesData = await dataService.getActivities({
          startDate: startDateStr,
          endDate: endDateStr,
        });

        const structuredActivities = {};
        const weekKey = getWeekKey(currentWeek);
        structuredActivities[weekKey] = {};

        activitiesData.forEach(activity => {
          if (
            activity.source === 'spond' &&
            activity.responseStatus === 'declined'
          ) {
            return;
          }

          if (!structuredActivities[weekKey][activity.memberId]) {
            structuredActivities[weekKey][activity.memberId] = [];
          }
          structuredActivities[weekKey][activity.memberId].push(activity);
        });

        if (familyMembers.length > 0) {
          const syncPromises = familyMembers.map(async member => {
            try {
              const syncStatus = await dataService.checkSpondSyncStatus(
                member.id,
                5
              );

              if (syncStatus.needsSync) {
                console.log(
                  `🔄 Syncing Spond for ${member.name}: ${syncStatus.reason}`
                );
                await dataService.syncSpondActivities(
                  member.id,
                  startDateStr,
                  endDateStr
                );
              } else {
                console.log(
                  `✅ Spond data fresh for ${member.name}: ${syncStatus.reason}`
                );
              }
            } catch (error) {
              console.warn(
                `Background sync check/update failed for ${member.name}:`,
                error
              );
            }
          });

          Promise.all(syncPromises).then(async () => {
            try {
              const refreshedActivitiesData = await dataService.getActivities({
                startDate: startDateStr,
                endDate: endDateStr,
              });

              const refreshedStructuredActivities = {};
              const weekKey = getWeekKey(currentWeek);
              refreshedStructuredActivities[weekKey] = {};

              refreshedActivitiesData.forEach(activity => {
                if (
                  activity.source === 'spond' &&
                  activity.responseStatus === 'declined'
                ) {
                  return;
                }

                if (
                  !refreshedStructuredActivities[weekKey][activity.memberId]
                ) {
                  refreshedStructuredActivities[weekKey][activity.memberId] =
                    [];
                }
                refreshedStructuredActivities[weekKey][activity.memberId].push(
                  activity
                );
              });

              setActivities(refreshedStructuredActivities);
            } catch (error) {
              console.error(
                '❌ Error refreshing activities after sync:',
                error
              );
            }
          });
        }

        setActivities(structuredActivities);
        setError('');
      } catch (error) {
        console.error('Error loading activities:', error);
        setError(error.message || 'Failed to load activities');
      } finally {
        setIsLoadingActivities(false);
      }
    };

    loadActivities();
  }, [currentWeek, getWeekStart, familyMembers]);

  const loadHomework = useCallback(async () => {
    if (familyMembers.length === 0) {
      setIsLoadingHomework(false);
      return;
    }

    setIsLoadingHomework(true);
    try {
      const weekStart = getWeekStart();
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
      setError('');
    } catch (error) {
      console.error('Error loading homework:', error);
    } finally {
      setIsLoadingHomework(false);
    }
  }, [familyMembers, getWeekStart]);

  useEffect(() => {
    loadHomework();
  }, [loadHomework, currentWeek]);

  useEffect(() => {
    if (location.pathname === '/' && familyMembers.length > 0) {
      loadHomework();
    }
  }, [location.pathname, loadHomework, familyMembers]);

  useEffect(() => {
    const handleFocus = () => {
      if (familyMembers.length > 0 && location.pathname === '/') {
        loadHomework();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadHomework, familyMembers, location.pathname]);

  const getWeekKey = date => {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    return formatLocalDate(weekStart);
  };

  const getMemberActivities = memberId => {
    const weekKey = getWeekKey(currentWeek);
    const weekActivities = activities[weekKey] || {};
    return weekActivities[memberId] || [];
  };

  const getMemberHomework = memberId => {
    return homework[memberId] || [];
  };

  const handleHomeworkDeleted = (memberId, deletedHomeworkId) => {
    setHomework(prevHomework => ({
      ...prevHomework,
      [memberId]: (prevHomework[memberId] || []).filter(
        hw => hw.id !== deletedHomeworkId
      ),
    }));
  };

  const handleAddActivity = activityData => {
    setEditingActivity(activityData);
    setShowActivityModal(true);
  };

  const handleDeleteActivity = async (memberId, activityId) => {
    if (!activityId) {
      console.error('Cannot delete activity: no ID provided');
      return;
    }

    try {
      await dataService.deleteActivity(activityId);
      const weekKey = getWeekKey(currentWeek);
      setActivities(prev => {
        const updated = { ...prev };
        if (updated[weekKey] && updated[weekKey][memberId]) {
          updated[weekKey][memberId] = updated[weekKey][memberId].filter(
            a => a.id !== activityId
          );
        }
        return updated;
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  };

  const handleSaveActivity = async activityData => {
    const weekKey = getWeekKey(currentWeek);
    const memberId = activityData.memberId;

    try {
      let savedActivity;
      if (activityData.id) {
        savedActivity = await dataService.updateActivity(
          activityData.id,
          activityData
        );
      } else {
        savedActivity = await dataService.createActivity(activityData);
      }

      setActivities(prev => {
        const updated = { ...prev };
        if (!updated[weekKey]) {
          updated[weekKey] = {};
        }
        if (!updated[weekKey][memberId]) {
          updated[weekKey][memberId] = [];
        }

        if (activityData.id) {
          updated[weekKey][memberId] = updated[weekKey][memberId].map(a =>
            a.id === savedActivity.id ? savedActivity : a
          );
        } else {
          updated[weekKey][memberId].push(savedActivity);
        }

        return updated;
      });
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }

    setShowActivityModal(false);
    setEditingActivity(null);
  };

  return (
    <main className="main-page">
      <div className="container">
        {isLoadingMembers || isLoadingActivities || isLoadingHomework ? (
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
          <div className="calendar-grid">
            {familyMembers.slice(0, 3).map(member => (
              <PersonCard
                key={member.id}
                member={member}
                activities={getMemberActivities(member.id)}
                homework={getMemberHomework(member.id)}
                weekStart={getWeekStart()}
                onAddActivity={data =>
                  handleAddActivity({ ...data, memberId: member.id })
                }
                onDeleteActivity={activityId =>
                  handleDeleteActivity(member.id, activityId)
                }
                onHomeworkDeleted={handleHomeworkDeleted}
              />
            ))}
          </div>
        )}
      </div>

      {showActivityModal && (
        <ActivityModal
          activity={editingActivity}
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
