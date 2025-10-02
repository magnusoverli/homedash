# Mobile Interface Implementation Guide

## Overview

This document describes the mobile-first interface implementation for HomeDash, designed to provide an optimal touch experience on mobile devices while maintaining the existing desktop/tablet interface completely unchanged.

## Architecture Strategy

### Device-Based Routing

The application now uses **device detection to route users to appropriate interfaces**:

- **Mobile phones** → `MobileApp` (new touch-optimized interface)
- **Tablets & Desktops** → `DesktopApp` (existing interface, unchanged)

### File Structure

```
/src/
  /apps/
    - DesktopApp.jsx         # Existing interface (desktop/tablet)
    - MobileApp.jsx          # New mobile interface
  
  /components/
    /mobile/                 # Mobile-only components
      /navigation/
        - BottomTabBar.jsx   # Bottom tab navigation
      /screens/
        - MobileOverview.jsx # Main mobile screen
        - MobileTodayView.jsx
        - MobileSettings.jsx
    
    # Existing desktop components (unchanged)
    - Header.jsx
    - MainPage.jsx
    - Settings.jsx
    ... (all other existing components)
  
  /styles/
    /mobile/
      - mobile-variables.css # Mobile design system tokens
      - mobile-app.css       # Mobile base styles
    
    # Existing desktop styles (unchanged)
    - globals.css
  
  App.jsx                    # Root - routes by device type
```

## Implementation Details

### Phase 1: Infrastructure (✅ Complete)

#### 1. Device Detection Enhancement
- **File**: `src/hooks/useDeviceDetection.js` (already comprehensive)
- **Detects**: Mobile phones, tablets, desktop, touch capability, orientation
- **Returns**: `{ isMobile, isTablet, isDesktop, isTouch, deviceType, orientation }`

#### 2. App Routing Structure
- **File**: `src/App.jsx`
- **Logic**: 
  ```javascript
  const AppComponent = isMobile ? MobileApp : DesktopApp;
  return <AppComponent initialWeek={currentWeek} />;
  ```
- **Result**: Zero interference between interfaces

#### 3. Desktop App Wrapper
- **File**: `src/apps/DesktopApp.jsx`
- **Content**: Wraps existing Header + MainPage + Settings
- **Impact**: None - existing code moved as-is

#### 4. Mobile App Foundation
- **File**: `src/apps/MobileApp.jsx`
- **Features**:
  - Bottom tab navigation (Overview, Today, Settings)
  - Safe area support (iPhone notch, etc.)
  - Touch-optimized routing
  - Completely isolated from desktop

### Phase 1 Components (✅ Complete)

