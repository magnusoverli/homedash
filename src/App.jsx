import { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import DesktopApp from './apps/DesktopApp';
import MobileApp from './apps/MobileApp';
import Login from './components/Login';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import {
  checkAuthStatus,
  getAccessToken,
  setAccessToken,
  isTokenExpired,
  clearAccessToken,
  startTokenRefresh,
  stopTokenRefresh,
} from './services/authService';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { API_URL } from './config/api';
import './styles/globals.css';

function App() {
  const [currentWeek] = useState(new Date());
  const [authRequired, setAuthRequired] = useState(null); // null = checking, true/false = determined
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Device detection for future mobile UI implementation
  const {
    isMobile,
    isTablet,
    isTouch,
    deviceType,
    orientation,
    isInitialized,
  } = useDeviceDetection();

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
        const token = getAccessToken();
        if (token) {
          // Check if token is expired
          if (isTokenExpired()) {
            clearAccessToken();
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
            // Start automatic token refresh
            startTokenRefresh();
          }
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(true);
      }
    }

    checkAuth();

    // Cleanup on unmount
    return () => {
      stopTokenRefresh();
    };
  }, []);

  const handleLogin = token => {
    setAccessToken(token);
    setIsAuthenticated(true);
    startTokenRefresh();
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
  // Route to appropriate app based on device type
  const AppComponent = isMobile ? MobileApp : DesktopApp;

  return (
    <ToastProvider>
      <Router>
        <div
          className="app-root"
          data-device-type={deviceType}
          data-mobile={isMobile}
          data-tablet={isTablet}
          data-touch={isTouch}
          data-orientation={orientation}
        >
          <AppComponent initialWeek={currentWeek} />
          <ToastContainer />
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
