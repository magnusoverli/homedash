import { useState } from 'react';
import MobileTimeline from './MobileTimeline';
import MobileTaskList from './MobileTaskList';
import './MobilePersonCard.css';

/**
 * Mobile Person Card
 *
 * Card containing a person's weekly schedule with timeline and tasks.
 * Includes drag-to-resize functionality for timeline/task split.
 * Read-only view for mobile devices.
 *
 * @param {Object} props
 * @param {Object} props.member - Family member object
 * @param {Array} props.activities - Activities for this member
 * @param {Array} props.homework - Homework/tasks for this member
 * @param {Date} props.weekStart - Start date of current week
 * @param {Function} props.onDeleteActivity - Callback to delete activity
 * @param {Function} props.onDeleteTask - Callback to delete task
 * @param {boolean} props.isActive - Whether this card is currently visible
 */
const MobilePersonCard = ({
  member,
  activities = [],
  homework = [],
  weekStart,
  onDeleteActivity,
  onDeleteTask,
  isActive = false,
}) => {
  // Load saved split ratio or use default (70/30)
  const savedRatio = localStorage.getItem(`mobile-split-${member.id}`);
  const [splitRatio, setSplitRatio] = useState(
    savedRatio ? parseInt(savedRatio) : 70
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startRatio, setStartRatio] = useState(70);

  // Handle drag start
  const handleDragStart = e => {
    setIsDragging(true);
    setStartY(e.type === 'mousedown' ? e.clientY : e.touches[0].clientY);
    setStartRatio(splitRatio);
    setDragOffset(0);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // Handle drag move
  const handleDragMove = e => {
    if (!isDragging) return;

    // Prevent default to stop pull-to-refresh
    e.preventDefault();

    // Also prevent pull-to-refresh on touch devices
    if (e.cancelable) {
      e.stopPropagation();
    }

    const currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
    const deltaY = currentY - startY;

    // Calculate available height (viewport - header - tab bar)
    const availableHeight = window.innerHeight - 56 - 56;
    const deltaPercent = (deltaY / availableHeight) * 100;

    // Calculate new ratio (constrained between 50 and 90)
    let newRatio = startRatio + deltaPercent;
    newRatio = Math.max(50, Math.min(90, newRatio));

    // Store offset for transform (smooth visual update)
    setDragOffset(deltaY);
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (isDragging) {
      setIsDragging(false);

      // Calculate final ratio from drag offset
      const availableHeight = window.innerHeight - 56 - 56;
      const deltaPercent = (dragOffset / availableHeight) * 100;
      let newRatio = startRatio + deltaPercent;
      newRatio = Math.max(50, Math.min(90, newRatio));

      // Snap to common values
      const snapPoints = [50, 60, 70, 80, 90];
      const closestSnap = snapPoints.reduce((prev, curr) =>
        Math.abs(curr - newRatio) < Math.abs(prev - newRatio) ? curr : prev
      );

      if (Math.abs(closestSnap - newRatio) < 5) {
        newRatio = closestSnap;
      }

      // Update final ratio
      setSplitRatio(Math.round(newRatio));
      setDragOffset(0);

      // Save preference
      localStorage.setItem(
        `mobile-split-${member.id}`,
        Math.round(newRatio).toString()
      );

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  return (
    <div className="mobile-person-card">
      {/* Header */}
      <div className="mobile-person-header">
        <h2 className="mobile-person-name">{member.name}</h2>
      </div>

      {/* Content area with split view */}
      <div className="mobile-person-content">
        {/* Timeline section */}
        <div
          className="mobile-person-timeline-section"
          style={{
            height: isDragging
              ? `calc(${splitRatio}% + ${dragOffset}px)`
              : `${splitRatio}%`,
            transition: isDragging ? 'none' : 'height 200ms ease-in-out',
          }}
        >
          <MobileTimeline
            member={member}
            activities={activities}
            weekStart={weekStart}
            isActive={isActive}
          />
        </div>

        {/* Tasks section (with integrated drag handle in header) */}
        <div
          className="mobile-person-tasks-section"
          style={{
            height: isDragging
              ? `calc(${100 - splitRatio}% - ${dragOffset}px)`
              : `${100 - splitRatio}%`,
            transition: isDragging ? 'none' : 'height 200ms ease-in-out',
          }}
        >
          <MobileTaskList
            member={member}
            tasks={homework}
            onDeleteTask={onDeleteTask}
            isActive={isActive}
            dragHandleProps={{
              onMouseDown: handleDragStart,
              onMouseMove: handleDragMove,
              onMouseUp: handleDragEnd,
              onMouseLeave: handleDragEnd,
              onTouchStart: handleDragStart,
              onTouchMove: handleDragMove,
              onTouchEnd: handleDragEnd,
              role: 'separator',
              'aria-orientation': 'horizontal',
              'aria-label': 'Resize timeline and homework',
              'aria-valuenow': splitRatio,
              'aria-valuemin': 50,
              'aria-valuemax': 90,
              className: isDragging ? 'mobile-task-header--dragging' : '',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MobilePersonCard;
