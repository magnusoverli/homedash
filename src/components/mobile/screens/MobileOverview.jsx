import { useState, useEffect, useCallback } from 'react';
import MobileHeader from '../navigation/MobileHeader';
import { HomeDashIcon } from '../../icons';
import LoadingState from '../../LoadingState';
import ErrorState from '../../ErrorState';
import EmptyState from '../../EmptyState';
import PersonCarousel from '../timeline/PersonCarousel';
import MobilePersonCard from '../timeline/MobilePersonCard';
import ActivityBottomSheet from '../modals/ActivityBottomSheet';
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
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [modalPrefilledData, setModalPrefilledData] = useState({});

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
          if (activity.source === 'spond' && activity.response_status === 'declined') {
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
    
    const formatDate = (date) => {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    };
    
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  // Activity handlers
  const handleAddActivity = (activityData) => {
    setEditingActivity(null);
    setModalPrefilledData({
      memberId: activityData.memberId,
      date: activityData.date,
      startTime: activityData.startTime,
    });
    setShowActivityModal(true);
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setModalPrefilledData({});
    setShowActivityModal(true);
  };

  const handleSaveActivity = async (activityData) => {
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
          category: activityData.category || null,
        });
      } else {
        // Create new activity
        savedActivity = await dataService.createActivity({
          member_id: activityData.memberId,
          title: activityData.title,
          date: activityData.date,
          start_time: activityData.startTime,
          end_time: activityData.endTime,
          description: activityData.description || '',
          category: activityData.category || null,
        });
      }

      // Update local state
      const formattedActivity = {
        id: savedActivity.id,
        memberId: savedActivity.member_id,
        title: savedActivity.title,
        date: savedActivity.date,
        startTime: savedActivity.start_time,
        endTime: savedActivity.end_time,
        description: savedActivity.description,
        category: savedActivity.category,
        source: 'manual',
      };

      setActivities(prev => {
        const updated = { ...prev };
        const memberId = formattedActivity.memberId;
        
        if (!updated[memberId]) {
          updated[memberId] = [];
        }

        if (activityData.id) {
          // Update existing
          updated[memberId] = updated[memberId].map(a =>
            a.id === formattedActivity.id ? formattedActivity : a
          );
        } else {
          // Add new
          updated[memberId].push(formattedActivity);
        }

        return updated;
      });

      // Haptic feedback for success
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      // Show success toast
      showSuccess(activityData.id ? 'Activity updated' : 'Activity created');
    } catch (error) {
      console.error('Error saving activity:', error);
      showError('Failed to save activity');
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleDeleteActivity = async (activityId) => {
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
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            <div className="mobile-week-display">
              <span className="mobile-week-text">{getWeekDisplay()}</span>
            </div>
            
            <button 
              className="mobile-week-nav-button"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        }
        rightSlot={
          <button 
            className="mobile-quick-add-button"
            onClick={() => {
              const currentMember = familyMembers[currentPersonIndex];
              if (currentMember) {
                handleAddActivity({
                  memberId: currentMember.id,
                  date: formatLocalDate(new Date()),
                  startTime: new Date().getHours().toString().padStart(2, '0') + ':00',
                });
              }
            }}
            aria-label="Add activity"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        }
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
            onAddActivity={handleAddActivity}
            onEditActivity={handleEditActivity}
            onDeleteActivity={handleDeleteActivity}
            onDeleteTask={handleDeleteTask}
            isActive={isActive}
          />
        )}
      />

      {/* Today Quick Access Button */}
      <button 
        className="mobile-today-fab"
        onClick={handleToday}
        aria-label="Go to today"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
      </button>

      {/* Activity Bottom Sheet Modal */}
      <ActivityBottomSheet
        isOpen={showActivityModal}
        onClose={() => {
          setShowActivityModal(false);
          setEditingActivity(null);
          setModalPrefilledData({});
        }}
        onSave={handleSaveActivity}
        activity={editingActivity}
        members={familyMembers}
        selectedMemberId={modalPrefilledData.memberId}
        prefilledDate={modalPrefilledData.date}
        prefilledStartTime={modalPrefilledData.startTime}
      />
    </div>
  );
};

export default MobileOverview;

