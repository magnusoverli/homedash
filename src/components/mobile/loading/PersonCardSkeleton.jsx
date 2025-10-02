import Skeleton from './Skeleton';
import './Skeleton.css';
import './PersonCardSkeleton.css';

/**
 * Person Card Skeleton
 * 
 * Skeleton loader for person card in carousel.
 * Shows placeholder for avatar, name, timeline, and tasks.
 */
const PersonCardSkeleton = () => {
  return (
    <div className="person-card-skeleton">
      {/* Header with avatar and name */}
      <div className="person-card-skeleton-header">
        <Skeleton 
          width="64px" 
          height="64px" 
          borderRadius="50%" 
          className="person-card-skeleton-avatar"
        />
        <div className="person-card-skeleton-info">
          <Skeleton width="120px" height="20px" className="person-card-skeleton-name" />
          <Skeleton width="80px" height="14px" className="person-card-skeleton-subtitle" />
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="person-card-skeleton-timeline">
        <div className="timeline-skeleton-grid">
          {/* Time column */}
          <div className="timeline-skeleton-times">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} width="32px" height="12px" />
            ))}
          </div>
          
          {/* Activity blocks column */}
          <div className="timeline-skeleton-blocks">
            <Skeleton width="100%" height="60px" borderRadius="8px" />
            <Skeleton width="100%" height="40px" borderRadius="8px" />
            <Skeleton width="100%" height="80px" borderRadius="8px" />
            <Skeleton width="100%" height="50px" borderRadius="8px" />
          </div>
        </div>
      </div>

      {/* Task list skeleton */}
      <div className="person-card-skeleton-tasks">
        <Skeleton width="80px" height="16px" className="task-skeleton-title" />
        <div className="task-skeleton-items">
          <Skeleton width="100%" height="40px" borderRadius="8px" />
          <Skeleton width="100%" height="40px" borderRadius="8px" />
          <Skeleton width="100%" height="40px" borderRadius="8px" />
        </div>
      </div>
    </div>
  );
};

export default PersonCardSkeleton;


