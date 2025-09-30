/**
 * CloseIcon Component
 * 
 * X/Close icon used in modals, toasts, and other dismissible elements
 * 
 * @param {number} size - Icon size in pixels (default: 24)
 * @param {string} color - Icon color (default: 'currentColor')
 * @param {string} className - Additional CSS classes
 */
const CloseIcon = ({ size = 24, color = 'currentColor', className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M18 6L6 18M6 6L18 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CloseIcon;
