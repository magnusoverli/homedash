/**
 * HomeDash Icon - Brand logo representing a dashboard with 4 squares
 * Used in both desktop and mobile headers
 */
const HomeDashIcon = ({ size = 24, color = 'currentColor', className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="HomeDash"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1"
        fill={color}
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1"
        fill={color}
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1"
        fill={color}
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1"
        fill={color}
      />
    </svg>
  );
};

export default HomeDashIcon;

