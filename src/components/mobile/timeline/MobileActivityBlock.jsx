import {
  getActivityColor,
  getActivityIcon,
} from '../../../utils/activityUtils';
import { formatTime } from '../../../utils/timeUtils';
import './MobileActivityBlock.css';

/**
 * Mobile Activity Block
 *
 * Display-only activity block for mobile timeline.
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
        <span className="mobile-activity-title">{activity.title}</span>
        <span className="mobile-activity-time">
          {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
        </span>
      </div>
    </div>
  );
};

export default MobileActivityBlock;
