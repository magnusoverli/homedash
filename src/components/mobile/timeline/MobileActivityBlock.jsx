import { useState, useRef, useEffect } from 'react';
import { getActivityColor, getActivityIcon } from '../../../utils/activityUtils';
import './MobileActivityBlock.css';

/**
 * Mobile Activity Block
 * 
 * Touch-optimized activity block for timeline.
 * Supports tap to view, long-press for actions, swipe to delete.
 * 
 * @param {Object} props
 * @param {Object} props.activity - Activity object
 * @param {Function} props.onEdit - Callback when activity is tapped
 * @param {Function} props.onDelete - Callback when activity is deleted
 */
const MobileActivityBlock = ({ activity, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const blockRef = useRef(null);
  const startXRef = useRef(0);

  // Calculate block height based on duration
  const getBlockHeight = () => {
    if (!activity.startTime || !activity.endTime) return 60;
    
    const [startHour, startMin] = activity.startTime.split(':').map(Number);
    const [endHour, endMin] = activity.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;
    
    return Math.max(durationMinutes, 30); // Minimum 30px
  };

  // Calculate block position within hour slot
  const getBlockOffset = () => {
    if (!activity.startTime) return 0;
    
    const [, startMin] = activity.startTime.split(':').map(Number);
    return startMin; // px offset from hour start
  };

  // Get activity color
  const backgroundColor = getActivityColor(activity);
  const icon = getActivityIcon(activity);

  // Long press handlers
  const handleTouchStart = (e) => {
    const timer = setTimeout(() => {
      setShowActions(true);
      if (navigator.vibrate) {
        navigator.vibrate([10, 50, 10]);
      }
    }, 500);
    
    setLongPressTimer(timer);
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startXRef.current;
    
    // Only allow left swipe
    if (deltaX < 0) {
      setIsDragging(true);
      setSwipeX(Math.max(deltaX, -80));
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (isDragging) {
      // If swiped more than half, trigger delete
      if (swipeX < -40) {
        handleDelete();
      } else {
        setSwipeX(0);
      }
      setIsDragging(false);
    } else if (!showActions) {
      // Normal tap - edit
      handleEdit();
    }
  };

  const handleEdit = () => {
    setShowActions(false);
    onEdit();
  };

  const handleDelete = () => {
    setShowActions(false);
    onDelete();
  };

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (blockRef.current && !blockRef.current.contains(e.target)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showActions]);

  // Get display text based on size
  const getDisplayText = () => {
    const height = getBlockHeight();
    
    if (height < 40) {
      // Very small - icon only
      return null;
    } else if (height < 60) {
      // Small - title only
      return <span className="mobile-activity-title">{activity.title}</span>;
    } else {
      // Large - title + time
      return (
        <>
          <span className="mobile-activity-title">{activity.title}</span>
          <span className="mobile-activity-time">
            {activity.startTime} - {activity.endTime}
          </span>
        </>
      );
    }
  };

  const height = getBlockHeight();
  const offset = getBlockOffset();

  return (
    <div
      ref={blockRef}
      className={`mobile-activity-block ${showActions ? 'mobile-activity-block--actions' : ''} ${isDragging ? 'mobile-activity-block--dragging' : ''}`}
      style={{
        backgroundColor,
        height: `${height}px`,
        top: `${offset}px`,
        transform: `translateX(${swipeX}px)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => !showActions && handleEdit()}
      role="button"
      aria-label={`${activity.title} at ${activity.startTime}`}
    >
      <div className="mobile-activity-content">
        {icon && <span className="mobile-activity-icon">{icon}</span>}
        {getDisplayText()}
        
        {/* Source indicator */}
        {activity.source === 'spond' && (
          <span className="mobile-activity-badge" title="From Spond">⚽</span>
        )}
        {activity.is_cancelled && (
          <span className="mobile-activity-badge mobile-activity-badge--cancelled" title="Cancelled">❌</span>
        )}
      </div>

      {/* Swipe delete indicator */}
      <div className="mobile-activity-delete-bg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </div>

      {/* Action buttons (long press) */}
      {showActions && (
        <div className="mobile-activity-actions">
          <button
            className="mobile-activity-action mobile-activity-action--edit"
            onClick={handleEdit}
          >
            Edit
          </button>
          <button
            className="mobile-activity-action mobile-activity-action--delete"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileActivityBlock;