#### Bottom Tab Bar Navigation
- **File**: `src/components/mobile/navigation/BottomTabBar.jsx`
- **Design**:
  - Fixed at bottom (thumb-friendly)
  - 64px height (48px touch targets)
  - Dark background (#10011B)
  - Purple active state (#6704FF)
  - Haptic feedback on tap
- **Tabs**: Overview, Today, Settings

#### Mobile Overview Screen
- **File**: `src/components/mobile/screens/MobileOverview.jsx`
- **Current State**: Proof of concept with:
  - Sticky header with week navigation
  - Person carousel (placeholder)
  - Timeline placeholder
  - Floating "Today" button
  - Loads family members from API
  - Loading/error/empty states

#### Mobile Today View (Placeholder)
- **File**: `src/components/mobile/screens/MobileTodayView.jsx`
- **Status**: Placeholder screen for Phase 2

#### Mobile Settings (Placeholder)
- **File**: `src/components/mobile/screens/MobileSettings.jsx`
- **Status**: Placeholder with link to desktop settings (temporary)

### Mobile Design System

#### CSS Variables
- **File**: `src/styles/mobile/mobile-variables.css`
- **Includes**:
  - Layout dimensions (tab height, header height, touch targets)
  - Spacing system (4px base grid)
  - Brand colors (matching design manual)
  - Pastel colors for avatars/activities
  - Typography scale (mobile-optimized)
  - Border radius system (5px grid)
  - Shadows & elevation
  - Transitions & animations
  - Z-index layers
  - Timeline/carousel specific values

#### Base Styles
- **File**: `src/styles/mobile/mobile-app.css`
- **Features**:
  - Mobile app root container
  - Touch optimizations (tap highlight removal, fast tap)
  - Safe area support (iPhone notch)
  - Common mobile components (header, section, card, button)
  - Loading/empty states
  - Utilities (truncation, scrollbar hiding)
  - Accessibility (focus visible, screen reader)
  - Reduced motion support

## Design System Compliance

All mobile components follow the **HomeDash Design Manual**:

### Colors
- Primary Dark: `#10011B` (backgrounds, headers)
- Primary Purple: `#6704FF` (interactive elements, accents)
- Pastel Colors: Used for avatars and activity types
- White on Dark: Primary text approach for headers
- High contrast: WCAG AAA compliance

### Typography
- **Font Family**: TV 2 Sans Display (headings), TV 2 Sans Condensed (labels)
- **Mobile Scale**:
  - H1: 28px (page titles)
  - H2: 22px (section headers)
  - H3: 18px (card headers)
  - Body: 14px
  - Small: 12px
  - Labels: 11px

### Shapes & Corners
- **Border Radius**: 5px grid system
  - Small: 5px (icons)
  - Card: 8px
  - Card Large: 12px
  - Button: 24px (pill shape)
  - Circle: 50%

### Spacing
- **4px Base Grid**: XXS (4px) → XXL (32px)
- **Touch Targets**: Minimum 48x48px
- **Gutter**: 16px (mobile standard)

### Touch Optimizations
- 48x48px minimum touch targets
- No text selection on interactive elements
- Tap highlight color removed
- Fast tap response (touch-action: manipulation)
- Haptic feedback on navigation
- Active states: scale(0.96)

## Testing & Verification

### ✅ Build Success
```bash
npm run build
# ✓ 116 modules transformed
# ✓ built in 1.30s
```

### ✅ Docker Deployment
```bash
docker-compose up --build -d
# Both containers started successfully
# Frontend serving at http://localhost:3000
```

### ✅ No Linting Errors
All new files pass ESLint checks

### Desktop Interface Verification
**IMPORTANT**: Test that desktop interface is unchanged:

1. Open http://localhost:3000 on desktop browser
2. Verify existing Header, MainPage, and Settings work
3. No visual changes to desktop UI
4. All existing functionality works

### Mobile Interface Verification
1. Open http://localhost:3000 on mobile device or:
   - Chrome DevTools → Device Mode → iPhone 14 Pro
   - Firefox Responsive Design Mode
2. Should see new mobile interface:
   - Bottom tab bar navigation
   - Mobile header with week selector
   - Person carousel (placeholder)
   - Floating "Today" button
3. Navigation between tabs works
4. No desktop components visible

## Next Steps: Phase 2 Implementation

### High Priority (Weeks 2-3)

#### 1. Person Carousel with Swipe
- **File**: Create `src/components/mobile/timeline/PersonCarousel.jsx`
- **Features**:
  - Horizontal swipe between family members
  - Snap to center
  - Smooth momentum scrolling
  - Dot indicators
  - Touch/drag gestures

#### 2. Mobile Timeline Component
- **File**: Create `src/components/mobile/timeline/MobileTimeline.jsx`
- **Features**:
  - Hourly time scale (40px wide sidebar)
  - Activity blocks (touch-optimized)
  - Tap empty slot → create activity
  - Long-press block → quick actions
  - Drag to move/resize
  - Overlapping activity handling

#### 3. Activity Bottom Sheet Modal
- **File**: Create `src/components/mobile/modals/ActivityBottomSheet.jsx`
- **Features**:
  - Slides up from bottom (75% height)
  - Create/edit activities
  - Person selector
  - Time pickers (native iOS/Android)
  - Category selector (colored pills)
  - Swipe down to dismiss

#### 4. Task List with Drag Handle
- **File**: Create `src/components/mobile/timeline/TaskList.jsx`
- **Features**:
  - Collapsible task section
  - Drag handle to resize split (70/30, 60/40, etc.)
  - Swipe left to delete
  - Checkboxes for completion
  - Haptic feedback

### Medium Priority (Week 4)

#### 5. Today View Implementation
- **File**: Update `src/components/mobile/screens/MobileTodayView.jsx`
- **Features**:
  - "Now" section (large card)
  - "Next Up" section (compact cards)
  - "Later Today" section
  - "Completed" section (collapsed)
  - Multi-person activity view

#### 6. Mobile Settings Screen
- **File**: Update `src/components/mobile/screens/MobileSettings.jsx`
- **Features**:
  - Accordion-style sections
  - Person management (grid layout)
  - Integration toggles
  - Color customization
  - Profile editing modal

### Lower Priority (Week 5)

#### 7. Animations & Transitions
- Page transitions (slide left/right)
- Modal animations (slide up, fade)
- Micro-interactions (button press, checkmark draw)
- Loading skeletons

#### 8. Advanced Touch Gestures
- Pinch to zoom timeline
- Two-finger scroll for week navigation
- Long-press context menus
- Swipe gestures throughout

#### 9. Accessibility Polish
- Screen reader announcements
- Focus management in modals
- High contrast mode support
- Reduced motion compliance

## Performance Targets

- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **Smooth Scrolling**: 60fps
- **Touch Response**: <100ms
- **Bundle Size**: <400KB (combined desktop + mobile)

## Known Issues / Future Improvements

### Current Limitations
1. Timeline component not yet built (Phase 2)
2. Activity creation/editing not available on mobile yet
3. Settings screen redirects to desktop version (temporary)
4. No gesture support yet (Phase 2)

### Future Enhancements
1. Offline mode with service workers
2. Push notifications for upcoming activities
3. Dark mode support
4. Landscape optimization for larger phones
5. Tablet-specific interface (optional)
6. Accessibility improvements (voice control)

## Development Workflow

### Adding New Mobile Components
1. Create component in `/src/components/mobile/`
2. Use mobile design system variables
3. Prefix classes with `mobile-`
4. Import in appropriate mobile screen
5. Test on actual mobile devices

### Testing Mobile Changes
```bash
# Local development
npm run dev
# Open http://localhost:5173 in mobile device mode

# Production build
docker-compose up --build
# Open http://localhost:3000
```

### Debugging Device Detection
Add to any component:
```javascript
const { isMobile, isTablet, deviceType } = useDeviceDetection();
console.log('Device:', { isMobile, isTablet, deviceType });
```

## Deployment Checklist

- [ ] Test on iOS Safari (iPhone 12+)
- [ ] Test on Android Chrome (Pixel 6+)
- [ ] Test on small screens (<375px width)
- [ ] Test landscape mode
- [ ] Verify safe area support (notch devices)
- [ ] Test with slow 3G network
- [ ] Verify haptic feedback works
- [ ] Check touch target sizes (all 48px+)
- [ ] Test accessibility with screen reader
- [ ] Verify reduced motion works
- [ ] Test desktop interface unchanged
- [ ] Monitor bundle size impact

## Support & Documentation

### Key Files
- This file: `/MOBILE_IMPLEMENTATION.md`
- Design plan: See earlier in conversation
- Design manual: `/design_manual.md`
- Agent guide: `/AGENTS.md`

### Questions?
1. Check design manual for brand compliance
2. Reference this document for architecture
3. Review existing mobile components for patterns
4. Test on real devices early and often

---

**Status**: Phase 1 Complete ✅
**Next**: Build Person Carousel & Timeline (Phase 2)
**Timeline**: 4-6 weeks to full mobile feature parity


