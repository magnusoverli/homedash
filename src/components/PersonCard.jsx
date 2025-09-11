import { useState } from 'react';
import PersonWeekCard from './PersonWeekCard';
import GenericModal from './GenericModal';
import SettingsIcon from './SettingsIcon';
import './PersonCard.css';

// Available colors for activity blocks (from design manual pastell colors)
const AVAILABLE_COLORS = [
  { name: 'Light Purple', value: '#B2AEFF', hex: '#B2AEFF' },
  { name: 'Light Green', value: '#D2FCC3', hex: '#D2FCC3' },
  { name: 'Light Pink', value: '#DEB2FA', hex: '#DEB2FA' },
  { name: 'Light Orange', value: '#FCDD8C', hex: '#FCDD8C' },
  { name: 'Light Blue', value: '#BADAF8', hex: '#BADAF8' },
  { name: 'Light Salmon', value: '#F4B3BB', hex: '#F4B3BB' },
  { name: 'Light Yellow', value: '#FFF48D', hex: '#FFF48D' },
  { name: 'Light Gray', value: '#ECECEC', hex: '#ECECEC' },
  { name: 'Turquoise', value: '#C1FDFD', hex: '#C1FDFD' },
];

const PersonCard = ({
  member,
  activities,
  homework,
  weekStart,
  onAddActivity,
  onDeleteActivity,
  onHomeworkDeleted,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [colorPreferences, setColorPreferences] = useState(() => {
    // Load saved color preferences or use defaults
    const saved = localStorage.getItem(`color-preferences-${member.id}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Analyze activities to determine what types are present
  const getActivityTypesPresent = () => {
    const typesPresent = new Set();
    
    activities.forEach(activity => {
      let hasSpecificType = false;
      
      // Check for school types first (highest priority)
      if (activity.description) {
        if (activity.description.includes('[TYPE:school_schedule]')) {
          typesPresent.add('school_schedule');
          hasSpecificType = true;
        } else if (activity.description.includes('[TYPE:school_activity]')) {
          typesPresent.add('school_activity');
          hasSpecificType = true;
        }
      }
      
      // Check for category (second priority)
      if (activity.category && !hasSpecificType) {
        typesPresent.add(`category_${activity.category}`);
        hasSpecificType = true;
      }
      
      // Only classify by source if no specific type was found
      if (!hasSpecificType) {
        if (activity.source === 'spond') {
          typesPresent.add('spond');
        } else {
          // Only add 'manual' if it's truly a user-created activity
          // (not school schedule or other imported activities)
          typesPresent.add('manual');
        }
      }
    });
    
    return Array.from(typesPresent);
  };

  const getTypeDisplayInfo = (type) => {
    const typeMap = {
      'manual': { name: 'Manual Activities', description: 'Activities you created manually', icon: '✏️' },
      'spond': { name: 'Spond Activities', description: 'Sports activities from Spond', icon: '⚽' },
      'school_schedule': { name: 'School Schedule', description: 'Regular school periods', icon: '🏫' },
      'school_activity': { name: 'School Activities', description: 'Special school events', icon: '🎓' },
      'category_work': { name: 'Work Activities', description: 'Work-related activities', icon: '💼' },
      'category_exercise': { name: 'Exercise Activities', description: 'Physical activities and sports', icon: '🏃' },
      'category_family': { name: 'Family Activities', description: 'Family time and events', icon: '👨‍👩‍👧' },
      'category_meal': { name: 'Meal Activities', description: 'Eating and food-related', icon: '🍽️' },
      'category_personal': { name: 'Personal Activities', description: 'Personal time and self-care', icon: '⭐' },
      'category_medical': { name: 'Medical Activities', description: 'Health and medical appointments', icon: '🏥' },
      'category_social': { name: 'Social Activities', description: 'Social events and gatherings', icon: '👥' },
      'category_chores': { name: 'Chores', description: 'Household tasks and responsibilities', icon: '🧹' },
    };
    
    return typeMap[type] || { name: type, description: 'Custom activity type', icon: '📅' };
  };

  const handleColorChange = (activityType, color) => {
    const newPreferences = {
      ...colorPreferences,
      [activityType]: color
    };
    setColorPreferences(newPreferences);
    localStorage.setItem(`color-preferences-${member.id}`, JSON.stringify(newPreferences));
  };

  const getCurrentColor = (activityType) => {
    return colorPreferences[activityType] || getDefaultColorForType(activityType);
  };

  const getDefaultColorForType = (type) => {
    const defaultColors = {
      'manual': '#BADAF8', // Light Blue
      'spond': '#D2FCC3', // Light Green
      'school_schedule': '#FFF48D', // Light Yellow
      'school_activity': '#FCDD8C', // Light Orange
      'category_work': '#B2AEFF', // Light Purple
      'category_exercise': '#D2FCC3', // Light Green
      'category_family': '#DEB2FA', // Light Pink
      'category_meal': '#FCDD8C', // Light Orange
      'category_personal': '#BADAF8', // Light Blue
      'category_medical': '#F4B3BB', // Light Salmon
      'category_social': '#FFF48D', // Light Yellow
      'category_chores': '#ECECEC', // Light Gray
    };
    return defaultColors[type] || '#B2AEFF';
  };

  const ColorPickerRow = ({ activityType, typeInfo }) => (
    <div className="color-picker-row">
      <div className="activity-type-info">
        <span className="activity-type-icon">{typeInfo.icon}</span>
        <div className="activity-type-details">
          <div className="activity-type-name">{typeInfo.name}</div>
          <div className="activity-type-description">{typeInfo.description}</div>
        </div>
      </div>
      <div className="color-picker-options">
        {AVAILABLE_COLORS.map((color) => (
          <button
            key={color.hex}
            className={`color-option ${getCurrentColor(activityType) === color.hex ? 'selected' : ''}`}
            style={{ backgroundColor: color.hex }}
            onClick={() => handleColorChange(activityType, color.hex)}
            aria-label={`Set ${typeInfo.name} color to ${color.name}`}
            title={color.name}
          />
        ))}
      </div>
    </div>
  );

  const typesPresent = getActivityTypesPresent();

  return (
    <div className="person-card">
      <div className="person-card-header">
        <div
          className="person-avatar"
          style={{ backgroundColor: member.avatarColor }}
        >
          <span className="person-initials">
            {member.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()}
          </span>
        </div>
        <h2 className="person-name">{member.name}</h2>
        <button
          className="person-settings-button"
          onClick={() => setShowSettingsModal(true)}
          aria-label={`Settings for ${member.name}`}
        >
          <SettingsIcon size={18} color="#b781ff" />
        </button>
      </div>
      
      <PersonWeekCard
        member={member}
        activities={activities}
        homework={homework}
        weekStart={weekStart}
        onAddActivity={onAddActivity}
        onDeleteActivity={onDeleteActivity}
        onHomeworkDeleted={onHomeworkDeleted}
        colorPreferences={colorPreferences}
        getDefaultColorForType={getDefaultColorForType}
      />

      <GenericModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="View Settings"
      >
        <div className="settings-content">
          <div className="modal-section">
            <div className="section-header">
              <h3 className="section-title">Activity Block Colors</h3>
              <p className="section-description">
                Customize colors for different types of activities in {member.name}'s schedule
              </p>
            </div>
            
            {typesPresent.length > 0 ? (
              <div className="color-settings-list">
                {typesPresent.map((type) => (
                  <ColorPickerRow
                    key={type}
                    activityType={type}
                    typeInfo={getTypeDisplayInfo(type)}
                  />
                ))}
              </div>
            ) : (
              <div className="no-activities-message">
                <p>No activities found for this week. Add some activities to customize their colors!</p>
              </div>
            )}
          </div>
        </div>
      </GenericModal>
    </div>
  );
};

export default PersonCard;
