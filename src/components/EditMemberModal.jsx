import { useState, useEffect } from 'react';
import GenericModal from './GenericModal';
import dataService from '../services/dataService';
import { useToast } from '../contexts/ToastContext';
import './EditMemberModal.css';

const AVATAR_COLORS = [
  { name: 'Yellow', hex: '#FFF48D' },
  { name: 'Orange', hex: '#FCDD8C' },
  { name: 'Salmon', hex: '#F4B3BB' },
  { name: 'Pink', hex: '#DEB2FA' },
  { name: 'Purple', hex: '#B2AEFF' },
  { name: 'Blue', hex: '#BADAF8' },
  { name: 'Turquoise', hex: '#C1FDFD' },
  { name: 'Green', hex: '#D2FCC3' },
  { name: 'Gray', hex: '#ECECEC' },
];


const EditMemberModal = ({ 
  isOpen, 
  onClose, 
  member, 
  onUpdate, 
  onDelete 
}) => {
  const { showSuccess, showError, showConfirmation } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    avatarColor: '#FFF48D',
    schoolPlanImage: null,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // LLM extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [extractionError, setExtractionError] = useState('');
  const [llmSettings, setLlmSettings] = useState({
    enabled: false,
    apiKey: '',
    selectedModel: ''
  });
  
  // School schedule management
  const [hasSchoolSchedule, setHasSchoolSchedule] = useState(false);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [scheduleDeleteError, setScheduleDeleteError] = useState('');
  const [showScheduleDeleteConfirm, setShowScheduleDeleteConfirm] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        avatarColor: member.avatarColor || member.color || '#FFF48D',
        schoolPlanImage: member.schoolPlanImage || null,
      });
    }
    setShowDeleteConfirm(false);
    setExtractionResult(null);
    setExtractionError('');
    setActiveTab('basic'); // Reset to basic tab when member changes
  }, [member]);

  // Load LLM settings and check for school schedule when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLlmSettings();
      checkForSchoolSchedule();
    }
  }, [isOpen, member]);

  const loadLlmSettings = async () => {
    try {
      const settings = await dataService.getSettings();
      setLlmSettings({
        enabled: settings.llmIntegrationEnabled === 'true',
        apiKey: settings.anthropicApiKey || '',
        selectedModel: settings.selectedAnthropicModel || ''
      });
    } catch (error) {
      console.error('Error loading LLM settings:', error);
      // Fallback to localStorage
      setLlmSettings({
        enabled: localStorage.getItem('llmIntegrationEnabled') === 'true',
        apiKey: localStorage.getItem('anthropicApiKey') || '',
        selectedModel: localStorage.getItem('selectedAnthropicModel') || ''
      });
    }
  };

  const checkForSchoolSchedule = async () => {
    if (!member?.id) return;
    
    try {
      // Check if member has any activities with school schedule type
      const activities = await dataService.getActivities({ memberId: member.id });
      const schoolScheduleActivities = activities.filter(activity => 
        activity.description && activity.description.includes('[TYPE:school_schedule]')
      );
      const schoolActivities = activities.filter(activity => 
        activity.description && activity.description.includes('[TYPE:school_activity]')
      );
      setHasSchoolSchedule(schoolScheduleActivities.length > 0 || schoolActivities.length > 0);
    } catch (error) {
      console.error('Error checking for school schedule:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        showError('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB');
        return;
      }

      // For now, just store the file object. Later we'll implement actual upload
      setFormData(prev => ({
        ...prev,
        schoolPlanImage: file
      }));
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      schoolPlanImage: null
    }));
    setExtractionResult(null);
    setExtractionError('');
  };

  const handleExtractSchoolPlan = async () => {
    if (!formData.schoolPlanImage || !member?.id || !llmSettings.apiKey) {
      setExtractionError('Image, member, and API key are required for extraction');
      return;
    }

    setIsExtracting(true);
    setExtractionError('');
    setExtractionResult(null);

    try {
      const result = await dataService.extractSchoolPlan(
        member.id,
        formData.schoolPlanImage,
        llmSettings.apiKey
      );

      setExtractionResult(result);
      setExtractionError('');
      
      // Refresh school schedule status
      checkForSchoolSchedule();
      
      // Show success message
      showSuccess(
        `School plan imported successfully! Found ${result.savedData.schedules.length + result.savedData.activities.length} items.`
      );
      
    } catch (error) {
      console.error('Error extracting school plan:', error);
      setExtractionError(error.message || 'Failed to extract school plan');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDeleteSchoolSchedule = async () => {
    if (!member?.id) return;

    // Show inline confirmation instead of toast
    setShowScheduleDeleteConfirm(true);
    setScheduleDeleteError('');
  };

  const confirmDeleteSchedule = async () => {
    if (!member?.id) return;

    setIsDeletingSchedule(true);
    setScheduleDeleteError('');

    try {
      // Get all activities for this member
      const activities = await dataService.getActivities({ memberId: member.id });
      
      // Find school schedule and school activity entries
      const schoolScheduleActivities = activities.filter(activity => 
        activity.description && activity.description.includes('[TYPE:school_schedule]')
      );
      
      const schoolActivities = activities.filter(activity => 
        activity.description && activity.description.includes('[TYPE:school_activity]')
      );

      const totalSchoolEntries = [...schoolScheduleActivities, ...schoolActivities];

      // Delete each school-related activity
      for (const activity of totalSchoolEntries) {
        await dataService.deleteActivity(activity.id);
      }

      setHasSchoolSchedule(false);
      setScheduleDeleteError('');
      
      setShowScheduleDeleteConfirm(false);
      showSuccess(
        `School schedule deleted successfully.`
      );
      
    } catch (error) {
      console.error('Error deleting school schedule:', error);
      setScheduleDeleteError(error.message || 'Failed to delete school schedule');
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  const cancelDeleteSchedule = () => {
    setShowScheduleDeleteConfirm(false);
    setScheduleDeleteError('');
  };


  const handleSave = () => {
    if (formData.name.trim()) {
      const updatedMember = {
        ...member,
        name: formData.name.trim(),
        avatarColor: formData.avatarColor,
        schoolPlanImage: formData.schoolPlanImage,
      };
      onUpdate(updatedMember);
      onClose();
    }
  };

  const handleDelete = () => {
    onDelete(member.id);
    onClose();
  };

  const getInitials = (name) => {
    if (!name) return 'NN';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleModalClose = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!member) return null;

  return (
    <GenericModal 
      isOpen={isOpen} 
      onClose={handleModalClose} 
      title={`Edit ${member?.name || 'Family Member'}`}
    >
      <div className="edit-member-content">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Settings
          </button>
          <button
            className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Schedule
          </button>
          <button
            className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'basic' && (
            <>
              {/* Basic Information Section */}
              <div className="modal-section">
          <div className="section-header">
            <h3 className="section-title">Basic Information</h3>
            <p className="section-description">
              Update the member's name and avatar appearance
            </p>
          </div>

          <div className="basic-info-form">
            <div className="avatar-preview-section">
              <div className="avatar-preview" style={{ backgroundColor: formData.avatarColor }}>
                <span className="avatar-initials">
                  {getInitials(formData.name)}
                </span>
              </div>
              <div className="avatar-info">
                <label htmlFor="member-name" className="form-label">
                  Full Name
                </label>
                <input
                  type="text"
                  id="member-name"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="color-picker-section">
              <label className="form-label">Avatar Color</label>
              <div className="color-options">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color.hex}
                    className={`color-option ${
                      formData.avatarColor === color.hex ? 'selected' : ''
                    }`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => handleInputChange('avatarColor', color.hex)}
                    aria-label={`Select ${color.name}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
            </>
          )}

          {activeTab === 'schedule' && (
            <>
              {/* School Plan Section */}
        <div className="modal-section">
          <div className="section-header">
            <h3 className="section-title">School Plan</h3>
            <p className="section-description">
              Upload a picture of the weekly school schedule or plan
            </p>
          </div>

          <div className="school-plan-form">
            {formData.schoolPlanImage ? (
              <div className="image-preview-container">
                <div className="image-preview">
                  {formData.schoolPlanImage instanceof File ? (
                    <img
                      src={URL.createObjectURL(formData.schoolPlanImage)}
                      alt="School plan preview"
                      className="preview-image"
                    />
                  ) : (
                    <img
                      src={formData.schoolPlanImage}
                      alt="School plan"
                      className="preview-image"
                    />
                  )}
                </div>
                <div className="image-actions">
                  <span className="image-name">
                    {formData.schoolPlanImage instanceof File 
                      ? formData.schoolPlanImage.name 
                      : 'School Plan Image'
                    }
                  </span>
                  <div className="image-buttons">
                    {llmSettings.enabled && llmSettings.apiKey && (
                      <button
                        type="button"
                        className="button-extract"
                        onClick={handleExtractSchoolPlan}
                        disabled={isExtracting || !formData.schoolPlanImage}
                        aria-label="Import data from school plan"
                      >
                        {isExtracting ? (
                          <>
                            <svg className="extract-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416">
                                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                              </circle>
                            </svg>
                            Extracting...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Import
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      className="button-remove-image"
                      onClick={handleRemoveImage}
                      aria-label="Remove school plan image"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 4L4 12M4 4L12 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="upload-area">
                <input
                  type="file"
                  id="school-plan-upload"
                  className="file-input"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleFileUpload}
                />
                <label htmlFor="school-plan-upload" className="upload-label">
                  <div className="upload-icon">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 48 48"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M24 16V32M16 24H32"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="6"
                        y="6"
                        width="36"
                        height="36"
                        rx="5"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="upload-text">
                    <span className="upload-title">Upload School Plan</span>
                    <span className="upload-subtitle">
                      Click to select an image file (JPEG, PNG, or GIF)
                    </span>
                    <span className="upload-note">Maximum file size: 5MB</span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Extraction Status */}
          {extractionError && (
            <div className="extraction-status error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>{extractionError}</span>
            </div>
          )}

          {extractionResult && (
            <div className="extraction-status success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>
                School plan imported successfully
              </span>
            </div>
          )}

          {!llmSettings.enabled && formData.schoolPlanImage && (
            <div className="extraction-status info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Enable LLM Integration in Settings to extract data from school plans automatically</span>
            </div>
          )}
        </div>

        {/* School Schedule Management */}
        {hasSchoolSchedule && (
          <div className="modal-section">
            <div className="school-schedule-compact">
              <div className="schedule-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="22,4 12,14.01 9,11.01" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="schedule-text">School schedule imported</span>
              </div>

              <button
                type="button"
                className="button-delete-schedule-compact"
                onClick={handleDeleteSchoolSchedule}
                disabled={isDeletingSchedule}
                title={`Delete school schedule for ${member?.name || 'this member'}`}
              >
                {isDeletingSchedule ? (
                  <>
                    <svg className="delete-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416">
                        <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Delete
                  </>
                )}
              </button>
            </div>

            {scheduleDeleteError && (
              <div className="extraction-status error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>{scheduleDeleteError}</span>
              </div>
            )}

            {showScheduleDeleteConfirm && (
              <div className="schedule-delete-confirmation">
                <div className="confirmation-message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="#f59e0b" strokeWidth="2"/>
                    <line x1="12" y1="9" x2="12" y2="13" stroke="#f59e0b" strokeWidth="2"/>
                    <circle cx="12" cy="17" r="1" fill="#f59e0b"/>
                  </svg>
                  <span>
                    Delete <strong>{member?.name || 'this member'}</strong>'s school schedule?
                  </span>
                </div>
                <div className="confirmation-actions">
                  <button
                    type="button"
                    className="button button-danger-confirm"
                    onClick={confirmDeleteSchedule}
                    disabled={isDeletingSchedule}
                  >
                    {isDeletingSchedule ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary-small"
                    onClick={cancelDeleteSchedule}
                    disabled={isDeletingSchedule}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              {/* Advanced Settings Section */}
              <div className="modal-section">
                <div className="section-header">
                  <h3 className="section-title">Advanced Settings</h3>
                  <p className="section-description">
                    Dangerous operations that permanently affect this family member
                  </p>
                </div>

                <div className="advanced-settings-form">
                  <div className="danger-zone">
                    <div className="danger-zone-header">
                      <div className="danger-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="#ef4444" strokeWidth="2"/>
                          <line x1="12" y1="9" x2="12" y2="13" stroke="#ef4444" strokeWidth="2"/>
                          <circle cx="12" cy="17" r="1" fill="#ef4444"/>
                        </svg>
                      </div>
                      <div className="danger-zone-text">
                        <h4 className="danger-zone-title">Danger Zone</h4>
                        <p className="danger-zone-subtitle">
                          This action cannot be undone
                        </p>
                      </div>
                    </div>

                    <div className="danger-zone-actions">
                      {showDeleteConfirm ? (
                        <div className="delete-confirm-group">
                          <span className="delete-confirm-text">
                            Are you sure you want to delete <strong>{member?.name || 'this member'}</strong>?
                          </span>
                          
                          <div className="delete-warning">
                            <span className="delete-warning-title">This will permanently delete:</span>
                            <ul className="delete-warning-list">
                              <li>The family member profile</li>
                              <li>All associated activities and schedules</li>
                              <li>Any homework assignments</li>
                              <li>All related data</li>
                            </ul>
                          </div>
                          
                          <div className="delete-confirm-buttons">
                            <button
                              className="button button-secondary-small"
                              onClick={() => setShowDeleteConfirm(false)}
                            >
                              Cancel
                            </button>
                            <button
                              className="button button-danger-confirm"
                              onClick={handleDelete}
                            >
                              Yes, Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="button button-danger-advanced"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Delete Family Member
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          <div className="primary-actions">
            <button
              className="button button-primary"
              onClick={handleSave}
              disabled={!formData.name.trim()}
            >
              Save Changes
            </button>
            <button 
              className="button button-secondary" 
              onClick={handleModalClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </GenericModal>
  );
};

export default EditMemberModal;
