/**
 * Skeleton Component
 * 
 * Base skeleton loader with shimmer animation.
 * Used as building block for skeleton screens.
 * 
 * @param {Object} props
 * @param {string} props.width - Width (e.g., "100%", "120px")
 * @param {string} props.height - Height (e.g., "20px", "100px")
 * @param {string} props.borderRadius - Border radius (default: "4px")
 * @param {string} props.className - Additional CSS classes
 */
const Skeleton = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  className = '' 
}) => {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
      aria-hidden="true"
    />
  );
};

export default Skeleton;


