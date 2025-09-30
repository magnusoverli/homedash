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
import './styles/globals.css';
import './App.css';

function App() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [authRequired, setAuthRequired] = useState(null); // null = checking, true/false = determined
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        <div className="app">
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
