import { useState, useRef, useEffect } from 'react';
import MobileActivityBlock from './MobileActivityBlock';
import { formatLocalDate } from '../../../utils/timeUtils';
import './MobileTimeline.css';

/**
 * Mobile Timeline
 *
 * Touch-optimized weekly timeline with hourly time scale.
 * Shows activities as colored blocks in read-only mode.
 *
 * @param {Object} props
 * @param {Object} props.member - Family member object
 * @param {Array} props.activities - Activities to display
 * @param {Date} props.weekStart - Start of current week
 * @param {boolean} props.isActive - Whether this timeline is active
 */
const MobileTimeline = ({ member, activities = [], weekStart, isActive }) => {
  const timelineRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Initialize selectedDay to today's index in weekDays array (Mon=0, Sun=6)
  const getTodayIndex = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  };

  const [selectedDay, setSelectedDay] = useState(getTodayIndex());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (isActive && timelineRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollTarget = currentHour * 60; // 60px per hour

      setTimeout(() => {
        if (timelineRef.current) {
          timelineRef.current.scrollTo({
            top: scrollTarget - 100, // Offset to show context
            behavior: 'smooth',
          });
        }
      }, 300);
    }
  }, [isActive]);

  // Get week days
  const getWeekDays = () => {
    const days = [];
    const start = new Date(weekStart);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }

    return days;
  };

  const weekDays = getWeekDays();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get activities for a specific date and hour
  // Only return activities that START in this hour (not those that span it)
  const getActivitiesForSlot = (date, hour) => {
    const dateStr = formatLocalDate(date);

    return activities.filter(activity => {
      if (activity.date !== dateStr) return false;

      const startHour = parseInt(activity.startTime?.split(':')[0] || '0');

      // Only show activity in the hour it starts
      return startHour === hour;
    });
  };

  // Check if slot is current time
  const isCurrentTimeSlot = (date, hour) => {
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear() &&
      hour === now.getHours()
    );
  };

  // Get current time indicator position
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    return hour * 60 + minute; // px from top
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="mobile-timeline-container">
      {/* Day selector */}
      <div className="mobile-day-selector">
        {weekDays.map((day, index) => {
          const dayNum = day.getDay() === 0 ? 6 : day.getDay() - 1; // Convert to Mon=0
          const isToday = day.toDateString() === new Date().toDateString();
          const isSelected = index === selectedDay;

          return (
            <button
              key={index}
              className={`mobile-day-tab ${isSelected ? 'mobile-day-tab--active' : ''} ${isToday ? 'mobile-day-tab--today' : ''}`}
              onClick={() => setSelectedDay(index)}
            >
              <span className="mobile-day-name">{dayNames[dayNum]}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div ref={timelineRef} className="mobile-timeline">
        {/* Time scale */}
        <div className="mobile-time-scale">
          {hours.map(hour => (
            <div key={hour} className="mobile-time-label">
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Activity grid */}
        <div className="mobile-activity-grid">
          {hours.map(hour => {
            const slotActivities = getActivitiesForSlot(
              weekDays[selectedDay],
              hour
            );
            const isCurrentTime = isCurrentTimeSlot(
              weekDays[selectedDay],
              hour
            );

            return (
              <div
                key={hour}
                className={`mobile-timeline-slot ${isCurrentTime ? 'mobile-timeline-slot--current' : ''}`}
              >
                {slotActivities.map(activity => (
                  <MobileActivityBlock key={activity.id} activity={activity} />
                ))}
              </div>
            );
          })}

          {/* Current time indicator */}
          {weekDays[selectedDay].toDateString() ===
            new Date().toDateString() && (
            <div
              className="mobile-current-time-line"
              style={{ top: `${getCurrentTimePosition()}px` }}
            >
              <div className="mobile-current-time-dot" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileTimeline;
