/**
 * Button Component
 * 
 * Reusable button component with consistent styling and variants
 * 
 * @param {string} variant - Button style variant: 'primary', 'secondary', 'danger', 'danger-confirm', 'danger-advanced'
 * @param {string} size - Button size: 'small', 'medium', 'large'
 * @param {React.ReactNode} icon - Optional icon element to display
 * @param {string} iconPosition - Icon position: 'left' or 'right'
 * @param {boolean} disabled - Whether button is disabled
 * @param {boolean} loading - Whether button is in loading state
 * @param {string} className - Additional CSS classes
 * @param {React.ReactNode} children - Button content
 */
const Button = ({
  variant = 'primary',
  size = 'medium',
  icon = null,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  className = '',
  children,
  ...props
}) => {
  const baseClass = 'button';
  const variantClass = `button-${variant}`;
  const sizeClass = size !== 'medium' ? `button-${size}` : '';
  const classes = [baseClass, variantClass, sizeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {icon && iconPosition === 'left' && <span className="button-icon-left">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="button-icon-right">{icon}</span>}
    </button>
  );
};

export default Button;
