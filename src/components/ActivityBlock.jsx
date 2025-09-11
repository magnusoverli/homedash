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

  const isSpondActivity = () => {
    return activity.source === 'spond';
  };

  const getSpondMatchInfo = () => {
    if (!isSpondActivity() || !activity.raw_data) return null;
    
    try {
      const rawData = JSON.parse(activity.raw_data);
      return rawData.matchInfo || null;
    } catch (e) {
      return null;
    }
  };

  // Debug log for Spond activities
  if (isSpondActivity()) {
    console.log('🎯 Spond activity detected:', {
      title: activity.title,
      source: activity.source,
      hasRawData: !!activity.raw_data,
      matchInfo: getSpondMatchInfo()
    });
  }

  const getHomeAwayIndicator = () => {
    const matchInfo = getSpondMatchInfo();
    if (!matchInfo || !matchInfo.type) return null;
    
    return matchInfo.type === 'HOME' ? '🏠' : '✈️';
  };

  const getAbbreviatedTitle = title => {
    if (!title) return 'New Activity';

    // For Spond activities, allow full title to span multiple lines
    if (isSpondActivity()) {
      if (height < 30) {
        return getActivityIcon();
      } else if (height < 50) {
        // For very small heights, still abbreviate
        const words = title.split(' ');
        if (words.length > 1) {
          return words
            .map(w => w[0])
            .join('')
            .toUpperCase();
        }
        return title.substring(0, 12);
      }
      // For heights >= 50, return full title (will wrap with CSS)
      return title;
    }

    // Original logic for manual activities
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
      data-source={activity.source || 'manual'}
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

      {/* Home/Away indicator for Spond match activities */}
      {isSpondActivity() && getHomeAwayIndicator() && height >= 40 && (
        <div className="spond-match-indicator">
          {getHomeAwayIndicator()}
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

      {/* Tooltip - empty for now */}
      {activity.title && height > 30 && (
        <div className="activity-tooltip">
          {/* Tooltip content will be added later */}
        </div>
      )}
    </div>
  );
};

export default ActivityBlock;
