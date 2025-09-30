/**
 * LoadingSpinner Component
 * 
 * Animated loading spinner with SVG animation
 * 
 * @param {number} size - Spinner size in pixels (default: 24)
 * @param {string} color - Spinner color (default: 'currentColor')
 * @param {string} className - Additional CSS classes
 */
const LoadingSpinner = ({
  size = 24,
  color = 'currentColor',
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="2"
        strokeDasharray="31.416"
        strokeDashoffset="31.416"
      >
        <animate
          attributeName="stroke-dasharray"
          dur="2s"
          values="0 31.416;15.708 15.708;0 31.416"
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke-dashoffset"
          dur="2s"
          values="0;-15.708;-31.416"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
};

export default LoadingSpinner;
