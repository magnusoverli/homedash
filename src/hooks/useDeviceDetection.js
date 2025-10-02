import { useState, useEffect } from 'react';
import {
  isMobilePhone,
  isTablet,
  isTouchDevice,
  getDeviceType,
  supportsHover,
  hasCoarsePointer,
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

/**
 * Simplified hook that only detects if device is mobile
 * More performant for components that only need mobile detection
 * 
 * @returns {boolean} True if device is a mobile phone
 * 
 * @example
 * function MyComponent() {
 *   const isMobile = useIsMobile();
 *   
 *   return isMobile ? <MobileView /> : <DesktopView />;
 * }
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobilePhone());
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
};

/**
 * Hook to detect touch capability
 * Useful for enabling/disabling touch-specific features
 * 
 * @returns {boolean} True if device supports touch
 * 
 * @example
 * function SwipeableCard() {
 *   const isTouch = useIsTouch();
 *   
 *   if (!isTouch) return <Card />;
 *   
 *   return <SwipeableCard />;
 * }
 */
export const useIsTouch = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  return isTouch;
};

/**
 * Hook to track device orientation
 * Updates on orientation change
 * 
 * @returns {Object} Orientation state
 * @property {string} orientation - 'portrait' | 'landscape'
 * @property {boolean} isPortrait - True if device is in portrait mode
 * @property {boolean} isLandscape - True if device is in landscape mode
 * 
 * @example
 * function OrientationAwareComponent() {
 *   const { orientation, isPortrait } = useOrientation();
 *   
 *   return (
 *     <div className={`layout-${orientation}`}>
 *       {isPortrait ? <VerticalLayout /> : <HorizontalLayout />}
 *     </div>
 *   );
 * }
 */
export const useOrientation = () => {
  const [orientation, setOrientation] = useState(getOrientation());

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(getOrientation());
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  };
};

/**
 * Hook to detect if device supports hover
 * Useful for disabling hover effects on touch devices
 * 
 * @returns {boolean} True if device supports hover
 * 
 * @example
 * function HoverCard() {
 *   const canHover = useCanHover();
 *   
 *   return (
 *     <div className={canHover ? 'hover-enabled' : 'touch-enabled'}>
 *       Card content
 *     </div>
 *   );
 * }
 */
export const useCanHover = () => {
  const [canHover, setCanHover] = useState(true);

  useEffect(() => {
    setCanHover(supportsHover());
  }, []);

  return canHover;
};

/**
 * Hook to detect pointer type (coarse = touch, fine = mouse)
 * 
 * @returns {Object} Pointer type state
 * @property {boolean} isCoarse - True if primary pointer is coarse (touch)
 * @property {boolean} isFine - True if primary pointer is fine (mouse)
 * 
 * @example
 * function InteractiveElement() {
 *   const { isCoarse } = usePointerType();
 *   
 *   return (
 *     <button className={isCoarse ? 'large-touch-target' : 'normal-size'}>
 *       Click me
 *     </button>
 *   );
 * }
 */
export const usePointerType = () => {
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    setIsCoarse(hasCoarsePointer());
  }, []);

  return {
    isCoarse,
    isFine: !isCoarse,
  };
};

export default useDeviceDetection;

