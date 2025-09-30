import { useState, useEffect } from 'react';
import { createBackdropClickHandler } from '../utils/modalUtils';
import './SpondProfileModal.css';
import { API_URL } from '../config/api';

const SpondProfileModal = ({ isOpen, onClose, member, onProfileSelected }) => {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [existingMapping, setExistingMapping] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && member) {
      fetchProfiles();
    }
  }, [isOpen, member]);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/spond-profiles/${member.id}`
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setProfiles(data.profiles);
        setExistingMapping(data.existingMapping);
        if (data.existingMapping) {
          setSelectedProfileId(data.existingMapping.spond_profile_id);
        }
      } else if (response.status === 401) {
        setError('Authentication expired. Please re-authenticate with Spond.');
      } else {
        setError(data.message || 'Failed to fetch profiles');
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to fetch available profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!selectedProfileId) {
      setError('Please select a profile');
      return;
    }

    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    if (!selectedProfile) {
      setError('Invalid profile selection');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/spond-profile-mapping/${member.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: selectedProfile.id,
            profileName: selectedProfile.name,
            profileType: selectedProfile.profileType,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        onProfileSelected(selectedProfile);
        onClose();
      } else {
        setError(data.message || 'Failed to save profile mapping');
      }
    } catch (err) {
      console.error('Error saving profile mapping:', err);
      setError('Failed to save profile mapping');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = createBackdropClickHandler(onClose);

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select Spond Profile for {member?.name}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading profiles...</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && profiles.length === 0 && (
            <div className="no-profiles-message">
              <p>No profiles found. Please authenticate with Spond first.</p>
            </div>
          )}

          {!loading && !error && profiles.length > 0 && (
            <>
              <div className="profile-selection-info">
                {existingMapping ? (
                  <p className="existing-mapping-info">
                    Current profile:{' '}
                    <strong>{existingMapping.profile_name}</strong>
                  </p>
                ) : (
                  <p>
                    Select which Spond profile corresponds to this family
                    member:
                  </p>
                )}
              </div>

              <div className="profiles-list">
                {profiles.map(profile => (
                  <div
                    key={profile.id}
                    className={`profile-option ${
                      selectedProfileId === profile.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedProfileId(profile.id)}
                  >
                    <div className="profile-radio">
                      <input
                        type="radio"
                        name="profile"
                        value={profile.id}
                        checked={selectedProfileId === profile.id}
                        onChange={() => setSelectedProfileId(profile.id)}
                      />
                    </div>
                    <div className="profile-details">
                      <div className="profile-name">
                        {profile.name}
                        {profile.profileType === 'self' && (
                          <span className="profile-badge">Parent Account</span>
                        )}
                      </div>
                      <div className="profile-groups">
                        Groups: {profile.groups.join(', ')}
                      </div>
                      {profile.email && (
                        <div className="profile-email">{profile.email}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="profile-help-text">
                <p>
                  <strong>Note:</strong> Select the profile that represents{' '}
                  {member?.name} in Spond. This will be used to track their
                  activity responses.
                </p>
              </div>
            </>
          )}
        </div>

        {!loading && !error && profiles.length > 0 && (
          <div className="modal-footer">
            <button
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSaveMapping}
              disabled={loading || !selectedProfileId}
            >
              {existingMapping ? 'Update Profile' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpondProfileModal;
