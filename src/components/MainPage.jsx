import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import PersonCard from './PersonCard';
import ActivityModal from './ActivityModal';
import dataService from '../services/dataService';
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

  // Helper function to get week start
  const getWeekStart = useCallback(() => {
    const weekStart = new Date(currentWeek);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    return weekStart;
  }, [currentWeek]);

  // Load family members from API
  useEffect(() => {
    const loadFamilyMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const members = await dataService.getFamilyMembers();
        // Map backend 'color' field to frontend 'avatarColor'
        const mappedMembers = members.map(m => ({
          ...m,
          avatarColor: m.color,
        }));
        setFamilyMembers(mappedMembers);
        setError('');
      } catch (error) {
        console.error('Error loading family members:', error);
        setError('Failed to load family members');
        // Fallback to localStorage
        const savedMembers = localStorage.getItem('familyMembers');
        if (savedMembers) {
          setFamilyMembers(JSON.parse(savedMembers));
        }
      } finally {
        setIsLoadingMembers(false);
      }
    };
    loadFamilyMembers();
  }, []);

  // Load activities from API when week changes
  useEffect(() => {
    const loadActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const weekStart = getWeekStart();
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const activitiesData = await dataService.getActivities({
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
        });

        // Convert flat API data to nested structure for compatibility
        const structuredActivities = {};
        const weekKey = getWeekKey(currentWeek);
        structuredActivities[weekKey] = {};

        activitiesData.forEach(activity => {
          if (!structuredActivities[weekKey][activity.member_id]) {
            structuredActivities[weekKey][activity.member_id] = [];
          }
          structuredActivities[weekKey][activity.member_id].push({
            id: activity.id,
            memberId: activity.member_id,
            title: activity.title,
            date: activity.date,
            startTime: activity.start_time,
            endTime: activity.end_time,
            description: activity.description,
            notes: activity.notes,
          });
        });

        setActivities(structuredActivities);
        setError('');
      } catch (error) {
        console.error('Error loading activities:', error);
        // Fallback to localStorage
        const savedActivities = localStorage.getItem('activities');
        if (savedActivities) {
          setActivities(JSON.parse(savedActivities));
        }
      } finally {
        setIsLoadingActivities(false);
      }
    };

    loadActivities();
  }, [currentWeek, getWeekStart]);

  // Load homework for all family members
  const loadHomework = useCallback(async () => {
    if (familyMembers.length === 0) {
      setIsLoadingHomework(false);
      return;
    }

    setIsLoadingHomework(true);
    try {
      const homeworkData = {};
      
      // Load homework for each family member
      for (const member of familyMembers) {
        const memberHomework = await dataService.getHomework({ member_id: member.id });
        console.log(`MainPage loaded homework for ${member.name} (${member.id}):`, memberHomework);
        homeworkData[member.id] = memberHomework;
      }
      console.log('MainPage final homework data:', homeworkData);
      setHomework(homeworkData);
      setError('');
    } catch (error) {
      console.error('Error loading homework:', error);
      // Don't set error state for homework failure - it's not critical
    } finally {
      setIsLoadingHomework(false);
    }
  }, [familyMembers]);

  useEffect(() => {
    loadHomework();
  }, [loadHomework]);

  // Refresh homework when navigating back to main page (e.g., from settings)
  useEffect(() => {
    // Only reload homework if we're on the main page and have family members
    if (location.pathname === '/' && familyMembers.length > 0) {
      loadHomework();
    }
  }, [location.pathname, loadHomework, familyMembers]);

  // Also refresh homework when page regains focus (for tab switching)
  useEffect(() => {
    const handleFocus = () => {
      // Only reload if we have family members and are on main page
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
    return weekStart.toISOString().split('T')[0];
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
      [memberId]: (prevHomework[memberId] || []).filter(hw => hw.id !== deletedHomeworkId)
    }));
  };

  const handleAddActivity = activityData => {
    setEditingActivity(activityData);
    setShowActivityModal(true);
  };


  const handleDeleteActivity = async (memberId, activityId) => {
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
      // Still update local state as fallback
      const weekKey = getWeekKey(currentWeek);
      setActivities(prev => {
        const updated = { ...prev };
        if (updated[weekKey] && updated[weekKey][memberId]) {
          updated[weekKey][memberId] = updated[weekKey][memberId].filter(
            a => a.id !== activityId
          );
        }
        localStorage.setItem('activities', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleSaveActivity = async activityData => {
    const weekKey = getWeekKey(currentWeek);
    const memberId = activityData.memberId;

    try {
      let savedActivity;
      if (activityData.id) {
        // Update existing activity
        savedActivity = await dataService.updateActivity(activityData.id, {
          title: activityData.title,
          date: activityData.date,
          start_time: activityData.startTime,
          end_time: activityData.endTime,
          description: activityData.description || '',
        });
      } else {
        // Create new activity
        savedActivity = await dataService.createActivity({
          member_id: memberId,
          title: activityData.title,
          date: activityData.date,
          start_time: activityData.startTime,
          end_time: activityData.endTime,
          description: activityData.description || '',
        });
      }

      // Update local state with API response
      const formattedActivity = {
        id: savedActivity.id,
        memberId: savedActivity.member_id,
        title: savedActivity.title,
        date: savedActivity.date,
        startTime: savedActivity.start_time,
        endTime: savedActivity.end_time,
        description: savedActivity.description,
      };

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
            a.id === formattedActivity.id ? formattedActivity : a
          );
        } else {
          updated[weekKey][memberId].push(formattedActivity);
        }

        return updated;
      });
    } catch (error) {
      console.error('Error saving activity:', error);
      // Fallback to localStorage
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
            a.id === activityData.id ? activityData : a
          );
        } else {
          activityData.id = Date.now().toString();
          updated[weekKey][memberId].push(activityData);
        }

        localStorage.setItem('activities', JSON.stringify(updated));
        return updated;
      });
    }

    setShowActivityModal(false);
    setEditingActivity(null);
  };

  return (
    <main className="main-page">
      <div className="container">
        {isLoadingMembers || isLoadingActivities || isLoadingHomework ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading your weekly schedule...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Something went wrong</h2>
            <p className="error-text">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        ) : familyMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👨‍👩‍👧‍👦</div>
            <h2 className="empty-state-title">No Family Members Yet</h2>
            <p className="empty-state-text">
              Go to Settings to add family members and start planning your week!
            </p>
          </div>
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
