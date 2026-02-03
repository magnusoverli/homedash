import { useState, useEffect, useRef, useCallback } from 'react';
import ActivityBlock from './ActivityBlock';
import { formatLocalDate } from '../utils/timeUtils';
import './WeekCalendar.css';

const WeekCalendar = ({
  activities,
  members,
  memberMap,
  weekStart,
  onAddActivity,
  onDeleteActivity,
}) => {
  const [dayColumns, setDayColumns] = useState([]);
  const weekGridRef = useRef(null);
  const [dynamicPixelsPerHour, setDynamicPixelsPerHour] = useState(54);

  const timeSlots = [];
  const startHour = 8;
  const endHour = 20;
  const totalHours = endHour - startHour;

  for (let hour = startHour; hour <= endHour; hour++) {
    timeSlots.push(hour);
  }

  // Get the member color for an activity
  const getMemberColor = activity => {
    if (!activity.memberId) return '#B2AEFF'; // Default pastel purple
    const member = memberMap[activity.memberId];
    return member?.color || '#B2AEFF';
  };

  useEffect(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    setDayColumns(days);
  }, [weekStart]);

  // Calculate dynamic pixels per hour based on week-grid height
  useEffect(() => {
    const updateDynamicScaling = () => {
      if (weekGridRef.current) {
        const weekGridHeight = weekGridRef.current.clientHeight;
        const availableTimeGridHeight = weekGridHeight - 60;
        const newPixelsPerHour = Math.max(
          20,
          availableTimeGridHeight / totalHours
        );
        setDynamicPixelsPerHour(newPixelsPerHour);
      }
    };

    const timeoutId = setTimeout(updateDynamicScaling, 10);

    const handleResize = () => {
      setTimeout(updateDynamicScaling, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [totalHours]);

  const getDayActivities = useCallback(
    date => {
      return activities.filter(activity => {
        const [year, month, day] = activity.date.split('-').map(Number);
        const activityDate = new Date(year, month - 1, day);
        return activityDate.toDateString() === date.toDateString();
      });
    },
    [activities]
  );

  const calculateTopPosition = timeString => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = (hours - startHour) * 60 + minutes;
    return (totalMinutes / 60) * dynamicPixelsPerHour;
  };

  const calculateHeight = (startTime, endTime) => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const durationMinutes =
      endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
    return (durationMinutes / 60) * dynamicPixelsPerHour;
  };

  const handleTimeSlotClick = (date, hour) => {
    const clickedDate = new Date(date);
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

    // Default to first member if available
    const defaultMemberId = members.length > 0 ? members[0].id : null;

    onAddActivity({
      memberId: defaultMemberId,
      date: formatLocalDate(clickedDate),
      startTime,
      endTime,
      title: '',
      category: 'personal',
    });
  };

  const formatDayLabel = date => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    return { dayName, dayNumber };
  };

  const isToday = date => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check for overlapping activities - now considers ALL activities, not per-member
  const checkOverlaps = dayActivities => {
    const overlaps = [];
    for (let i = 0; i < dayActivities.length; i++) {
      const overlappingActivities = [dayActivities[i]];
      for (let j = i + 1; j < dayActivities.length; j++) {
        const a = dayActivities[i];
        const b = dayActivities[j];

        const aStart = a.startTime.split(':').map(Number);
        const aEnd = a.endTime.split(':').map(Number);
        const bStart = b.startTime.split(':').map(Number);
        const bEnd = b.endTime.split(':').map(Number);

        const aStartMin = aStart[0] * 60 + aStart[1];
        const aEndMin = aEnd[0] * 60 + aEnd[1];
        const bStartMin = bStart[0] * 60 + bStart[1];
        const bEndMin = bEnd[0] * 60 + bEnd[1];

        if (aStartMin < bEndMin && aEndMin > bStartMin) {
          overlappingActivities.push(dayActivities[j]);
        }
      }

      if (overlappingActivities.length > 1) {
        overlaps.push(overlappingActivities);
      }
    }
    return overlaps;
  };

  return (
    <div className="week-calendar" ref={weekGridRef}>
      <div className="week-calendar-grid">
        {/* Time column */}
        <div className="time-labels-column">
          <div className="time-label-header"></div>
          <div
            className="time-labels"
            style={{
              '--dynamic-pixels-per-hour': `${dynamicPixelsPerHour}px`,
            }}
          >
            {timeSlots.map(hour => (
              <div
                key={hour}
                className="time-label"
                style={{ height: `${dynamicPixelsPerHour}px` }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        {dayColumns.map((date, index) => {
          const dayInfo = formatDayLabel(date);
          const dayActivities = getDayActivities(date);
          const overlaps = checkOverlaps(dayActivities);

          return (
            <div
              key={index}
              className={`day-column ${isToday(date) ? 'today' : ''}`}
            >
              <div className="day-header">
                <div className="day-name">{dayInfo.dayName}</div>
                <div className="day-number">{dayInfo.dayNumber}</div>
              </div>

              <div
                className="time-grid-column"
                style={{
                  '--dynamic-pixels-per-hour': `${dynamicPixelsPerHour}px`,
                }}
              >
                {timeSlots.map(hour => (
                  <div
                    key={hour}
                    className="time-slot"
                    style={{ height: `${dynamicPixelsPerHour}px` }}
                    onClick={() => handleTimeSlotClick(date, hour)}
                  />
                ))}

                <div className="activities-layer">
                  {dayActivities.map((activity, actIndex) => {
                    const isOverlapping = overlaps.some(group =>
                      group.includes(activity)
                    );
                    const overlapIndex = isOverlapping
                      ? overlaps
                          .find(group => group.includes(activity))
                          .indexOf(activity)
                      : 0;
                    const overlapCount = isOverlapping
                      ? overlaps.find(group => group.includes(activity)).length
                      : 1;

                    // Get member color for activity background
                    const memberColor = getMemberColor(activity);

                    return (
                      <ActivityBlock
                        key={activity.id || actIndex}
                        activity={activity}
                        top={calculateTopPosition(activity.startTime)}
                        height={calculateHeight(
                          activity.startTime,
                          activity.endTime
                        )}
                        isOverlapping={isOverlapping}
                        overlapIndex={overlapIndex}
                        overlapCount={overlapCount}
                        onDelete={() => {
                          if (!activity.id) {
                            console.error(
                              'Cannot delete activity without ID:',
                              activity
                            );
                            return;
                          }
                          onDeleteActivity(activity.id);
                        }}
                        customColor={memberColor}
                        memberMap={memberMap}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekCalendar;
