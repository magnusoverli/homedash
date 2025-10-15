import './MobileHeader.css';

/**
 * MobileHeader - Shared header component for all mobile screens
 *
 * Flexible header that uses slot-based content customization.
 * Used consistently across Overview, Today, and Settings screens.
 *
 * @param {Object} props
 * @param {string} props.variant - Header variant (currently only 'overview' is used)
 * @param {React.ReactNode} props.leftSlot - Custom content for left slot
 * @param {React.ReactNode} props.centerSlot - Custom content for center slot
 * @param {React.ReactNode} props.rightSlot - Custom content for right slot
 */
const MobileHeader = ({
  variant = 'overview',
  leftSlot,
  centerSlot,
  rightSlot,
}) => {
  return (
    <header className="mobile-header mobile-header--overview">
      <div className="mobile-header-content">
        {leftSlot}
        {centerSlot}
        {rightSlot}
      </div>
    </header>
  );
};

export default MobileHeader;
