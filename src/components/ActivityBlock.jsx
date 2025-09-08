import { useState } from 'react';
import './ActivityBlock.css';

const CATEGORY_COLORS = {
  work: '#B2AEFF',
  exercise: '#D2FCC3',
  family: '#DEB2FA',
  meal: '#FCDD8C',
  personal: '#BADAF8',
  medical: '#F4B3BB',
  social: '#FFF48D',
  chores: '#ECECEC',
};

const CATEGORY_ICONS = {
  work: '💼',
  exercise: '🏃',
  family: '👨‍👩‍👧',
  meal: '🍽️',
  personal: '⭐',
  medical: '🏥',
  social: '👥',
  chores: '🧹',
};

const ActivityBlock = ({
  activity,
  top,
  height,
  isOverlapping,
  overlapIndex,
  overlapCount,
  onEdit,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);

  const getActivityColor = () => {
    return CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.personal;
  };

  const getActivityIcon = () => {
    return CATEGORY_ICONS[activity.category] || CATEGORY_ICONS.personal;
  };

  const formatTime = timeString => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return minutes === 0
      ? `${displayHours}${period}`
      : `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  const getAbbreviatedTitle = title => {
    if (!title) return 'New Activity';

    if (height < 30) {
      return getActivityIcon();
    } else if (height < 50) {
      const words = title.split(' ');
      if (words.length > 1) {
        return words
          .map(w => w[0])
          .join('')
          .toUpperCase();
      }
      return title.substring(0, 8);
    } else if (height < 80) {
      return title.length > 15 ? title.substring(0, 15) + '...' : title;
    }
    return title;
  };

  const calculatePosition = () => {
    const width = isOverlapping ? `${90 / overlapCount}%` : '90%';
    const left = isOverlapping
      ? `${5 + (overlapIndex * 90) / overlapCount}%`
      : '5%';

    return {
      top: `${top}px`,
      height: `${height}px`,
      width,
      left,
      backgroundColor: getActivityColor(),
    };
  };

  const handleClick = e => {
    e.stopPropagation();
    if (!activity.title) {
      onEdit();
    } else {
      setShowActions(!showActions);
    }
  };

  const handleEdit = e => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = e => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className={`activity-block ${!activity.title ? 'empty-activity' : ''}`}
      style={calculatePosition()}
      onClick={handleClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="activity-content">
        {height >= 40 && (
          <div className="activity-time">{formatTime(activity.startTime)}</div>
        )}
        <div className="activity-title">
          {getAbbreviatedTitle(activity.title)}
        </div>
      </div>

      {showActions && activity.title && (
        <div className="activity-actions">
          <button
            className="activity-action-btn edit-btn"
            onClick={handleEdit}
            aria-label="Edit activity"
          >
            ✏️
          </button>
          <button
            className="activity-action-btn delete-btn"
            onClick={handleDelete}
            aria-label="Delete activity"
          >
            🗑️
          </button>
        </div>
      )}

      {activity.title && height > 30 && (
        <div className="activity-tooltip">
          <div className="tooltip-title">{activity.title}</div>
          <div className="tooltip-time">
            {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
          </div>
          {activity.description && (
            <div className="tooltip-description">{activity.description}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityBlock;
