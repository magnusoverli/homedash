import MobileTimeline from './MobileTimeline';
import './MobilePersonCard.css';

/**
 * Mobile Person Card
 *
 * Card containing a person's weekly schedule timeline.
 * Read-only view for mobile devices.
 *
 * @param {Object} props
 * @param {Object} props.member - Family member object
 * @param {Array} props.activities - Activities for this member
 * @param {Date} props.weekStart - Start date of current week
 * @param {boolean} props.isActive - Whether this card is currently visible
 */
const MobilePersonCard = ({
  member,
  activities = [],
  weekStart,
  isActive = false,
}) => {
  return (
    <div className="mobile-person-card">
      {/* Header */}
      <div className="mobile-person-header">
        <h2 className="mobile-person-name">{member.name}</h2>
      </div>

      {/* Content area with timeline only */}
      <div className="mobile-person-content">
        <div className="mobile-person-timeline-section mobile-person-timeline-section--full">
          <MobileTimeline
            member={member}
            activities={activities}
            weekStart={weekStart}
            isActive={isActive}
          />
        </div>
      </div>
    </div>
  );
};

export default MobilePersonCard;
