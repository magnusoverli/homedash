import { useState, useEffect } from 'react';
import { PlusIcon } from '../../icons';
import PersonProfileModal from '../modals/PersonProfileModal';
import SettingsSkeleton from '../loading/SettingsSkeleton';
import dataService from '../../../services/dataService';
import { useToast } from '../../../contexts/ToastContext';
import './MobileSettings.css';

/**
 * Mobile Settings Screen
 *
 * Mobile-optimized settings interface with accordion sections.
 * Manages family members, integrations, and app preferences.
 */
const MobileSettings = () => {
  const { showSuccess, showError } = useToast();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    people: true,
    integrations: false,
    about: false,
  });

  // LLM Integration state
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Person modal state
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load family members
        const members = await dataService.getFamilyMembers();
        const mappedMembers = members.map(m => ({
          ...m,
          avatarColor: m.color,
        }));
        setFamilyMembers(mappedMembers);

        // Load settings
        const settings = await dataService.getSettings();
        if (settings.llmIntegrationEnabled !== undefined) {
          setLlmEnabled(settings.llmIntegrationEnabled === 'true');
        }
        if (settings.anthropicApiKey) {
          setApiKey(settings.anthropicApiKey);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleSection = section => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleEditPerson = member => {
    setEditingPerson(member);
    setShowPersonModal(true);
  };

  const handleAddPerson = () => {
    setEditingPerson(null);
    setShowPersonModal(true);
  };

  const handleSavePerson = async personData => {
    try {
      let savedPerson;

      if (personData.id) {
        // Update existing person
        savedPerson = await dataService.updateFamilyMember(personData.id, {
          name: personData.name,
          color: personData.color,
        });
      } else {
        // Create new person
        savedPerson = await dataService.createFamilyMember({
          name: personData.name,
          color: personData.color,
        });
      }

      // Update local state
      setFamilyMembers(prev => {
        if (personData.id) {
          // Update existing
          return prev.map(m =>
            m.id === savedPerson.id
              ? { ...savedPerson, avatarColor: savedPerson.color }
              : m
          );
        } else {
          // Add new
          return [...prev, { ...savedPerson, avatarColor: savedPerson.color }];
        }
      });

      // Haptic feedback for success
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      // Show success toast
      showSuccess(personData.id ? 'Person updated' : 'Person added');
    } catch (error) {
      console.error('Error saving person:', error);
      showError('Failed to save person');
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleDeletePerson = async personId => {
    try {
      await dataService.deleteFamilyMember(personId);

      // Update local state
      setFamilyMembers(prev => prev.filter(m => m.id !== personId));

      // Haptic feedback for success
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      // Show success toast
      showSuccess('Person deleted');
    } catch (error) {
      console.error('Error deleting person:', error);
      showError('Failed to delete person');
      throw error; // Re-throw to let modal handle it
    }
  };

  if (isLoading) {
    return (
      <div className="mobile-settings">
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="mobile-settings">
      <div className="settings-content">
        {/* People Section */}
        <section className="settings-section">
          <button
            className="settings-section-header"
            onClick={() => toggleSection('people')}
            aria-expanded={expandedSections.people}
          >
            <div className="settings-section-title-group">
              <h2 className="settings-section-title">Family Members</h2>
              <span className="settings-section-subtitle">
                {familyMembers.length}{' '}
                {familyMembers.length === 1 ? 'person' : 'people'}
              </span>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="settings-section-icon"
              style={{
                transform: expandedSections.people
                  ? 'rotate(180deg)'
                  : 'rotate(0)',
              }}
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {expandedSections.people && (
            <div className="settings-section-content">
              <div className="people-grid">
                {familyMembers.map(member => (
                  <button
                    key={member.id}
                    className="person-card-mobile"
                    onClick={() => handleEditPerson(member)}
                  >
                    <div
                      className="person-card-avatar"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.name?.charAt(0)}
                    </div>
                    <span className="person-card-name">{member.name}</span>
                  </button>
                ))}

                <button
                  className="person-card-mobile person-card-mobile--add"
                  onClick={handleAddPerson}
                >
                  <div className="person-card-add-icon">
                    <PlusIcon size={24} />
                  </div>
                  <span className="person-card-name">Add Person</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Integrations Section */}
        <section className="settings-section">
          <button
            className="settings-section-header"
            onClick={() => toggleSection('integrations')}
            aria-expanded={expandedSections.integrations}
          >
            <div className="settings-section-title-group">
              <h2 className="settings-section-title">Integrations</h2>
              <span className="settings-section-subtitle">
                {llmEnabled ? 'LLM enabled' : 'None active'}
              </span>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="settings-section-icon"
              style={{
                transform: expandedSections.integrations
                  ? 'rotate(180deg)'
                  : 'rotate(0)',
              }}
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {expandedSections.integrations && (
            <div className="settings-section-content">
              <div className="integration-item">
                <div className="integration-header">
                  <div className="integration-info">
                    <h3 className="integration-title">LLM Integration</h3>
                    <p className="integration-description">
                      AI-powered features with Anthropic Claude
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={llmEnabled}
                      onChange={e => setLlmEnabled(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {llmEnabled && (
                  <div className="integration-details">
                    <div className="integration-status">
                      {apiKey ? (
                        <span className="status-badge status-badge--success">
                          ✓ Configured
                        </span>
                      ) : (
                        <span className="status-badge status-badge--warning">
                          ⚠ Not configured
                        </span>
                      )}
                    </div>
                    <button
                      className="settings-link-button"
                      onClick={() => {
                        // Navigate to desktop settings for full configuration
                        window.location.href = '/settings';
                      }}
                    >
                      Configure on Desktop →
                    </button>
                  </div>
                )}
              </div>

              <div className="integration-item">
                <div className="integration-header">
                  <div className="integration-info">
                    <h3 className="integration-title">Spond</h3>
                    <p className="integration-description">
                      Sports activity sync (per person)
                    </p>
                  </div>
                </div>
                <button
                  className="settings-link-button"
                  onClick={() => {
                    window.location.href = '/settings';
                  }}
                >
                  Manage on Desktop →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* About Section */}
        <section className="settings-section">
          <button
            className="settings-section-header"
            onClick={() => toggleSection('about')}
            aria-expanded={expandedSections.about}
          >
            <div className="settings-section-title-group">
              <h2 className="settings-section-title">About</h2>
              <span className="settings-section-subtitle">App information</span>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="settings-section-icon"
              style={{
                transform: expandedSections.about
                  ? 'rotate(180deg)'
                  : 'rotate(0)',
              }}
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {expandedSections.about && (
            <div className="settings-section-content">
              <div className="about-item">
                <span className="about-label">Version</span>
                <span className="about-value">1.0.4</span>
              </div>
              <div className="about-item">
                <span className="about-label">Mobile Interface</span>
                <span className="about-value">Phase 4 Complete</span>
              </div>
              <div className="about-item">
                <span className="about-label">Full Settings</span>
                <button
                  className="settings-link-button"
                  onClick={() => {
                    window.location.href = '/settings';
                  }}
                >
                  Open Desktop Settings →
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Person Profile Modal */}
      <PersonProfileModal
        isOpen={showPersonModal}
        onClose={() => {
          setShowPersonModal(false);
          setEditingPerson(null);
        }}
        onSave={handleSavePerson}
        onDelete={handleDeletePerson}
        person={editingPerson}
      />
    </div>
  );
};

export default MobileSettings;
