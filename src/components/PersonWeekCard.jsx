import { useState, useEffect, useRef, useCallback } from 'react';
import ActivityBlock from './ActivityBlock';
import ScheduleModal from './ScheduleModal';
import './PersonWeekCard.css';

const PersonWeekCard = ({
  member,
  activities,
  homework,
  weekStart,
  onAddActivity,
  onDeleteActivity,
}) => {
  const [dayColumns, setDayColumns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [weekGridHeight, setWeekGridHeight] = useState(70); // percentage
  const containerRef = useRef(null);
  const weekGridRef = useRef(null);
  const [dynamicPixelsPerHour, setDynamicPixelsPerHour] = useState(54);
  const timeSlots = [];
  const startHour = 8;
  const endHour = 20;
  const totalHours = endHour - startHour;

  for (let hour = startHour; hour <= endHour; hour++) {
    timeSlots.push(hour);
  }

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
        
        // Reserve space for day headers (approximately 40px) and padding
        const availableTimeGridHeight = weekGridHeight - 60;
        
        // Calculate pixels per hour to fit all time slots
        const newPixelsPerHour = Math.max(20, availableTimeGridHeight / totalHours);
        setDynamicPixelsPerHour(newPixelsPerHour);
      }
    };

    // Update when week grid height changes
    const timeoutId = setTimeout(updateDynamicScaling, 10);

    // Also update on window resize
    const handleResize = () => {
      setTimeout(updateDynamicScaling, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [weekGridHeight, totalHours]);

  const getDayActivities = date => {
    return activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate.toDateString() === date.toDateString();
    });
  };

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

    onAddActivity({
      memberId: member.id,
      date: clickedDate.toISOString().split('T')[0],
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

  // Standard resizable pane implementation
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    
    const handleMouseMove = (moveEvent) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const relativeY = clientY - containerRect.top;
      
      // Calculate percentage (with constraints)
      const percentage = (relativeY / containerRect.height) * 100;
      const newWeekGridHeight = Math.min(80, Math.max(20, percentage));
      
      setWeekGridHeight(newWeekGridHeight);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);
  }, []);

  // Prevent text selection during drag
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  return (
    <>
      <div 
        className="person-week-card" 
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        <div 
          className="week-grid"
          ref={weekGridRef}
          style={{
            flex: `0 0 ${weekGridHeight}%`,
            minHeight: '200px',
            '--dynamic-pixels-per-hour': `${dynamicPixelsPerHour}px`
          }}
        >
            {dayColumns.map((date, index) => {
              const dayInfo = formatDayLabel(date);
              const dayActivities = getDayActivities(date);
              const overlaps = checkOverlaps(dayActivities);
              const isLastDay = index === 6; // Sunday is the last day

              return (
                <div
                  key={index}
                  className={`day-column ${isToday(date) ? 'today' : ''}`}
                >
                  <div className="day-header">
                    <div className="day-name">{dayInfo.dayName}</div>
                    <div className="day-number">{dayInfo.dayNumber}</div>
                    {isLastDay && (
                      <button
                        className="add-activity-button-overlay"
                        aria-label="Add activity"
                        onClick={() => setIsModalOpen(true)}
                      >
                        +
                      </button>
                    )}
                  </div>

                  <div 
                    className="time-grid-column"
                    style={{
                      '--dynamic-pixels-per-hour': `${dynamicPixelsPerHour}px`
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
                          ? overlaps.find(group => group.includes(activity))
                              .length
                          : 1;

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
                            onDelete={() => onDeleteActivity(activity.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        
        {/* Resize Handle */}
        <div 
          className={`resize-handle ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          aria-label="Resize cards. Drag to adjust proportions"
          role="separator"
          tabIndex={0}
        >
          <div className="resize-handle-indicator">
            <div className="resize-handle-line"></div>
            <div className="resize-handle-line"></div>
            <div className="resize-handle-line"></div>
          </div>
        </div>
        
        <div 
          className="week-homework-card"
          style={{
            flex: '1',
            minHeight: '120px'
          }}
        >
          <div className="homework-header">
            <h3 className="homework-title">Homework</h3>
          </div>
          <div className="homework-content">
            {homework && homework.length > 0 ? (
              <div className="homework-list">
                {homework.map((item, index) => (
                  <div key={index} className="homework-item">
                    <div className="homework-subject">{item.subject}</div>
                    <div className="homework-assignment">{item.assignment}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="homework-placeholder">
                No homework assigned yet...
              </div>
            )}
          </div>
        </div>
      </div>

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${member.name}'s Schedule`}
      >
        {/* Content for schedule management will go here */}
      </ScheduleModal>
    </>
  );
};

export default PersonWeekCard;
