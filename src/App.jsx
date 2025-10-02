import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import MainPage from './components/MainPage';
import Settings from './components/Settings';
import Login from './components/Login';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import {
  checkAuthStatus,
  getAccessToken,
  setAccessToken,
} from './services/authService';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { API_URL } from './config/api';
import './styles/globals.css';
import './App.css';

function App() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [authRequired, setAuthRequired] = useState(null); // null = checking, true/false = determined
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Device detection for future mobile UI implementation
  const { isMobile, isTablet, isTouch, deviceType, orientation, isInitialized } =
    useDeviceDetection();

  // Send device detection to server for logging (only after proper detection)
  useEffect(() => {
    if (isInitialized) {
      fetch(`${API_URL}/api/debug/device-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isMobile,
          isTablet,
          isTouch,
          deviceType,
          orientation,
          userAgent: navigator.userAgent,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        }),
      }).catch(() => {}); // Silently fail if endpoint doesn't exist yet
    }
  }, [isInitialized, isMobile, isTablet, isTouch, deviceType, orientation]);

  useEffect(() => {
    async function checkAuth() {
      const required = await checkAuthStatus();
      setAuthRequired(required);

      if (required) {
        // Check if we have a valid token
        const token = getAccessToken();
        setIsAuthenticated(!!token);
      } else {
        // No auth required, proceed
        setIsAuthenticated(true);
      }
    }

    checkAuth();
  }, []);

  const handleLogin = (token) => {
    setAccessToken(token);
    setIsAuthenticated(true);
  };

  // Still checking auth status
  if (authRequired === null) {
    return null; // Or a loading spinner
  }

  // Auth required but not authenticated
  if (authRequired && !isAuthenticated) {
    return (
      <ToastProvider>
        <Login onLogin={handleLogin} />
        <ToastContainer />
      </ToastProvider>
    );
  }

  // Authenticated or auth not required
  return (
    <ToastProvider>
      <Router>
        <div
          className="app"
          data-device-type={deviceType}
          data-mobile={isMobile}
          data-tablet={isTablet}
          data-touch={isTouch}
          data-orientation={orientation}
        >
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
          <ToastContainer />
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
