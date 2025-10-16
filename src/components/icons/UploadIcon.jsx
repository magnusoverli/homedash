import PropTypes from 'prop-types';
/**
 * UploadIcon Component
 * 
 * Upload/cloud upload icon for file upload areas
 * 
 * @param {number} size - Icon size in pixels (default: 24)
 * @param {string} color - Icon color (default: 'currentColor')
 * @param {string} className - Additional CSS classes
 */
const UploadIcon = ({ size = 24, color = 'currentColor', className = '' }) => {
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
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default UploadIcon;
