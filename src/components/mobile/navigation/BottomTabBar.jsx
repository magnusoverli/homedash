import { useLocation, useNavigate } from 'react-router-dom';
import './BottomTabBar.css';

/**
 * Bottom Tab Bar Navigation
 * 
 * Touch-optimized navigation bar fixed at the bottom of the screen.
 * Provides easy thumb access to main app sections.
 * 
 * Design follows HomeDash Design Manual:
 * - Primary dark background (#10011B)
 * - Purple accent for active state (#6704FF)
 * - 64px height for comfortable touch targets
 * - Icon-based navigation with labels
 */
const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    {
      id: 'overview',
      path: '/',
      label: 'Overview',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
    },
    {
      id: 'today',
      path: '/today',
      label: 'Today',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M3 10h18" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="15" r="2" fill="currentColor"/>
        </svg>
      ),
    },
    {
      id: 'settings',
      path: '/settings',
      label: 'Settings',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 1v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M1 12h3m14 0h3M4.2 19.8l2.1-2.1m11.4-11.4l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleTabClick = (path) => {
    // Haptic feedback (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    navigate(path);
  };

  return (
    <nav className="mobile-tab-bar" role="navigation" aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`mobile-tab-button ${isActive(tab.path) ? 'mobile-tab-button--active' : ''}`}
          onClick={() => handleTabClick(tab.path)}
          aria-label={tab.label}
          aria-current={isActive(tab.path) ? 'page' : undefined}
        >
          <span className="mobile-tab-icon">
            {tab.icon}
          </span>
          <span className="mobile-tab-label">
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default BottomTabBar;


