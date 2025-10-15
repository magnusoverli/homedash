import { useState, useEffect, useRef } from 'react';
import {
  CloseIcon,
  TrashIcon,
  WarningIcon,
  UploadIcon,
  LoadingSpinner,
} from '../../icons';
import { AVATAR_COLORS } from '../../../constants/colors';
import { validateImageFile } from '../../../utils/fileValidation';
import { getApiErrorMessage } from '../../../utils/errorUtils';
import API_ENDPOINTS from '../../../config/api';
import { getAccessToken } from '../../../services/authService';
import dataService from '../../../services/dataService';
import './PersonProfileModal.css';

/**
 * Person Profile Modal (Bottom Sheet)
 *
 * Sliding modal for creating and editing family members on mobile.
 * Features:
 * - Create new person or edit existing
 * - Color picker for avatars
 * - Form validation
 * - Delete confirmation
 * - Swipe-down to dismiss
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onSave - Callback when person is saved
 * @param {Function} props.onDelete - Callback when person is deleted
 * @param {Object} props.person - Person to edit (null for new)
 */
const PersonProfileModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  person = null,
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    color: AVATAR_COLORS[0].hex,
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Spond integration state
  const [spondEnabled, setSpondEnabled] = useState(false);
  const [spondEmail, setSpondEmail] = useState('');
  const [spondPassword, setSpondPassword] = useState('');
  const [isTestingSpond, setIsTestingSpond] = useState(false);
  const [spondAuthState, setSpondAuthState] = useState({
    hasCredentials: false,
    authenticated: false,
    email: '',
  });

  // Municipal calendar state
  const [calendarUrl, setCalendarUrl] = useState('');
  const [isImportingCalendar, setIsImportingCalendar] = useState(false);
  const [calendarInfo, setCalendarInfo] = useState(null);

  const modalRef = useRef(null);
  const titleInputRef = useRef(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isDragging = useRef(false);

  // Initialize form data when person changes
  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        color: person.color || person.avatarColor || AVATAR_COLORS[0].hex,
      });
      // Load integration data for existing person
      if (person.id) {
        loadIntegrationData(person.id);
      }
    } else {
      // New person - reset form
      setFormData({
        name: '',
        color: AVATAR_COLORS[0].hex,
      });
    }
    setErrors({});
    setShowDeleteConfirm(false);
    setActiveTab('basic');
  }, [person, isOpen]);

  // Load integration data
  const loadIntegrationData = async memberId => {
    try {
      // Load Spond auth state
      const spondState = await dataService.getSpondAuthState(memberId);
      if (spondState) {
        setSpondAuthState(spondState);
        setSpondEnabled(spondState.hasCredentials || spondState.authenticated);
      }

      // Load calendar info
      const calendarData = await dataService.getCalendarInfo(memberId);
      if (calendarData) {
        setCalendarInfo(calendarData);
        setCalendarUrl(calendarData.url || '');
      }
    } catch (error) {
      console.error('Error loading integration data:', error);
    }
  };

  // Auto-focus on title when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Handle form input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.color) {
      newErrors.color = 'Please select a color';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) {
      // Haptic feedback for error
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
      return;
    }

    setIsSaving(true);

    try {
      const personData = {
        name: formData.name.trim(),
        color: formData.color,
      };

      if (person?.id) {
        personData.id = person.id;
      }

      await onSave(personData);

      // Haptic feedback for success
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      onClose();
    } catch (error) {
      console.error('Error saving person:', error);
      setErrors({ submit: error.message || 'Failed to save person' });

      // Haptic feedback for error
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!person?.id) return;

    setIsDeleting(true);

    try {
      await onDelete(person.id);

      // Haptic feedback for success
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      onClose();
    } catch (error) {
      console.error('Error deleting person:', error);
      setErrors({ submit: error.message || 'Failed to delete person' });

      // Haptic feedback for error
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = e => {
    if (e.target.closest('.person-modal-content')) return;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = e => {
    if (!isDragging.current) return;
    touchCurrentY.current = e.touches[0].clientY;
    const diff = touchCurrentY.current - touchStartY.current;

    if (diff > 0 && modalRef.current) {
      modalRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    const diff = touchCurrentY.current - touchStartY.current;

    if (diff > 100 && modalRef.current) {
      // Close if dragged more than 100px
      modalRef.current.style.transform = 'translateY(100%)';
      setTimeout(onClose, 200);
    } else if (modalRef.current) {
      // Snap back
      modalRef.current.style.transform = 'translateY(0)';
    }

    isDragging.current = false;
    touchStartY.current = 0;
    touchCurrentY.current = 0;
  };

  if (!isOpen) return null;

  const isEditMode = !!person?.id;

  return (
    <div className="person-modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="person-modal"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="person-modal-handle" />

        {/* Header */}
        <div className="person-modal-header">
          <h2 className="person-modal-title">
            {isEditMode ? 'Edit Person' : 'Add Person'}
          </h2>
          <button
            className="person-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon size={24} />
          </button>
        </div>

        {/* Tab Navigation (only for edit mode) */}
        {isEditMode && (
          <div className="person-modal-tabs">
            <button
              type="button"
              className={`person-tab ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              Basic
            </button>
            <button
              type="button"
              className={`person-tab ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
            >
              Integrations
            </button>
          </div>
        )}

        {/* Content */}
        <div className="person-modal-content">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSave();
            }}
          >
            {/* Basic Tab */}
            {activeTab === 'basic' && (
              <>
                {/* Name Input */}
                <div className="person-form-group">
                  <label htmlFor="person-name" className="person-form-label">
                    Name *
                  </label>
                  <input
                    ref={titleInputRef}
                    id="person-name"
                    type="text"
                    className={`person-form-input ${errors.name ? 'error' : ''}`}
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="Enter name"
                    disabled={isSaving}
                  />
                  {errors.name && (
                    <span className="person-form-error">{errors.name}</span>
                  )}
                </div>

                {/* Color Picker */}
                <div className="person-form-group">
                  <label className="person-form-label">Avatar Color *</label>
                  <div className="person-color-grid">
                    {AVATAR_COLORS.map(color => (
                      <button
                        key={color.hex}
                        type="button"
                        className={`person-color-option ${
                          formData.color === color.hex ? 'selected' : ''
                        }`}
                        style={{ backgroundColor: color.hex }}
                        onClick={() => handleChange('color', color.hex)}
                        disabled={isSaving}
                        aria-label={`Select ${color.name}`}
                      >
                        {formData.color === color.hex && (
                          <span className="person-color-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {errors.color && (
                    <span className="person-form-error">{errors.color}</span>
                  )}
                </div>

                {/* Preview */}
                <div className="person-form-group">
                  <label className="person-form-label">Preview</label>
                  <div className="person-preview">
                    <div
                      className="person-preview-avatar"
                      style={{ backgroundColor: formData.color }}
                    >
                      {formData.name
                        ? formData.name.charAt(0).toUpperCase()
                        : '?'}
                    </div>
                    <span className="person-preview-name">
                      {formData.name || 'Enter a name'}
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {errors.submit && (
                  <div className="person-form-error-banner">
                    <WarningIcon size={20} />
                    <span>{errors.submit}</span>
                  </div>
                )}

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                  <div className="person-delete-confirm">
                    <div className="person-delete-confirm-content">
                      <WarningIcon size={24} color="#F4B3BB" />
                      <p className="person-delete-confirm-text">
                        Delete <strong>{person?.name}</strong>? This will also
                        delete all their activities and homework.
                      </p>
                      <div className="person-delete-confirm-actions">
                        <button
                          type="button"
                          className="person-button person-button--secondary"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="person-button person-button--danger"
                          onClick={handleDelete}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions (Basic Tab) */}
                {activeTab === 'basic' && (
                  <div className="person-modal-actions">
                    {isEditMode && !showDeleteConfirm && (
                      <button
                        type="button"
                        className="person-button person-button--danger-outline"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isSaving}
                      >
                        <TrashIcon size={18} />
                        Delete
                      </button>
                    )}

                    {!showDeleteConfirm && (
                      <div className="person-modal-actions-main">
                        <button
                          type="button"
                          className="person-button person-button--secondary"
                          onClick={onClose}
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="person-button person-button--primary"
                          disabled={isSaving}
                        >
                          {isSaving
                            ? 'Saving...'
                            : isEditMode
                              ? 'Save Changes'
                              : 'Add Person'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && isEditMode && (
              <>
                {/* Spond Integration Section */}
                <div className="person-form-section">
                  <h3 className="person-section-title">⚽ Spond Integration</h3>
                  <p className="person-section-description">
                    Automatically sync activities from sports clubs
                  </p>

                  {spondAuthState.authenticated ? (
                    <div className="person-integration-status person-integration-status--success">
                      <div className="person-status-icon">✅</div>
                      <div className="person-status-text">
                        <strong>Connected</strong>
                        <span className="person-status-detail">
                          {spondAuthState.email}
                        </span>
                      </div>
                    </div>
                  ) : spondAuthState.hasCredentials ? (
                    <div className="person-integration-status person-integration-status--warning">
                      <div className="person-status-icon">🔑</div>
                      <div className="person-status-text">
                        <strong>Credentials Stored</strong>
                        <span className="person-status-detail">
                          {spondAuthState.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="person-integration-status person-integration-status--neutral">
                      <div className="person-status-icon">⚪</div>
                      <div className="person-status-text">
                        <strong>Not Connected</strong>
                        <span className="person-status-detail">
                          No Spond account linked
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="person-link-button"
                    onClick={() => {
                      window.location.href = '/settings';
                    }}
                  >
                    Configure on Desktop →
                  </button>
                </div>

                {/* Municipal Calendar Section */}
                <div className="person-form-section">
                  <h3 className="person-section-title">
                    📅 Municipal Calendar
                  </h3>
                  <p className="person-section-description">
                    Sync events from municipal iCal calendars
                  </p>

                  {calendarInfo && calendarInfo.lastSynced ? (
                    <div className="person-integration-status person-integration-status--success">
                      <div className="person-status-icon">✅</div>
                      <div className="person-status-text">
                        <strong>Connected</strong>
                        <span className="person-status-detail">
                          {calendarInfo.eventCount || 0} events synced
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="person-integration-status person-integration-status--neutral">
                      <div className="person-status-icon">⚪</div>
                      <div className="person-status-text">
                        <strong>Not Connected</strong>
                        <span className="person-status-detail">
                          No calendar linked
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="person-link-button"
                    onClick={() => {
                      window.location.href = '/settings';
                    }}
                  >
                    Configure on Desktop →
                  </button>
                </div>

                {/* School Schedule Section */}
                <div className="person-form-section">
                  <h3 className="person-section-title">📚 School Schedule</h3>
                  <p className="person-section-description">
                    Upload school plan image for LLM extraction
                  </p>

                  <div className="person-integration-status person-integration-status--neutral">
                    <div className="person-status-icon">💡</div>
                    <div className="person-status-text">
                      <strong>Desktop Only</strong>
                      <span className="person-status-detail">
                        File upload and AI extraction available on desktop
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="person-link-button"
                    onClick={() => {
                      window.location.href = '/settings';
                    }}
                  >
                    Upload on Desktop →
                  </button>
                </div>

                {/* Close button for integrations tab */}
                <div className="person-modal-actions">
                  <button
                    type="button"
                    className="person-button person-button--primary"
                    onClick={onClose}
                    style={{ width: '100%' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonProfileModal;
