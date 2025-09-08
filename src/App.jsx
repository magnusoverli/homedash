import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import MainPage from './components/MainPage';
import Settings from './components/Settings';
import './styles/globals.css';

function App() {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Header
                  currentWeek={currentWeek}
                  onWeekChange={setCurrentWeek}
                  showWeekSelector={true}
                />
                <MainPage
                  currentWeek={currentWeek}
                  onWeekChange={setCurrentWeek}
                />
              </>
            }
          />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
