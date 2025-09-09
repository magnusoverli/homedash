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
    return minutes === 0
      ? `${hours.toString().padStart(2, '0')}:00`
      : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const isSchoolScheduleActivity = () => {
    return activity.description && activity.description.includes('[TYPE:school_schedule]');
  };

  const isSchoolActivity = () => {
    return activity.description && activity.description.includes('[TYPE:school_activity]');
  };

  const isSchoolRelated = () => {
    return isSchoolScheduleActivity() || isSchoolActivity();
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

  const normalizeNote = note => {
    if (!note) return note;
    
    const lowerNote = note.toLowerCase();
    
    // Normalize PE-related terms to "Gym"
    if (lowerNote.includes('kropps') || 
        lowerNote.includes('gym') || 
        lowerNote.includes('pe')) {
      return 'Gym';
    }
    
    // Filter out regular school subjects that shouldn't be notes
    const regularSubjects = ['krle', 'matte', 'matematikk', 'norsk', 'engelsk', 'naturfag', 'samfunnsfag'];
    if (regularSubjects.includes(lowerNote)) {
      return null; // Return null to filter out
    }
    
    // Add other normalizations as needed in the future
    // e.g., swimming, outdoor school, etc.
    
    return note;
  };

  const parseNotes = notes => {
    if (!notes) return [];
    
    // Handle special cases first before splitting
    const lowerNotes = notes.toLowerCase();
    
    // Special handling for "gym/krle" - should only return "Gym"
    if (lowerNotes === 'gym/krle') {
      return ['Gym'];
    }
    
    // Split notes by common separators and normalize each
    const noteList = notes
      .split(/[,/&+]/) // Split by comma, slash, ampersand, or plus
      .map(note => note.trim())
      .filter(note => note.length > 0)
      .map(note => normalizeNote(note))
      .filter(note => note !== null); // Remove filtered out subjects
    
    return noteList;
  };

  const handleClick = e => {
    e.stopPropagation();
    if (!activity.title) {
      // Empty activities no longer trigger edit modal
      return;
    } else {
      setShowActions(!showActions);
    }
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
        {isSchoolScheduleActivity() && height >= 60 && (
          <div className="activity-end-time">{formatTime(activity.endTime)}</div>
        )}
      </div>

      {/* Notes positioned in the middle-left of the activity block */}
      {isSchoolScheduleActivity() && activity.notes && height >= 60 && (
        <div className="activity-notes-container">
          {parseNotes(activity.notes).map((note, index) => (
            <div key={index} className="activity-note-badge">
              {note}
            </div>
          ))}
        </div>
      )}

      {showActions && activity.title && (
        <div className="activity-actions">
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
          {activity.notes && (
            <div className="tooltip-notes">
              Notes: {parseNotes(activity.notes).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityBlock;
