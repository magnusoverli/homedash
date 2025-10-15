import { useState, useEffect } from 'react';
import EmptyState from '../../EmptyState';
import TodayViewSkeleton from '../loading/TodayViewSkeleton';
import {
  getActivityColor,
  getActivityIcon,
} from '../../../utils/activityUtils';
import dataService from '../../../services/dataService';
import { formatLocalDate } from '../../../utils/timeUtils';
import './MobileTodayView.css';

/**
 * Mobile Today View
 *
 * Focused view of current day's activities across all family members.
 * Groups activities by time: Now, Next Up, Later Today.
 * Updates every minute to keep "Now" section accurate.
 * Completed activities are automatically filtered out.
 */
const MobileTodayView = () => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load family members
        const members = await dataService.getFamilyMembers();
        const mappedMembers = members.map(m => ({
          ...m,
          avatarColor: m.color,
        }));
        setFamilyMembers(mappedMembers);

        // Load today's activities for all members
        const today = formatLocalDate(new Date());
        const activitiesData = await dataService.getActivities({
          startDate: today,
          endDate: today,
        });

        // Filter and enrich activities
        const enrichedActivities = activitiesData
          .filter(activity => {
            // Filter out declined Spond activities
            if (
              activity.source === 'spond' &&
              activity.response_status === 'declined'
            ) {
              return false;
            }
            return true;
          })
          .map(activity => ({
            ...activity,
            member: mappedMembers.find(m => m.id === activity.member_id),
            startTime: activity.start_time,
            endTime: activity.end_time,
          }))
          .sort((a, b) => {
            // Sort by start time
            return a.startTime.localeCompare(b.startTime);
          });

        setActivities(enrichedActivities);
      } catch (error) {
        console.error('Error loading today data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Get time in minutes since midnight
  const getMinutesSinceMidnight = timeStr => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getCurrentMinutes = () => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  };

  // Categorize activities (only show current and future)
  const categorizeActivities = () => {
    const now = getCurrentMinutes();
    const categories = {
      current: [],
      nextUp: [],
      laterToday: [],
    };

    activities.forEach(activity => {
      const start = getMinutesSinceMidnight(activity.startTime);
      const end = getMinutesSinceMidnight(activity.endTime);

      // Skip completed activities
      if (end <= now) {
        return;
      }

      if (now >= start && now < end) {
        // Currently happening
        categories.current.push(activity);
      } else if (start > now && start <= now + 120) {
        // Within next 2 hours
        categories.nextUp.push(activity);
      } else if (start > now + 120) {
        // Later today
        categories.laterToday.push(activity);
      }
    });

    return categories;
  };

  const categories = categorizeActivities();

  // Format time remaining
  const getTimeRemaining = endTime => {
    const end = getMinutesSinceMidnight(endTime);
    const now = getCurrentMinutes();
    const remaining = end - now;

    if (remaining <= 0) return 'Ending now';
    if (remaining < 60) return `${remaining} min left`;

    const hours = Math.floor(remaining / 60);
    const mins = remaining % 60;
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  };

  // Format time until
  const getTimeUntil = startTime => {
    const start = getMinutesSinceMidnight(startTime);
    const now = getCurrentMinutes();
    const until = start - now;

    if (until <= 0) return 'Starting now';
    if (until < 60) return `in ${until} min`;

    const hours = Math.floor(until / 60);
    const mins = until % 60;
    return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="mobile-today-view">
        <TodayViewSkeleton />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="mobile-today-view">
        <EmptyState
          icon="🎉"
          title="Free Day!"
          message="No activities scheduled for today. Enjoy your free time!"
        />
      </div>
    );
  }

  return (
    <div className="mobile-today-view">
      <div className="today-content">
        {/* NOW Section */}
        {categories.current.length > 0 && (
          <section className="today-section today-section--now">
            <h2 className="today-section-title">Now</h2>
            {categories.current.map(activity => (
              <div
                key={activity.id}
                className="today-card today-card--current"
                style={{ borderLeftColor: getActivityColor(activity) }}
              >
                <div className="today-card-header">
                  <div className="today-card-person">
                    <div
                      className="today-card-avatar"
                      style={{ backgroundColor: activity.member?.avatarColor }}
                    >
                      {activity.member?.name?.charAt(0)}
                    </div>
                    <span className="today-card-person-name">
                      {activity.member?.name}
                    </span>
                  </div>
                  <span className="today-card-badge today-card-badge--current">
                    {getTimeRemaining(activity.endTime)}
                  </span>
                </div>

                <div className="today-card-body">
                  <div className="today-card-icon">
                    {getActivityIcon(activity)}
                  </div>
                  <h3 className="today-card-title">{activity.title}</h3>
                  <div className="today-card-time">
                    {activity.startTime} - {activity.endTime}
                  </div>
                  {activity.location_name && (
                    <div className="today-card-location">
                      📍 {activity.location_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* NEXT UP Section */}
        {categories.nextUp.length > 0 && (
          <section className="today-section">
            <h2 className="today-section-title">Next Up</h2>
            {categories.nextUp.map(activity => (
              <div
                key={activity.id}
                className="today-card today-card--compact"
                style={{ borderLeftColor: getActivityColor(activity) }}
              >
                <div className="today-card-compact-content">
                  <div className="today-card-compact-left">
                    <div
                      className="today-card-avatar-small"
                      style={{ backgroundColor: activity.member?.avatarColor }}
                    >
                      {activity.member?.name?.charAt(0)}
                    </div>
                    <div className="today-card-compact-info">
                      <div className="today-card-compact-title">
                        {activity.title}
                      </div>
                      <div className="today-card-compact-meta">
                        {activity.member?.name} • {activity.startTime}
                      </div>
                    </div>
                  </div>
                  <span className="today-card-badge">
                    {getTimeUntil(activity.startTime)}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* LATER TODAY Section */}
        {categories.laterToday.length > 0 && (
          <section className="today-section">
            <h2 className="today-section-title">Later Today</h2>
            {categories.laterToday.map(activity => (
              <div
                key={activity.id}
                className="today-card today-card--compact"
                style={{ borderLeftColor: getActivityColor(activity) }}
              >
                <div className="today-card-compact-content">
                  <div className="today-card-compact-left">
                    <div
                      className="today-card-avatar-small"
                      style={{ backgroundColor: activity.member?.avatarColor }}
                    >
                      {activity.member?.name?.charAt(0)}
                    </div>
                    <div className="today-card-compact-info">
                      <div className="today-card-compact-title">
                        {activity.title}
                      </div>
                      <div className="today-card-compact-meta">
                        {activity.member?.name} • {activity.startTime}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default MobileTodayView;
