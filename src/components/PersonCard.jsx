import { useState } from 'react';
import PersonWeekCard from './PersonWeekCard';
import GenericModal from './GenericModal';
import SettingsIcon from './SettingsIcon';
import './PersonCard.css';

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
      />

      <GenericModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title={`${member.name} Settings`}
      >
        <div className="modal-content-placeholder">
          Settings content will be added here
        </div>
      </GenericModal>
    </div>
  );
};

export default PersonCard;
