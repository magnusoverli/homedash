import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import MainPage from './components/MainPage';
import Settings from './components/Settings';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import './styles/globals.css';
import './App.css';

function App() {
  const [currentWeek, setCurrentWeek] = useState(new Date());

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
