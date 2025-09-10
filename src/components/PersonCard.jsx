import PersonWeekCard from './PersonWeekCard';
import './PersonCard.css';

const PersonCard = ({
  member,
  activities,
  weekStart,
  onAddActivity,
  onDeleteActivity,
}) => {
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
      </div>
      
      <PersonWeekCard
        member={member}
        activities={activities}
        weekStart={weekStart}
        onAddActivity={onAddActivity}
        onDeleteActivity={onDeleteActivity}
      />
    </div>
  );
};

export default PersonCard;
