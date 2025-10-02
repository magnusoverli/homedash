import Skeleton from './Skeleton';
import './Skeleton.css';
import './SettingsSkeleton.css';

/**
 * Settings Skeleton
 * 
 * Skeleton loader for settings screen.
 * Shows placeholders for person grid and sections.
 */
const SettingsSkeleton = () => {
  return (
    <div className="settings-skeleton">
      {/* Section header skeleton */}
      <div className="settings-skeleton-section">
        <Skeleton width="150px" height="20px" />
        <Skeleton width="80px" height="14px" />
      </div>

      {/* People grid skeleton */}
      <div className="settings-skeleton-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="settings-skeleton-person-card">
            <Skeleton width="56px" height="56px" borderRadius="50%" />
            <Skeleton width="80px" height="12px" />
          </div>
        ))}
      </div>

      {/* Integration sections */}
      <div className="settings-skeleton-section">
        <Skeleton width="120px" height="20px" />
        <Skeleton width="100px" height="14px" />
      </div>

      <div className="settings-skeleton-integration">
        <Skeleton width="100%" height="80px" borderRadius="12px" />
      </div>

      <div className="settings-skeleton-integration">
        <Skeleton width="100%" height="80px" borderRadius="12px" />
      </div>
    </div>
  );
};

export default SettingsSkeleton;


