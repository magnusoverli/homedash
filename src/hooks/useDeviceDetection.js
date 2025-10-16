import { useState, useEffect } from 'react';
import {
  isMobilePhone,
  isTablet,
  isTouchDevice,
  getDeviceType,
  supportsHover,
  getOrientation,
} from '../utils/deviceDetection';

/**
 * Custom hook for device detection with reactive updates
 *
 * Detects device type and updates on window resize or orientation change
 *
 * @returns {Object} Device detection state
 * @property {boolean} isMobile - True if device is a mobile phone
 * @property {boolean} isTablet - True if device is a tablet
 * @property {boolean} isDesktop - True if device is a desktop
 * @property {boolean} isTouch - True if device has touch capability
 * @property {boolean} canHover - True if device supports hover
 * @property {string} deviceType - 'mobile' | 'tablet' | 'desktop'
 * @property {string} orientation - 'portrait' | 'landscape'
 *
 * @example
 * function MyComponent() {
 *   const { isMobile, isTouch, orientation } = useDeviceDetection();
 *
 *   if (isMobile) {
 *     return <MobileLayout />;
 *   }
 *   return <DesktopLayout />;
 * }
 */
export const useDeviceDetection = () => {
  const [deviceState, setDeviceState] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    canHover: true,
    deviceType: 'desktop',
    orientation: 'landscape',
    isInitialized: false, // Track if detection has run
  });

  useEffect(() => {
    const updateDeviceState = () => {
      const isMobile = isMobilePhone();
      const tablet = isTablet();
      const touch = isTouchDevice();
      const hover = supportsHover();
      const deviceType = getDeviceType();
      const orientation = getOrientation();

      setDeviceState({
        isMobile,
        isTablet: tablet,
        isDesktop: !isMobile && !tablet,
        isTouch: touch,
        canHover: hover,
        deviceType,
        orientation,
        isInitialized: true, // Mark as initialized
      });
    };

    // Initial detection
    updateDeviceState();

    // Update on resize
    window.addEventListener('resize', updateDeviceState);

    // Update on orientation change
    window.addEventListener('orientationchange', updateDeviceState);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDeviceState);
      window.removeEventListener('orientationchange', updateDeviceState);
    };
  }, []);

  return deviceState;
};

export default useDeviceDetection;
