import { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import DesktopApp from './apps/DesktopApp';
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
import './styles/globals.css';

function App() {
  const [currentWeek] = useState(new Date());
  const [authRequired, setAuthRequired] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const required = await checkAuthStatus();
      setAuthRequired(required);

      if (required) {
        const token = getAccessToken();
        if (token) {
          if (isTokenExpired()) {
            clearAccessToken();
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
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
    return null;
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

  return (
    <ToastProvider>
      <Router>
        <div className="app-root">
          <DesktopApp initialWeek={currentWeek} />
          <ToastContainer />
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
