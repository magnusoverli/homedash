import { useState, useEffect } from 'react';
import GenericModal from './GenericModal';
import dataService from '../services/dataService';
import { useToast } from '../contexts/ToastContext';
import API_ENDPOINTS from '../config/api';
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

const EditMemberModal = ({ isOpen, onClose, member, onUpdate, onDelete }) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    avatarColor: '#FFF48D',
    schoolPlanImage: null,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // LLM extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [llmSettings, setLlmSettings] = useState({
    enabled: false,
    apiKey: '',
    selectedModel: '',
  });

  // School schedule management
  const [hasSchoolSchedule, setHasSchoolSchedule] = useState(false);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [showScheduleDeleteConfirm, setShowScheduleDeleteConfirm] =
    useState(false);

  // Spond integration state
  const [spondIntegrationEnabled, setSpondIntegrationEnabled] = useState(false);
  const [spondEmail, setSpondEmail] = useState('');
  const [spondPassword, setSpondPassword] = useState('');
  const [isTestingSpondCredentials, setIsTestingSpondCredentials] =
    useState(false);
  const [spondAuthState, setSpondAuthState] = useState({
    hasCredentials: false,
    authenticated: false,
    email: '',
    lastAuthenticated: null,
    userData: null,
  });
  const [isLoadingSpondState, setIsLoadingSpondState] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [groupsData, setGroupsData] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);

  // Municipal calendar state
  const [calendarUrl, setCalendarUrl] = useState('');
  const [isImportingCalendar, setIsImportingCalendar] = useState(false);
  const [calendarLastSynced, setCalendarLastSynced] = useState(null);
  const [calendarEventCount, setCalendarEventCount] = useState(0);
  const [isRemovingCalendar, setIsRemovingCalendar] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        avatarColor: member.avatarColor || member.color || '#FFF48D',
        schoolPlanImage: member.schoolPlanImage || null,
      });
    }
    setShowDeleteConfirm(false);
    setActiveTab('basic'); // Reset to basic tab when member changes
  }, [member]);

  // Load LLM settings and check for school schedule when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLlmSettings();
      checkForSchoolSchedule();
      loadSpondAuthState();
      loadCalendarInfo();
    }
  }, [isOpen, member]);

  const loadLlmSettings = async () => {
    try {
      const settings = await dataService.getSettings();
      setLlmSettings({
        enabled: settings.llmIntegrationEnabled === 'true',
        apiKey: settings.anthropicApiKey || '',
        selectedModel: settings.selectedAnthropicModel || '',
      });
    } catch (error) {
      console.error('Error loading LLM settings:', error);
      // Fallback to localStorage
      setLlmSettings({
        enabled: localStorage.getItem('llmIntegrationEnabled') === 'true',
        apiKey: localStorage.getItem('anthropicApiKey') || '',
        selectedModel: localStorage.getItem('selectedAnthropicModel') || '',
      });
    }
  };

  const checkForSchoolSchedule = async () => {
    if (!member?.id) return;

    try {
      // Check if member has any activities with school schedule type
      const activities = await dataService.getActivities({
        memberId: member.id,
      });
      const schoolScheduleActivities = activities.filter(
        activity =>
          activity.description &&
          activity.description.includes('[TYPE:school_schedule]')
      );
      const schoolActivities = activities.filter(
        activity =>
          activity.description &&
          activity.description.includes('[TYPE:school_activity]')
      );
      setHasSchoolSchedule(
        schoolScheduleActivities.length > 0 || schoolActivities.length > 0
      );
    } catch (error) {
      console.error('Error checking for school schedule:', error);
    }
  };

  const loadCalendarInfo = async () => {
    if (!member?.id) return;

    try {
      // Get member data to check for calendar info
      const members = await dataService.getFamilyMembers();
      const currentMember = members.find(m => m.id === member.id);

      if (currentMember) {
        setCalendarUrl(currentMember.calendar_url || '');
        setCalendarLastSynced(currentMember.calendar_last_synced);
        setCalendarEventCount(currentMember.calendar_event_count || 0);
      }
    } catch (error) {
      console.error('Error loading calendar info:', error);
    }
  };

  const loadSpondAuthState = async () => {
    if (!member?.id) return;

    setIsLoadingSpondState(true);
    console.log(`🔍 Loading Spond auth state for member ${member.id}`);

    try {
      const response = await fetch(
        `${API_ENDPOINTS.SPOND_CREDENTIALS}/${member.id}`
      );
      const data = await response.json();

      console.log('📥 Spond auth state loaded:', data);

      setSpondAuthState(data);

      if (data.hasCredentials) {
        setSpondIntegrationEnabled(true);
        setSpondEmail(data.email || '');
        // Don't set password from stored data for security
      }
    } catch (error) {
      console.error('❌ Error loading Spond auth state:', error);
      setSpondAuthState({
        hasCredentials: false,
        authenticated: false,
        email: '',
        lastAuthenticated: null,
        userData: null,
      });
    } finally {
      setIsLoadingSpondState(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = event => {
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
        schoolPlanImage: file,
      }));
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      schoolPlanImage: null,
    }));
  };

  const handleExtractSchoolPlan = async () => {
    if (!formData.schoolPlanImage || !member?.id || !llmSettings.apiKey) {
      showError('Image, member, and API key are required for extraction');
      return;
    }

    setIsExtracting(true);

    try {
      const result = await dataService.extractSchoolPlan(
        member.id,
        formData.schoolPlanImage,
        llmSettings.apiKey,
        llmSettings.selectedModel
      );

      // Refresh school schedule status
      checkForSchoolSchedule();

      // Show success message
      const totalItems =
        result.savedData.schedules.length + result.savedData.activities.length;
      const homeworkCount = result.savedData.homework?.length || 0;
      const itemsText = totalItems > 0 ? `${totalItems} schedule items` : '';
      const homeworkText =
        homeworkCount > 0 ? `${homeworkCount} homework assignments` : '';
      const parts = [itemsText, homeworkText].filter(Boolean);
      const detailsText =
        parts.length > 0 ? ` Found ${parts.join(' and ')}.` : '';

      showSuccess(`School plan imported successfully!${detailsText}`);
    } catch (error) {
      console.error('Error extracting school plan:', error);

      // Enhanced error handling with user-friendly messages
      let userFriendlyMessage =
        error.message || 'Failed to extract school plan';

      // Provide helpful context based on error type
      if (error.message?.includes('529')) {
        userFriendlyMessage +=
          '. This usually happens when many people are using the AI service at the same time. Try again in a few minutes.';
      } else if (
        error.message?.includes('401') ||
        error.message?.includes('Invalid API key')
      ) {
        userFriendlyMessage += '. Please verify your API key in the Settings.';
      } else if (
        error.message?.includes('timeout') ||
        error.message?.includes('timed out')
      ) {
        userFriendlyMessage +=
          '. The request took too long to process. This can happen with large or complex images.';
      } else if (error.message?.includes('Network error')) {
        userFriendlyMessage +=
          '. Please check your internet connection and try again.';
      }

      showError(userFriendlyMessage);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDeleteSchoolSchedule = async () => {
    if (!member?.id) return;

    // Show inline confirmation instead of toast
    setShowScheduleDeleteConfirm(true);
  };

  const confirmDeleteSchedule = async () => {
    if (!member?.id) return;

    setIsDeletingSchedule(true);

    try {
      // Use the new batch delete endpoint for optimal performance
      const result = await dataService.deleteSchoolSchedule(member.id);

      console.log(
        `🗑️ Batch delete completed: ${result.deletedCount} entries removed in ${result.executionTime}ms`
      );

      setHasSchoolSchedule(false);
      setShowScheduleDeleteConfirm(false);

      // Create detailed success message
      const deletionDetails = [];
      if (result.scheduleEntries > 0)
        deletionDetails.push(`${result.scheduleEntries} schedule entries`);
      if (result.activityEntries > 0)
        deletionDetails.push(`${result.activityEntries} activities`);
      if (result.homeworkEntries > 0)
        deletionDetails.push(`${result.homeworkEntries} homework assignments`);

      const detailsText =
        deletionDetails.length > 0 ? ` (${deletionDetails.join(', ')})` : '';

      showSuccess(
        `School schedule and homework deleted successfully! Removed ${result.deletedCount} entries${detailsText}.`
      );
    } catch (error) {
      console.error('Error deleting school schedule:', error);
      showError(error.message || 'Failed to delete school schedule');
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  const cancelDeleteSchedule = () => {
    setShowScheduleDeleteConfirm(false);
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

  const getInitials = name => {
    if (!name) return 'NN';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const fetchSpondGroups = async () => {
    if (!member?.id) {
      console.error('❌ No member ID available for groups fetch');
      return;
    }

    setIsLoadingGroups(true);
    setGroupsError(null);
    console.log(`🔍 Fetching Spond groups for member ${member.id}`);

    try {
      const response = await fetch(
        `${API_ENDPOINTS.SPOND_GROUPS}/${member.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`📊 Groups fetch response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Groups fetch successful:`, data);
        console.log(
          `📋 Full groups data from API:`,
          data.groups?.map(g => ({
            key: g.key,
            displayName: g.displayName,
            isActive: g.isActive,
          }))
        );

        setGroupsData(data.groups || []);
        setGroupsError(null);

        // Set selected groups based on is_active status from database
        // Handle both boolean true and integer 1 from SQLite
        const activeGroups = (data.groups || [])
          .filter(g => Boolean(g.isActive))
          .map(g => g.key);
        setSelectedGroups(activeGroups);
        console.log(
          `📋 Found ${data.groups.length} groups, ${activeGroups.length} active groups:`,
          activeGroups
        );
        console.log(
          `📋 Active group names:`,
          (data.groups || [])
            .filter(g => Boolean(g.isActive))
            .map(g => g.displayName)
            .join(', ')
        );

        if (data.groups?.length === 0) {
          console.log(`⚠️ No groups found for this member`);
        }
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Unknown error' }));
        console.error(`❌ Groups fetch failed:`, errorData);

        if (response.status === 401) {
          setGroupsError(
            'Authentication token has expired. Please re-authenticate.'
          );
        } else {
          setGroupsError(
            errorData.message ||
              `Failed to fetch groups (Status: ${response.status})`
          );
        }
        setGroupsData([]);
        setSelectedGroups([]); // Clear selections on error
      }
    } catch (error) {
      console.error('💥 Error fetching groups:', error);
      setGroupsError('Network error while fetching groups');
      setGroupsData([]);
      setSelectedGroups([]); // Clear selections on error
    } finally {
      setIsLoadingGroups(false);
      console.log(`🏁 Groups fetch completed`);
    }
  };

  const handleModalClose = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  // Spond integration handlers
  const handleSpondToggle = async enabled => {
    setSpondIntegrationEnabled(enabled);
    if (!enabled) {
      setSpondEmail('');
      setSpondPassword('');

      // Clear stored credentials when disabling
      if (member?.id && spondAuthState.hasCredentials) {
        try {
          console.log(`🗑️ Clearing Spond credentials for member ${member.id}`);
          const response = await fetch(
            `${API_ENDPOINTS.SPOND_CREDENTIALS}/${member.id}`,
            {
              method: 'DELETE',
            }
          );

          if (response.ok) {
            console.log('✅ Spond credentials cleared successfully');
            setSpondAuthState({
              hasCredentials: false,
              authenticated: false,
              email: '',
              lastAuthenticated: null,
              userData: null,
            });
          }
        } catch (error) {
          console.error('❌ Error clearing Spond credentials:', error);
        }
      }
    }
  };

  const handleSpondCredentialsChange = (email, password) => {
    setSpondEmail(email);
    setSpondPassword(password);
  };

  const handleImportCalendar = async () => {
    if (!calendarUrl || !member?.id) {
      showError('Please enter a calendar URL');
      return;
    }

    setIsImportingCalendar(true);

    try {
      const response = await fetch(
        `${API_ENDPOINTS.FAMILY_MEMBERS}/${member.id}/import-calendar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            calendarUrl: calendarUrl.trim(),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setCalendarLastSynced(new Date().toISOString());
        setCalendarEventCount(data.eventsImported);
        showSuccess(data.message || 'Calendar imported successfully!');
      } else {
        showError(data.error || 'Failed to import calendar');
      }
    } catch (error) {
      console.error('Error importing calendar:', error);
      showError('Network error while importing calendar');
    } finally {
      setIsImportingCalendar(false);
    }
  };

  const handleRemoveCalendar = async () => {
    if (!member?.id) return;

    const confirmRemove = window.confirm(
      'Are you sure you want to remove the school calendar? This will delete all imported school calendar events for this family member.'
    );

    if (!confirmRemove) return;

    setIsRemovingCalendar(true);

    try {
      const response = await fetch(
        `${API_ENDPOINTS.FAMILY_MEMBERS}/${member.id}/remove-calendar`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear local state
        setCalendarUrl('');
        setCalendarLastSynced(null);
        setCalendarEventCount(0);
        showSuccess('School calendar removed successfully');

        // Refresh the page or trigger a data reload
        if (onUpdate) {
          onUpdate();
        }
      } else {
        showError(data.error || 'Failed to remove calendar');
      }
    } catch (error) {
      console.error('Error removing calendar:', error);
      showError('Network error while removing calendar');
    } finally {
      setIsRemovingCalendar(false);
    }
  };

  const testSpondCredentials = async () => {
    if (!spondEmail || !spondPassword) {
      showError('Please enter both email and password.');
      return;
    }

    setIsTestingSpondCredentials(true);

    // Enhanced logging for Spond authentication
    console.log('=== SPOND AUTHENTICATION TEST STARTED ===');
    console.log(`Email: ${spondEmail}`);
    console.log(`Password length: ${spondPassword.length} characters`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    try {
      console.log('🔄 Making API call to backend for Spond authentication...');

      const response = await fetch(API_ENDPOINTS.TEST_SPOND_CREDENTIALS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: spondEmail,
          password: spondPassword,
        }),
      });

      console.log(`📡 Backend response status: ${response.status}`);
      console.log(`📡 Backend response status text: ${response.statusText}`);

      const data = await response.json();
      console.log('📥 Backend response data:', data);

      if (response.ok && data.valid) {
        console.log('✅ Spond authentication: SUCCESS');
        console.log('📊 Authentication details:');
        console.log(`  - Message: ${data.message}`);
        if (data.responseData) {
          console.log('  - Real Spond response data:', data.responseData);
          if (data.responseData.user) {
            console.log('  - User data:', data.responseData.user);
          }
          if (data.responseData.loginToken) {
            console.log('  - Login token received: [PRESENT]');
          }
        }

        // Store credentials after successful authentication
        if (data.responseData && member?.id) {
          console.log('💾 Storing successful Spond credentials...');
          try {
            const storeResponse = await fetch(
              `${API_ENDPOINTS.SPOND_CREDENTIALS}/${member.id}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: spondEmail,
                  password: spondPassword,
                  loginToken: data.responseData.loginToken,
                  userData: data.responseData.user,
                  spondUserId: data.spondUserId,
                }),
              }
            );

            if (storeResponse.ok) {
              console.log('✅ Spond credentials stored successfully');
              // Reload auth state to reflect stored credentials
              await loadSpondAuthState();

              // Authentication successful
              showSuccess(
                'Authentication successful! You can now select activities to sync.'
              );
            } else {
              console.error('❌ Failed to store Spond credentials');
            }
          } catch (storeError) {
            console.error('❌ Error storing Spond credentials:', storeError);
          }
        }
      } else {
        console.log('❌ Spond authentication: FAILED');
        console.log('📊 Error details:');
        console.log(`  - Status: ${response.status}`);
        console.log(`  - Error type: ${data.error || 'Unknown'}`);
        console.log(`  - Message: ${data.message || 'Unknown error'}`);

        showError(
          data.message ||
            'Invalid Spond credentials. Please check your email and password.'
        );
      }
    } catch (error) {
      console.error('❌ Spond authentication error:', error);
      console.log('🔍 Error details:');
      console.log(`  - Error name: ${error.name}`);
      console.log(`  - Error message: ${error.message}`);
      console.log(`  - Stack trace: ${error.stack}`);

      showError(
        'Network error while testing Spond credentials. Please try again.'
      );
    } finally {
      const endTime = new Date().toISOString();
      console.log(`⏱️ Authentication test completed at: ${endTime}`);
      console.log('=== SPOND AUTHENTICATION TEST ENDED ===');
      setIsTestingSpondCredentials(false);
    }
  };

  if (!member) return null;

  return (
    <>
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
              className={`tab-button ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
            >
              Integrations
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
                      <div
                        className="avatar-preview"
                        style={{ backgroundColor: formData.avatarColor }}
                      >
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
                          onChange={e =>
                            handleInputChange('name', e.target.value)
                          }
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
                              formData.avatarColor === color.hex
                                ? 'selected'
                                : ''
                            }`}
                            style={{ backgroundColor: color.hex }}
                            onClick={() =>
                              handleInputChange('avatarColor', color.hex)
                            }
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
                    <h3 className="section-title">📅 School Plan</h3>
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
                              src={URL.createObjectURL(
                                formData.schoolPlanImage
                              )}
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
                              : 'School Plan Image'}
                          </span>
                          <div className="image-buttons">
                            {llmSettings.enabled && llmSettings.apiKey && (
                              <button
                                type="button"
                                className="button-extract"
                                onClick={handleExtractSchoolPlan}
                                disabled={
                                  isExtracting || !formData.schoolPlanImage
                                }
                                aria-label="Import data from school plan"
                              >
                                {isExtracting ? (
                                  <>
                                    <svg
                                      className="extract-spinner"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeDasharray="31.416"
                                        strokeDashoffset="31.416"
                                      >
                                        <animate
                                          attributeName="stroke-dasharray"
                                          dur="2s"
                                          values="0 31.416;15.708 15.708;0 31.416"
                                          repeatCount="indefinite"
                                        />
                                        <animate
                                          attributeName="stroke-dashoffset"
                                          dur="2s"
                                          values="0;-15.708;-31.416"
                                          repeatCount="indefinite"
                                        />
                                      </circle>
                                    </svg>
                                    Extracting...
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <path
                                        d="M12 2L2 7L12 12L22 7L12 2Z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M2 17L12 22L22 17"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M2 12L12 17L22 12"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
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
                        <label
                          htmlFor="school-plan-upload"
                          className="upload-label"
                        >
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
                            <span className="upload-title">
                              Upload School Plan
                            </span>
                            <span className="upload-subtitle">
                              Click to select an image file (JPEG, PNG, or GIF)
                            </span>
                            <span className="upload-note">
                              Maximum file size: 5MB
                            </span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  {!llmSettings.enabled && formData.schoolPlanImage && (
                    <div className="extraction-status info">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M12 16v-4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 8h.01"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>
                        Enable LLM Integration in Settings to extract data from
                        school plans automatically
                      </span>
                    </div>
                  )}
                </div>

                {/* School Schedule Management */}
                {hasSchoolSchedule && (
                  <div className="modal-section">
                    <div className="school-schedule-compact">
                      <div className="schedule-info">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M22 11.08V12a10 10 0 11-5.93-9.14"
                            stroke="#22c55e"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <polyline
                            points="22,4 12,14.01 9,11.01"
                            stroke="#22c55e"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="schedule-text">
                          School schedule imported
                        </span>
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
                            <svg
                              className="delete-spinner"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeDasharray="31.416"
                                strokeDashoffset="31.416"
                              >
                                <animate
                                  attributeName="stroke-dasharray"
                                  dur="2s"
                                  values="0 31.416;15.708 15.708;0 31.416"
                                  repeatCount="indefinite"
                                />
                                <animate
                                  attributeName="stroke-dashoffset"
                                  dur="2s"
                                  values="0;-15.708;-31.416"
                                  repeatCount="indefinite"
                                />
                              </circle>
                            </svg>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <polyline
                                points="3,6 5,6 21,6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <line
                                x1="10"
                                y1="11"
                                x2="10"
                                y2="17"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <line
                                x1="14"
                                y1="11"
                                x2="14"
                                y2="17"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Delete
                          </>
                        )}
                      </button>
                    </div>

                    {showScheduleDeleteConfirm && (
                      <div className="schedule-delete-confirmation">
                        <div className="confirmation-message">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                              stroke="#f59e0b"
                              strokeWidth="2"
                            />
                            <line
                              x1="12"
                              y1="9"
                              x2="12"
                              y2="13"
                              stroke="#f59e0b"
                              strokeWidth="2"
                            />
                            <circle cx="12" cy="17" r="1" fill="#f59e0b" />
                          </svg>
                          <span>
                            Delete{' '}
                            <strong>{member?.name || 'this member'}</strong>'s
                            school schedule?
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

                <div className="section-divider"></div>

                {/* School Calendar Section */}
                <div className="modal-section">
                  <div className="section-header">
                    <h3 className="section-title">📆 School Calendar</h3>
                    <p className="section-description">
                      Import school calendar with holidays, planning days, and
                      vacations
                    </p>
                  </div>

                  <div className="calendar-import-form">
                    <div className="form-group">
                      <label htmlFor="calendar-url" className="form-label">
                        Calendar URL (iCal/webcal)
                      </label>
                      <div className="calendar-url-input-group">
                        <input
                          type="text"
                          id="calendar-url"
                          className="form-input"
                          value={calendarUrl}
                          onChange={e => setCalendarUrl(e.target.value)}
                          placeholder="webcal://example.com/calendar.ics"
                          disabled={isImportingCalendar}
                        />
                        <button
                          type="button"
                          className="import-calendar-button"
                          onClick={handleImportCalendar}
                          disabled={!calendarUrl.trim() || isImportingCalendar}
                        >
                          {isImportingCalendar
                            ? 'Importing...'
                            : 'Import Calendar'}
                        </button>
                      </div>
                    </div>

                    {/* Calendar Status */}
                    {calendarLastSynced && (
                      <div className="calendar-status-info">
                        <div className="status-item">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M22 11.08V12a10 10 0 11-5.93-9.14"
                              stroke="#22c55e"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <polyline
                              points="22,4 12,14.01 9,11.01"
                              stroke="#22c55e"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className="status-text">
                            Last imported:{' '}
                            {new Date(calendarLastSynced).toLocaleString()}
                          </span>
                        </div>
                        {calendarEventCount > 0 && (
                          <div className="status-item">
                            <span className="status-text">
                              {calendarEventCount} events imported
                            </span>
                          </div>
                        )}
                        <div className="calendar-remove-section">
                          <button
                            type="button"
                            className="remove-calendar-button"
                            onClick={handleRemoveCalendar}
                            disabled={isRemovingCalendar}
                          >
                            {isRemovingCalendar
                              ? 'Removing...'
                              : 'Remove Calendar'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="calendar-help-text">
                      <p>Common calendar sources:</p>
                      <ul>
                        <li>
                          Bergen Kommune:
                          webcal://www.bergen.kommune.no/rest/skoleruten/2025-2026.ics
                        </li>
                        <li>
                          Oslo Kommune: Check kommune website for calendar URL
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'integrations' && (
              <>
                {/* Spond Integration Section */}
                <div className="modal-section">
                  <div className="section-header">
                    <h3 className="section-title">⚽ Spond Integration</h3>
                    <p className="section-description">
                      Connect with Spond to automatically sync activities from
                      sports clubs and organizations
                    </p>
                  </div>

                  <div className="spond-integration-form">
                    <div className="toggle-container">
                      <label htmlFor="spond-toggle" className="toggle-label">
                        <span className="toggle-text">
                          Enable Spond Integration
                        </span>
                        <div className="toggle-switch">
                          <input
                            type="checkbox"
                            id="spond-toggle"
                            checked={spondIntegrationEnabled}
                            onChange={e => handleSpondToggle(e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </div>
                      </label>
                    </div>

                    {/* Authentication Status Display */}
                    {isLoadingSpondState ? (
                      <div className="spond-status loading">
                        <div className="status-icon">⏳</div>
                        <div className="status-text">
                          Loading authentication status...
                        </div>
                      </div>
                    ) : spondAuthState.authenticated ? (
                      <div className="spond-status authenticated">
                        <div className="status-icon">✅</div>
                        <div className="status-text">
                          <strong>Authenticated</strong> as{' '}
                          {spondAuthState.email}
                          <div className="status-details">
                            Last authenticated:{' '}
                            {new Date(
                              spondAuthState.lastAuthenticated
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      spondAuthState.hasCredentials && (
                        <div className="spond-status has-credentials">
                          <div className="status-icon">🔑</div>
                          <div className="status-text">
                            Credentials stored for {spondAuthState.email}
                            <div className="status-details">
                              Authentication required
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    {spondIntegrationEnabled && (
                      <div className="spond-form">
                        <div className="form-group">
                          <label htmlFor="spond-email" className="form-label">
                            Spond Email
                          </label>
                          <input
                            type="email"
                            id="spond-email"
                            className="form-input"
                            value={spondEmail}
                            onChange={e =>
                              handleSpondCredentialsChange(
                                e.target.value,
                                spondPassword
                              )
                            }
                            placeholder="Enter your Spond account email"
                          />
                        </div>

                        <div className="form-group">
                          <label
                            htmlFor="spond-password"
                            className="form-label"
                          >
                            Spond Password
                          </label>
                          <div className="spond-password-input-group">
                            <input
                              type="password"
                              id="spond-password"
                              className="form-input"
                              value={spondPassword}
                              onChange={e =>
                                handleSpondCredentialsChange(
                                  spondEmail,
                                  e.target.value
                                )
                              }
                              placeholder="Enter your Spond account password"
                            />
                            <button
                              type="button"
                              className="test-spond-credentials-button"
                              onClick={testSpondCredentials}
                              disabled={
                                !spondEmail.trim() ||
                                !spondPassword.trim() ||
                                isTestingSpondCredentials
                              }
                            >
                              {isTestingSpondCredentials
                                ? 'Authenticating...'
                                : 'Log in'}
                            </button>
                          </div>
                        </div>

                        {/* Activities Selection Button */}
                        {spondAuthState.authenticated && (
                          <div className="spond-groups-section">
                            <button
                              type="button"
                              className="groups-button"
                              onClick={() => {
                                setShowGroupsModal(true);
                                // Only reset error state, keep existing data until fetch completes
                                setGroupsError(null);
                                fetchSpondGroups();
                              }}
                            >
                              Select Activities
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'advanced' && (
              <>
                {/* Delete Member Section */}
                <div className="modal-section">
                  <div className="section-header">
                    <h3 className="section-title">⚠️ Delete Family Member</h3>
                    <p className="section-description">
                      Permanently remove this family member and all associated data
                    </p>
                  </div>

                  <div className="advanced-settings-form">
                    <div className="danger-zone">
                      <div className="danger-zone-header">
                        <div className="danger-icon">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                              stroke="#ef4444"
                              strokeWidth="2"
                            />
                            <line
                              x1="12"
                              y1="9"
                              x2="12"
                              y2="13"
                              stroke="#ef4444"
                              strokeWidth="2"
                            />
                            <circle cx="12" cy="17" r="1" fill="#ef4444" />
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
                              Are you sure you want to delete{' '}
                              <strong>{member?.name || 'this member'}</strong>?
                            </span>

                            <div className="delete-warning">
                              <span className="delete-warning-title">
                                This will permanently delete:
                              </span>
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
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <polyline
                                points="3,6 5,6 21,6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <line
                                x1="10"
                                y1="11"
                                x2="10"
                                y2="17"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <line
                                x1="14"
                                y1="11"
                                x2="14"
                                y2="17"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
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

        {/* Groups Selection Modal */}
        <GenericModal
          isOpen={showGroupsModal}
          onClose={() => {
            setShowGroupsModal(false);
            // Reset selections when closing via X button (don't save partial changes)
            setSelectedGroups([]);
            setGroupsData([]);
            setGroupsError(null);
          }}
          title="Select Activities"
        >
          <div className="groups-modal-content">
            <div className="modal-section">
              <div className="section-header">
                <p className="section-description">
                  Select which activities to sync for each child profile
                </p>
              </div>

              <div className="groups-list">
                {isLoadingGroups ? (
                  <div className="groups-loading">
                    <div className="loading-message">
                      <span className="loading-icon">⏳</span>
                      Loading groups...
                    </div>
                  </div>
                ) : groupsError ? (
                  <div className="groups-error">
                    <div className="error-message">
                      <span className="error-icon">❌</span>
                      {groupsError}
                    </div>
                  </div>
                ) : groupsData.length === 0 ? (
                  <div className="groups-empty">
                    <div className="empty-message">
                      <span className="empty-icon">📭</span>
                      No children found in any Spond groups
                      <div className="empty-subtitle">
                        Make sure you're using the parent account that has
                        children registered in Spond groups
                      </div>
                    </div>
                  </div>
                ) : (
                  groupsData.map(group => (
                    <div key={group.key} className="group-item">
                      <div className="group-info">
                        <span className="group-name">{group.displayName}</span>
                        {group.description && (
                          <span className="group-description">
                            {group.description}
                          </span>
                        )}
                      </div>
                      <div className="group-actions">
                        <label
                          htmlFor={`group-${group.key}`}
                          className="group-checkbox"
                        >
                          <input
                            type="checkbox"
                            id={`group-${group.key}`}
                            checked={selectedGroups.includes(group.key)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedGroups([
                                  ...selectedGroups,
                                  group.key,
                                ]);
                              } else {
                                setSelectedGroups(
                                  selectedGroups.filter(id => id !== group.key)
                                );
                              }
                            }}
                          />
                          <span className="checkbox-custom"></span>
                          <span className="checkbox-label">Select</span>
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="groups-modal-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setShowGroupsModal(false);
                    // Reset selections when canceling (don't save partial changes)
                    setSelectedGroups([]);
                    setGroupsData([]);
                    setGroupsError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  onClick={async () => {
                    console.log(
                      '💾 Saving selected activities:',
                      selectedGroups
                    );

                    try {
                      // Extract the profile-group pairs from the selected keys
                      const selectedPairs = selectedGroups.map(key => {
                        const group = groupsData.find(g => g.key === key);
                        return {
                          key: key,
                          profileId: group?.profileId,
                          groupId: group?.groupId,
                        };
                      });

                      console.log(
                        '📤 Sending profile-group pairs:',
                        selectedPairs
                      );

                      const response = await fetch(
                        `${API_ENDPOINTS.SPOND_GROUP_SELECTIONS}/${member.id}/selections`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            selectedProfileGroups: selectedPairs,
                          }),
                        }
                      );

                      if (response.ok) {
                        const data = await response.json();
                        console.log(
                          '✅ Activity selections saved successfully:',
                          data
                        );
                        showSuccess(
                          `Saved selections for ${selectedGroups.length} activities`
                        );
                        setShowGroupsModal(false);
                        // Clear state after successful save
                        setSelectedGroups([]);
                        setGroupsData([]);
                        setGroupsError(null);
                      } else {
                        const errorData = await response
                          .json()
                          .catch(() => ({ message: 'Unknown error' }));
                        console.error(
                          '❌ Failed to save activity selections:',
                          errorData
                        );
                        showError(
                          `Failed to save selections: ${errorData.message}`
                        );
                      }
                    } catch (error) {
                      console.error(
                        '💥 Error saving activity selections:',
                        error
                      );
                      showError(
                        'Network error while saving activity selections'
                      );
                    }
                  }}
                  disabled={false}
                >
                  Save Selection ({selectedGroups.length})
                </button>
              </div>
            </div>
          </div>
        </GenericModal>
      </GenericModal>
    </>
  );
};

export default EditMemberModal;
