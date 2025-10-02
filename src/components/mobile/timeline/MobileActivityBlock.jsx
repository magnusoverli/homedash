import { getActivityColor, getActivityIcon } from '../../../utils/activityUtils';
import './MobileActivityBlock.css';

/**
 * Mobile Activity Block
 * 
 * Display-only activity block for mobile timeline.
 * Shows activity information without interaction.
 * 
 * @param {Object} props
 * @param {Object} props.activity - Activity object
 */
const MobileActivityBlock = ({ activity }) => {
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
      className="mobile-activity-block"
      style={{
        backgroundColor,
        height: `${height}px`,
        top: `${offset}px`,
      }}
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
    </div>
  );
};

export default MobileActivityBlock;


