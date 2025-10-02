import { useState, useRef, useEffect } from 'react';
import './PersonCarousel.css';

/**
 * Person Carousel
 * 
 * Swipeable horizontal carousel for switching between family members.
 * Uses touch gestures and momentum scrolling with snap points.
 * 
 * Features:
 * - Touch/swipe to navigate
 * - Snap to center
 * - Momentum scrolling
 * - Dot indicators
 * - Keyboard navigation support
 * 
 * @param {Object} props
 * @param {Array} props.members - Array of family member objects
 * @param {number} props.currentIndex - Currently visible member index
 * @param {Function} props.onIndexChange - Callback when member changes
 * @param {Function} props.renderMember - Render function for member content
 */
const PersonCarousel = ({ 
  members, 
  currentIndex, 
  onIndexChange,
  renderMember 
}) => {
  const carouselRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Scroll to current index when it changes
  useEffect(() => {
    if (carouselRef.current && members.length > 0) {
      const cardWidth = carouselRef.current.offsetWidth;
      const targetScroll = currentIndex * cardWidth;
      
      carouselRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, members.length]);

  // Handle scroll snap to detect current card
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let scrollTimeout;
    const handleScroll = () => {
      // Clear previous timeout
      clearTimeout(scrollTimeout);
      
      // Wait for scroll to finish
      scrollTimeout = setTimeout(() => {
        const cardWidth = carousel.offsetWidth;
        const scrollLeft = carousel.scrollLeft;
        const newIndex = Math.round(scrollLeft / cardWidth);
        
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < members.length) {
          onIndexChange(newIndex);
          
          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(10);
          }
        }
      }, 150);
    };

    carousel.addEventListener('scroll', handleScroll);
    return () => {
      carousel.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentIndex, members.length, onIndexChange]);

  // Touch handlers for custom drag behavior
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const x = e.touches[0].pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse handlers for desktop testing
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
    carouselRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (carouselRef.current) {
      carouselRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (carouselRef.current) {
        carouselRef.current.style.cursor = 'grab';
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      onIndexChange(currentIndex - 1);
    } else if (e.key === 'ArrowRight' && currentIndex < members.length - 1) {
      e.preventDefault();
      onIndexChange(currentIndex + 1);
    }
  };

  const handleIndicatorClick = (index) => {
    onIndexChange(index);
  };

  if (members.length === 0) {
    return null;
  }

  return (
    <div className="person-carousel-container">
      <div
        ref={carouselRef}
        className="person-carousel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Family members carousel"
        aria-live="polite"
      >
        {members.map((member, index) => (
          <div
            key={member.id}
            className={`person-carousel-card ${index === currentIndex ? 'person-carousel-card--active' : ''}`}
            role="group"
            aria-label={`${member.name}'s schedule`}
            aria-hidden={index !== currentIndex}
          >
            {renderMember(member, index === currentIndex)}
          </div>
        ))}
      </div>

      {/* Carousel indicators */}
      {members.length > 1 && (
        <div className="person-carousel-indicators" role="tablist" aria-label="Family members">
          {members.map((member, index) => (
            <button
              key={member.id}
              className={`person-carousel-dot ${index === currentIndex ? 'person-carousel-dot--active' : ''}`}
              onClick={() => handleIndicatorClick(index)}
              role="tab"
              aria-label={`View ${member.name}'s schedule`}
              aria-selected={index === currentIndex}
              style={{
                backgroundColor: index === currentIndex 
                  ? 'var(--mobile-color-primary-purple)' 
                  : member.avatarColor || 'var(--mobile-color-light-gray)'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonCarousel;


