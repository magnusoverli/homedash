import { useState, useEffect } from 'react';
import './WeekSelector.css';

const WeekSelector = ({ currentWeek, onWeekChange }) => {
  const [weekStart, setWeekStart] = useState(null);
  const [weekEnd, setWeekEnd] = useState(null);

  useEffect(() => {
    updateWeekDisplay(currentWeek);
  }, [currentWeek]);

  const updateWeekDisplay = date => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    setWeekStart(start);
    setWeekEnd(end);
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    onWeekChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    onWeekChange(newDate);
  };

  const handleToday = () => {
    onWeekChange(new Date());
  };

  const formatDateRange = () => {
    if (!weekStart || !weekEnd) return '';

    const startMonth = weekStart.toLocaleDateString('en-US', {
      month: 'short',
    });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const startDate = weekStart.getDate();
    const endDate = weekEnd.getDate();
    const year = weekEnd.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDate}-${endDate}, ${year}`;
    } else {
      return `${startMonth} ${startDate} - ${endMonth} ${endDate}, ${year}`;
    }
  };

  const isCurrentWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!weekStart || !weekEnd) return false;

    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekEnd);
    end.setHours(23, 59, 59, 999);

    return today >= start && today <= end;
  };

  return (
    <div className="week-selector">
      <div className="week-selector-container">
        <button
          className="week-nav-button"
          onClick={handlePreviousWeek}
          aria-label="Previous week"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="week-display">
          <h2 className="week-range">Week of {formatDateRange()}</h2>
          {!isCurrentWeek() && (
            <button className="today-button" onClick={handleToday}>
              Today
            </button>
          )}
        </div>

        <button
          className="week-nav-button"
          onClick={handleNextWeek}
          aria-label="Next week"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WeekSelector;
