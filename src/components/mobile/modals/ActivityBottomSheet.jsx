import { useState, useEffect, useRef } from 'react';
import { CloseIcon } from '../../icons';
import { CATEGORIES } from '../../../constants/colors';
import './ActivityBottomSheet.css';

/**
 * Activity Bottom Sheet Modal
 * 
 * Sliding modal for creating and editing activities on mobile.
 * Slides up from bottom, takes 85% of screen height.
 * 
 * Features:
 * - Create new activity or edit existing
 * - Native-style time pickers
 * - Category selection with colored pills
 * - Form validation
 * - Swipe-down to dismiss
 * - Auto-focus on title
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onSave - Callback when activity is saved
 * @param {Object} props.activity - Activity to edit (null for new)
 * @param {Array} props.members - Array of family members
 * @param {string} props.selectedMemberId - Pre-selected member ID
 * @param {string} props.prefilledDate - Pre-filled date (YYYY-MM-DD)
 * @param {string} props.prefilledStartTime - Pre-filled start time (HH:MM)
 */
const ActivityBottomSheet = ({
  isOpen,
  onClose,
  onSave,
  activity = null,
  members = [],
  selectedMemberId = null,
  prefilledDate = null,
  prefilledStartTime = null,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    memberId: selectedMemberId || '',
    date: prefilledDate || '',
    startTime: prefilledStartTime || '',
    endTime: '',
    category: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const titleInputRef = useRef(null);
  const sheetRef = useRef(null);

  // Initialize form when modal opens or activity changes
  useEffect(() => {
    if (isOpen) {
      if (activity) {
        // Edit mode - populate existing activity
        setFormData({
          title: activity.title || '',
          memberId: activity.memberId || selectedMemberId || '',
          date: activity.date || prefilledDate || '',
          startTime: activity.startTime || '',
          endTime: activity.endTime || '',
          category: activity.category || '',
          description: activity.description || '',
        });
      } else {
        // Create mode - use prefilled values or defaults
        const now = new Date();
        const currentHour = now.getHours();
        const defaultStartTime = prefilledStartTime || `${currentHour.toString().padStart(2, '0')}:00`;
        const defaultEndTime = `${(currentHour + 1).toString().padStart(2, '0')}:00`;
        
        setFormData({
          title: '',
          memberId: selectedMemberId || (members[0]?.id || ''),
          date: prefilledDate || new Date().toISOString().split('T')[0],
          startTime: defaultStartTime,
          endTime: defaultEndTime,
          category: '',
          description: '',
        });
      }
      
      setErrors({});
      
      // Auto-focus title input after animation
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }, 300);
    }
  }, [isOpen, activity, selectedMemberId, prefilledDate, prefilledStartTime, members]);

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.memberId) {
      newErrors.memberId = 'Please select a person';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }
    
    // Check time logic
    if (formData.startTime && formData.endTime) {
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const [endHour, endMin] = formData.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        newErrors.endTime = 'End time must be after start time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) {
      // Haptic feedback for error
      if (navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
      }
      return;
    }
    
    setIsSaving(true);
    
    try {
      const activityData = {
        ...formData,
        id: activity?.id,
      };
      
      await onSave(activityData);
      
      // Haptic feedback for success
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving activity:', error);
      setErrors({ submit: 'Failed to save activity. Please try again.' });
      
      // Haptic feedback for error
      if (navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle swipe to dismiss
  const handleTouchStart = (e) => {
    if (e.target.closest('.activity-sheet-content')) {
      setDragStartY(e.touches[0].clientY);
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY;
    
    // Only allow downward drag
    if (deltaY > 0) {
      setDragCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If dragged more than 150px, close
    if (dragCurrentY > 150) {
      onClose();
    }
    
    setDragCurrentY(0);
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const translateY = isDragging ? dragCurrentY : 0;

  return (
    <div 
      className="activity-sheet-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-sheet-title"
    >
      <div
        ref={sheetRef}
        className={`activity-sheet ${isDragging ? 'activity-sheet--dragging' : ''}`}
        style={{ transform: `translateY(${translateY}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="activity-sheet-handle">
          <div className="activity-sheet-handle-bar" />
        </div>

        {/* Header */}
        <div className="activity-sheet-header">
          <h2 id="activity-sheet-title" className="activity-sheet-title">
            {activity ? 'Edit Activity' : 'New Activity'}
          </h2>
          <button
            className="activity-sheet-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <CloseIcon size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="activity-sheet-content">
          <form className="activity-sheet-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* Title */}
            <div className="form-group">
              <label htmlFor="activity-title" className="form-label">
                Title <span className="required">*</span>
              </label>
              <input
                ref={titleInputRef}
                type="text"
                id="activity-title"
                className={`form-input ${errors.title ? 'form-input--error' : ''}`}
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="What are you doing?"
                maxLength={100}
              />
              {errors.title && (
                <span className="form-error">{errors.title}</span>
              )}
            </div>

            {/* Person selector */}
            {members.length > 1 && (
              <div className="form-group">
                <label htmlFor="activity-member" className="form-label">
                  Person <span className="required">*</span>
                </label>
                <select
                  id="activity-member"
                  className={`form-select ${errors.memberId ? 'form-input--error' : ''}`}
                  value={formData.memberId}
                  onChange={(e) => handleChange('memberId', e.target.value)}
                >
                  <option value="">Select person</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                {errors.memberId && (
                  <span className="form-error">{errors.memberId}</span>
                )}
              </div>
            )}

            {/* Date */}
            <div className="form-group">
              <label htmlFor="activity-date" className="form-label">
                Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="activity-date"
                className={`form-input ${errors.date ? 'form-input--error' : ''}`}
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
              />
              {errors.date && (
                <span className="form-error">{errors.date}</span>
              )}
            </div>

            {/* Time range */}
            <div className="form-row">
              <div className="form-group form-group--half">
                <label htmlFor="activity-start-time" className="form-label">
                  Start <span className="required">*</span>
                </label>
                <input
                  type="time"
                  id="activity-start-time"
                  className={`form-input ${errors.startTime ? 'form-input--error' : ''}`}
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                />
                {errors.startTime && (
                  <span className="form-error">{errors.startTime}</span>
                )}
              </div>

              <div className="form-group form-group--half">
                <label htmlFor="activity-end-time" className="form-label">
                  End <span className="required">*</span>
                </label>
                <input
                  type="time"
                  id="activity-end-time"
                  className={`form-input ${errors.endTime ? 'form-input--error' : ''}`}
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                />
                {errors.endTime && (
                  <span className="form-error">{errors.endTime}</span>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">Category (optional)</label>
              <div className="category-grid">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`category-pill ${formData.category === cat.value ? 'category-pill--active' : ''}`}
                    style={{
                      backgroundColor: formData.category === cat.value ? cat.color : 'transparent',
                      borderColor: cat.color,
                    }}
                    onClick={() => handleChange('category', formData.category === cat.value ? '' : cat.value)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="activity-description" className="form-label">
                Notes (optional)
              </label>
              <textarea
                id="activity-description"
                className="form-textarea"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Add notes or details..."
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Submit error */}
            {errors.submit && (
              <div className="form-error form-error--submit">{errors.submit}</div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="activity-sheet-footer">
          <button
            type="button"
            className="activity-sheet-button activity-sheet-button--secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="activity-sheet-button activity-sheet-button--primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityBottomSheet;


