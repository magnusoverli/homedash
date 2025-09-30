import LoadingSpinner from './icons/LoadingSpinner';
import './LoadingState.css';

/**
 * LoadingState Component
 * 
 * Standardized loading state display with spinner and message
 * 
 * @param {string} text - Loading message text (default: 'Loading...')
 * @param {number} spinnerSize - Size of the spinner in pixels (default: 40)
 * @param {string} className - Additional CSS classes
 */
const LoadingState = ({
  text = 'Loading...',
  spinnerSize = 40,
  className = '',
}) => {
  return (
    <div className={`loading-state ${className}`}>
      <LoadingSpinner size={spinnerSize} className="loading-state-spinner" />
      <p className="loading-state-text">{text}</p>
    </div>
  );
};

export default LoadingState;
