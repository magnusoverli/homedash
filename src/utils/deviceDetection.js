/**
 * Device Detection Utilities
 * 
 * Provides reliable mobile device detection using multiple methods:
 * - Touch capability detection
 * - Viewport size detection
 * - User agent detection
 * 
 * @example
 * import { isMobilePhone, isTouchDevice, isTablet } from './utils/deviceDetection';
 * 
 * if (isMobilePhone()) {
 *   // Show mobile-specific UI
 * }
 */

/**
 * Check if device has touch capability
 * @returns {boolean} True if device supports touch input
 */
export const isTouchDevice = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.DocumentTouch && document instanceof window.DocumentTouch)
  );
};

/**
 * Check if viewport is mobile-sized
 * @param {number} breakpoint - Max width in pixels (default: 768)
 * @returns {boolean} True if viewport is mobile-sized
 */
export const isMobileViewport = (breakpoint = 768) => {
  return window.innerWidth <= breakpoint;
};

/**
 * Check if device is a tablet-sized device
 * @returns {boolean} True if viewport is tablet-sized (768-1200px)
 */
export const isTabletViewport = () => {
  const width = window.innerWidth;
  return width > 768 && width <= 1200;
};

/**
 * Check if user agent indicates a mobile device
 * @returns {boolean} True if user agent matches mobile patterns
 */
export const isMobileUserAgent = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Check if user agent indicates a phone (not tablet)
 * @returns {boolean} True if user agent matches phone patterns
 */
export const isPhoneUserAgent = () => {
  return /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Comprehensive mobile phone detection
 * Combines touch detection, screen size, and user agent
 * 
 * @returns {boolean} True if device is likely a mobile phone
 */
export const isMobilePhone = () => {
  const hasTouch = isTouchDevice();
  const isSmallScreen = isMobileViewport(768);
  const isPhoneUA = isPhoneUserAgent();

  // Mobile phone = touch + small screen + phone user agent
  // At least 2 out of 3 should be true for reliability
  const indicators = [hasTouch, isSmallScreen, isPhoneUA];
  const mobileScore = indicators.filter(Boolean).length;

  return mobileScore >= 2;
};

/**
 * Comprehensive tablet detection
 * 
 * @returns {boolean} True if device is likely a tablet
 */
export const isTablet = () => {
  const hasTouch = isTouchDevice();
  const isTabletSize = isTabletViewport();
  const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);

  // Tablet = touch + tablet size OR tablet user agent
  return (hasTouch && isTabletSize) || isTabletUA;
};

/**
 * Get device type as a string
 * @returns {'mobile' | 'tablet' | 'desktop'} Device type
 */
export const getDeviceType = () => {
  if (isMobilePhone()) return 'mobile';
  if (isTablet()) return 'tablet';
  return 'desktop';
};

/**
 * Check if device supports hover (has a mouse/trackpad)
 * Note: This is a feature check, not device detection
 * @returns {boolean} True if device supports hover
 */
export const supportsHover = () => {
  return window.matchMedia('(hover: hover)').matches;
};

/**
 * Check if device has a coarse pointer (touch)
 * @returns {boolean} True if primary pointer is coarse
 */
export const hasCoarsePointer = () => {
  return window.matchMedia('(pointer: coarse)').matches;
};

/**
 * Get device orientation
 * @returns {'portrait' | 'landscape'} Current orientation
 */
export const getOrientation = () => {
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
};

/**
 * Check if device is in portrait mode
 * @returns {boolean} True if device is in portrait orientation
 */
export const isPortrait = () => {
  return getOrientation() === 'portrait';
};

/**
 * Check if device is in landscape mode
 * @returns {boolean} True if device is in landscape orientation
 */
export const isLandscape = () => {
  return getOrientation() === 'landscape';
};

