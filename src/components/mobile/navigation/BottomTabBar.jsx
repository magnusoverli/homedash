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
 * - 56px height for comfortable touch targets
 * - Icon-based navigation with labels
 */
const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    {
      id: 'timeline',
      path: '/',
      label: 'Timeline',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      ),
    },
    {
      id: 'homework',
      path: '/today',
      label: 'Homework',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 2v6h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 13h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M9 17h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: 'settings',
      path: '/settings',
      label: 'Settings',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 1v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M1 12h3m14 0h3M4.2 19.8l2.1-2.1m11.4-11.4l2.1-2.1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  const isActive = path => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleTabClick = path => {
    // Haptic feedback (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    navigate(path);
  };

  return (
    <nav
      className="mobile-tab-bar"
      role="navigation"
      aria-label="Main navigation"
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`mobile-tab-button ${isActive(tab.path) ? 'mobile-tab-button--active' : ''}`}
          onClick={() => handleTabClick(tab.path)}
          aria-label={tab.label}
          aria-current={isActive(tab.path) ? 'page' : undefined}
        >
          <span className="mobile-tab-icon">{tab.icon}</span>
          <span className="mobile-tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomTabBar;
