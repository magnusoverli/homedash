import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MobileHeader from '../components/mobile/navigation/MobileHeader';
import BottomTabBar from '../components/mobile/navigation/BottomTabBar';
import MobileOverview from '../components/mobile/screens/MobileOverview';
import MobileHomeworkView from '../components/mobile/screens/MobileHomeworkView';
import MobileSettings from '../components/mobile/screens/MobileSettings';
import { HomeDashIcon } from '../components/icons';
import '../styles/mobile/mobile-app.css';

/**
 * Mobile Application
 *
 * Touch-optimized interface for mobile phones.
 * Completely separate from desktop/tablet interface.
 *
 * Features:
 * - Bottom tab navigation (thumb-friendly)
 * - Swipeable person carousel
 * - Touch-optimized activity timeline
 * - Gesture-based interactions
 * - Shared header across all screens
 *
 * @param {Object} props
 * @param {Date} props.initialWeek - Initial week to display
 */
const MobileApp = ({ initialWeek = new Date() }) => {
  const [currentWeek, setCurrentWeek] = useState(initialWeek);
  const [currentTime, setCurrentTime] = useState(new Date());
  const location = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  const getWeekNumber = date => {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  const getWeekStart = () => {
    const weekStart = new Date(currentWeek);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    return weekStart;
  };

  const getWeekDisplay = () => {
    const weekStart = getWeekStart();
    const weekNumber = getWeekNumber(weekStart);
    return `Week ${weekNumber}`;
  };

  const isCurrentWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = getWeekStart();
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return today >= weekStart && today <= weekEnd;
  };

  const renderHeader = () => {
    if (location.pathname === '/') {
      return (
        <MobileHeader
          variant="overview"
          leftSlot={
            <div className="mobile-overview-logo">
              <HomeDashIcon size={28} color="white" />
            </div>
          }
          centerSlot={
            <div className="mobile-overview-week">
              <button
                className="mobile-week-nav-button"
                onClick={handlePreviousWeek}
                aria-label="Previous week"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <button
                className={`mobile-week-display ${isCurrentWeek() ? 'mobile-week-display--current' : ''}`}
                onClick={handleToday}
                aria-label="Go to today"
              >
                <span className="mobile-week-text">{getWeekDisplay()}</span>
              </button>

              <button
                className="mobile-week-nav-button"
                onClick={handleNextWeek}
                aria-label="Next week"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          }
          rightSlot={<div style={{ width: '40px' }} />}
        />
      );
    }

    if (location.pathname === '/homework') {
      return (
        <MobileHeader
          variant="overview"
          leftSlot={
            <div className="mobile-overview-logo">
              <HomeDashIcon size={28} color="white" />
            </div>
          }
          centerSlot={<h1 className="mobile-header-title">Homework</h1>}
          rightSlot={
            <div className="mobile-header-time">
              {currentTime.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          }
        />
      );
    }

    if (location.pathname === '/settings') {
      return (
        <MobileHeader
          variant="overview"
          leftSlot={
            <div className="mobile-overview-logo">
              <HomeDashIcon size={28} color="white" />
            </div>
          }
          centerSlot={<h1 className="mobile-header-title">Settings</h1>}
          rightSlot={<div style={{ width: '40px' }} />}
        />
      );
    }

    return null;
  };

  return (
    <div className="mobile-app">
      {renderHeader()}

      <div className="mobile-content">
        <Routes>
          <Route
            path="/"
            element={<MobileOverview currentWeek={currentWeek} />}
          />
          <Route path="/homework" element={<MobileHomeworkView />} />
          <Route path="/settings" element={<MobileSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default MobileApp;
