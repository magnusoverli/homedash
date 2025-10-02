import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '../components/Header';
import MainPage from '../components/MainPage';
import Settings from '../components/Settings';
import '../styles/globals.css';
import '../App.css';

/**
 * Desktop/Tablet Application
 * 
 * This is the existing HomeDash interface, preserved for desktop and tablet devices.
 * All existing functionality remains unchanged.
 * 
 * @param {Object} props
 * @param {Date} props.initialWeek - Initial week to display
 */
const DesktopApp = ({ initialWeek = new Date() }) => {
  const [currentWeek, setCurrentWeek] = useState(initialWeek);

  return (
    <div className="app app-desktop">
      <Routes>
        <Route
          path="/"
          element={
            <div className="app-layout">
              <Header
                currentWeek={currentWeek}
                onWeekChange={setCurrentWeek}
                showWeekSelector={true}
              />
              <MainPage
                currentWeek={currentWeek}
                onWeekChange={setCurrentWeek}
              />
            </div>
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
};

export default DesktopApp;


