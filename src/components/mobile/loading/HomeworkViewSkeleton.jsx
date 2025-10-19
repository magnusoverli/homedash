import Skeleton from './Skeleton';
import './Skeleton.css';
import './HomeworkViewSkeleton.css';

/**
 * Homework View Skeleton
 *
 * Skeleton loader for homework view.
 * Shows placeholders for homework cards.
 */
const HomeworkViewSkeleton = () => {
  return (
    <div className="today-view-skeleton">
      {/* "Now" section - large card */}
      <div className="today-skeleton-section">
        <Skeleton width="60px" height="18px" className="today-skeleton-title" />
        <div className="today-skeleton-card-large">
          <div className="today-skeleton-card-header">
            <Skeleton width="40px" height="40px" borderRadius="50%" />
            <Skeleton width="80px" height="14px" />
          </div>
          <Skeleton
            width="32px"
            height="32px"
            className="today-skeleton-icon"
          />
          <Skeleton width="60%" height="22px" />
          <Skeleton width="120px" height="14px" />
        </div>
      </div>

      {/* "Next Up" section - compact cards */}
      <div className="today-skeleton-section">
        <Skeleton width="80px" height="18px" className="today-skeleton-title" />
        <div className="today-skeleton-cards-compact">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="today-skeleton-card-compact">
              <Skeleton width="32px" height="32px" borderRadius="50%" />
              <div className="today-skeleton-compact-content">
                <Skeleton width="70%" height="16px" />
                <Skeleton width="100px" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* "Later Today" section */}
      <div className="today-skeleton-section">
        <Skeleton
          width="100px"
          height="18px"
          className="today-skeleton-title"
        />
        <div className="today-skeleton-cards-compact">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="today-skeleton-card-compact">
              <Skeleton width="32px" height="32px" borderRadius="50%" />
              <div className="today-skeleton-compact-content">
                <Skeleton width="65%" height="16px" />
                <Skeleton width="80px" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeworkViewSkeleton;
