import WarningIcon from './icons/WarningIcon';
import Button from './Button';
import './ErrorState.css';

/**
 * ErrorState Component
 * 
 * Standardized error state display with icon, message, and optional retry
 * 
 * @param {string} title - Error title (default: 'Something went wrong')
 * @param {string} message - Error message text
 * @param {Function} onRetry - Optional retry callback function
 * @param {string} retryText - Text for retry button (default: 'Try Again')
 * @param {string} className - Additional CSS classes
 */
const ErrorState = ({
  title = 'Something went wrong',
  message = 'An error occurred. Please try again.',
  onRetry = null,
  retryText = 'Try Again',
  className = '',
}) => {
  return (
    <div className={`error-state ${className}`}>
      <div className="error-state-icon">
        <WarningIcon size={48} color="#ef4444" />
      </div>
      <h2 className="error-state-title">{title}</h2>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry} className="error-state-retry">
          {retryText}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
