import { useState, useEffect } from 'react';
import ActivityBlock from './ActivityBlock';
import ScheduleModal from './ScheduleModal';
import './PersonWeekCard.css';

const PersonWeekCard = ({
  member,
  activities,
  weekStart,
  onAddActivity,
  onDeleteActivity,
}) => {
  const [dayColumns, setDayColumns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const timeSlots = [];
  const startHour = 8;
  const endHour = 20;
  const pixelsPerHour = 54;

  for (let hour = startHour; hour <= endHour; hour++) {
    timeSlots.push(hour);
  }

  useEffect(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    setDayColumns(days);
  }, [weekStart]);

  const getDayActivities = date => {
    return activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate.toDateString() === date.toDateString();
    });
  };

  const calculateTopPosition = timeString => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = (hours - startHour) * 60 + minutes;
    return (totalMinutes / 60) * pixelsPerHour;
  };

  const calculateHeight = (startTime, endTime) => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const durationMinutes =
      endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
    return (durationMinutes / 60) * pixelsPerHour;
  };

  const handleTimeSlotClick = (date, hour) => {
    const clickedDate = new Date(date);
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

    onAddActivity({
      memberId: member.id,
      date: clickedDate.toISOString().split('T')[0],
      startTime,
      endTime,
      title: '',
      category: 'personal',
    });
  };

  const formatDayLabel = date => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    return { dayName, dayNumber };
  };

  const isToday = date => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const checkOverlaps = dayActivities => {
    const overlaps = [];
    for (let i = 0; i < dayActivities.length; i++) {
      const overlappingActivities = [dayActivities[i]];
      for (let j = i + 1; j < dayActivities.length; j++) {
        const a = dayActivities[i];
        const b = dayActivities[j];

        const aStart = a.startTime.split(':').map(Number);
        const aEnd = a.endTime.split(':').map(Number);
        const bStart = b.startTime.split(':').map(Number);
        const bEnd = b.endTime.split(':').map(Number);

        const aStartMin = aStart[0] * 60 + aStart[1];
        const aEndMin = aEnd[0] * 60 + aEnd[1];
        const bStartMin = bStart[0] * 60 + bStart[1];
        const bEndMin = bEnd[0] * 60 + bEnd[1];

        if (aStartMin < bEndMin && aEndMin > bStartMin) {
          overlappingActivities.push(dayActivities[j]);
        }
      }

      if (overlappingActivities.length > 1) {
        overlaps.push(overlappingActivities);
      }
    }
    return overlaps;
  };

  return (
    <>
      <div className="person-week-card">
        <div className="card-header">
          <button
            className="add-activity-button"
            aria-label="Add activity"
            onClick={() => setIsModalOpen(true)}
          >
            +
          </button>
        </div>

        <div className="week-grid">
          <div className="days-container">
            {dayColumns.map((date, index) => {
              const dayInfo = formatDayLabel(date);
              const dayActivities = getDayActivities(date);
              const overlaps = checkOverlaps(dayActivities);

              return (
                <div
                  key={index}
                  className={`day-column ${isToday(date) ? 'today' : ''}`}
                >
                  <div className="day-header">
                    <div className="day-name">{dayInfo.dayName}</div>
                    <div className="day-number">{dayInfo.dayNumber}</div>
                  </div>

                  <div className="time-grid-column">
                    {timeSlots.map(hour => (
                      <div
                        key={hour}
                        className="time-slot"
                        onClick={() => handleTimeSlotClick(date, hour)}
                      />
                    ))}

                    <div className="activities-layer">
                      {dayActivities.map((activity, actIndex) => {
                        const isOverlapping = overlaps.some(group =>
                          group.includes(activity)
                        );
                        const overlapIndex = isOverlapping
                          ? overlaps
                              .find(group => group.includes(activity))
                              .indexOf(activity)
                          : 0;
                        const overlapCount = isOverlapping
                          ? overlaps.find(group => group.includes(activity))
                              .length
                          : 1;

                        return (
                          <ActivityBlock
                            key={activity.id || actIndex}
                            activity={activity}
                            top={calculateTopPosition(activity.startTime)}
                            height={calculateHeight(
                              activity.startTime,
                              activity.endTime
                            )}
                            isOverlapping={isOverlapping}
                            overlapIndex={overlapIndex}
                            overlapCount={overlapCount}
                            onDelete={() => onDeleteActivity(activity.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${member.name}'s Schedule`}
      >
        {/* Content for schedule management will go here */}
      </ScheduleModal>
    </>
  );
};

export default PersonWeekCard;
