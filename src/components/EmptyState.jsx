import Button from './Button';
import './EmptyState.css';

/**
 * EmptyState Component
 * 
 * Standardized empty state display for empty lists or no data scenarios
 * 
 * @param {string} icon - Emoji or icon to display
 * @param {string} title - Empty state title
 * @param {string} message - Empty state message
 * @param {Function} onAction - Optional action callback
 * @param {string} actionText - Text for action button
 * @param {string} className - Additional CSS classes
 */
const EmptyState = ({
  icon = '📭',
  title = 'No items found',
  message = '',
  onAction = null,
  actionText = 'Add Item',
  className = '',
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">{icon}</div>
      <h2 className="empty-state-title">{title}</h2>
      {message && <p className="empty-state-message">{message}</p>}
      {onAction && (
        <Button variant="primary" onClick={onAction} className="empty-state-action">
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
