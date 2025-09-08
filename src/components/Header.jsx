import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsIcon from './SettingsIcon';
import './Header.css';

const Header = ({ currentWeek, onWeekChange, showWeekSelector = false }) => {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(null);
  const [weekEnd, setWeekEnd] = useState(null);

  useEffect(() => {
    if (currentWeek && showWeekSelector) {
      updateWeekDisplay(currentWeek);
    }
  }, [currentWeek, showWeekSelector]);

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

  const handleSettingsClick = () => {
    navigate('/settings');
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
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <div className="brand-logo">
            <span className="brand-number">2</span>
          </div>
          <span className="brand-text">HomeDash</span>
        </div>

        {showWeekSelector && (
          <div className="week-selector-inline">
            <button
              className="week-nav-button-small"
              onClick={handlePreviousWeek}
              aria-label="Previous week"
            >
              <svg
                width="20"
                height="20"
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

            <div className="week-display-inline">
              <span className="week-range-inline">
                Week of {formatDateRange()}
              </span>
              {!isCurrentWeek() && (
                <button className="today-button-small" onClick={handleToday}>
                  Today
                </button>
              )}
            </div>

            <button
              className="week-nav-button-small"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              <svg
                width="20"
                height="20"
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
        )}

        <div className="header-actions">
          <button
            className="settings-button button-icon"
            aria-label="Settings"
            onClick={handleSettingsClick}
          >
            <SettingsIcon />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
