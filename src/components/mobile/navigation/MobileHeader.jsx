import { useNavigate } from 'react-router-dom';
import { HomeDashIcon } from '../../icons';
import './MobileHeader.css';

/**
 * MobileHeader - Reusable header component for mobile screens
 * 
 * @param {Object} props
 * @param {string} props.variant - Header variant: 'overview' | 'default' | 'back'
 * @param {string} props.title - Header title (for 'default' and 'back' variants)
 * @param {boolean} props.showLogo - Show HomeDash logo on left (for 'default' variant)
 * @param {React.ReactNode} props.leftSlot - Custom content for left slot
 * @param {React.ReactNode} props.centerSlot - Custom content for center slot
 * @param {React.ReactNode} props.rightSlot - Custom content for right slot
 * @param {Function} props.onBack - Custom back handler (for 'back' variant)
 */
const MobileHeader = ({
  variant = 'default',
  title,
  showLogo = false,
  leftSlot,
  centerSlot,
  rightSlot,
  onBack,
}) => {
  const navigate = useNavigate();

  // Handle back button click
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  // Render different header variants
  switch (variant) {
    case 'overview':
      // Custom header for Overview screen - uses slots
      return (
        <header className="mobile-header mobile-header--overview">
          <div className="mobile-header-content">
            {leftSlot}
            {centerSlot}
            {rightSlot}
          </div>
        </header>
      );

    case 'back':
      // Header with back button on the left
      return (
        <header className="mobile-header mobile-header--back">
          <button
            className="mobile-icon-button"
            onClick={handleBackClick}
            aria-label="Back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          
          {centerSlot || <h1 className="mobile-header-title">{title}</h1>}
          
          {rightSlot || <div className="mobile-header-icon"></div>}
        </header>
      );

    case 'default':
    default:
      // Default centered header
      return (
        <header className="mobile-header mobile-header--default">
          {leftSlot || (showLogo ? (
            <div className="mobile-header-logo">
              <HomeDashIcon size={24} color="white" />
            </div>
          ) : (
            <div className="mobile-header-icon"></div>
          ))}
          
          {centerSlot || <h1 className="mobile-header-title">{title}</h1>}
          
          {rightSlot || <div className="mobile-header-icon"></div>}
        </header>
      );
  }
};

export default MobileHeader;

