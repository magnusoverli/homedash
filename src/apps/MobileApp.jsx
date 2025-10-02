import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BottomTabBar from '../components/mobile/navigation/BottomTabBar';
import MobileOverview from '../components/mobile/screens/MobileOverview';
import MobileTodayView from '../components/mobile/screens/MobileTodayView';
import MobileSettings from '../components/mobile/screens/MobileSettings';
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
 * 
 * @param {Object} props
 * @param {Date} props.initialWeek - Initial week to display
 */
const MobileApp = ({ initialWeek = new Date() }) => {
  const [currentWeek, setCurrentWeek] = useState(initialWeek);

  return (
    <div className="mobile-app">
      <div className="mobile-content">
        <Routes>
          <Route 
            path="/" 
            element={
              <MobileOverview 
                currentWeek={currentWeek}
                onWeekChange={setCurrentWeek}
              />
            } 
          />
          <Route 
            path="/today" 
            element={<MobileTodayView />} 
          />
          <Route 
            path="/settings" 
            element={<MobileSettings />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      
      <BottomTabBar />
    </div>
  );
};

export default MobileApp;


