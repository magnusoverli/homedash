import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FamilyMemberCard from './FamilyMemberCard';
import AddMemberForm from './AddMemberForm';
import EditMemberModal from './EditMemberModal';
import CalendarSourcesManager from './CalendarSourcesManager';
import { BackArrowIcon, PlusIcon } from './icons';
import { getApiErrorMessage } from '../utils/errorUtils';
import API_ENDPOINTS from '../config/api';
import dataService from '../services/dataService';
import { saveSetting } from '../utils/settingsUtils';
import { getAccessToken } from '../services/authService';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState('');

  const [llmIntegrationEnabled, setLlmIntegrationEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    const loadFamilyMembers = async () => {
      setIsLoadingMembers(true);
      setMembersError('');
      try {
        const members = await dataService.getFamilyMembers();
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
        setMembersError(error.message || 'Failed to load family members');
      } finally {
        setIsLoadingMembers(false);
      }
    };
    loadFamilyMembers();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const settings = await dataService.getSettings();
        if (settings.llmIntegrationEnabled !== undefined) {
          setLlmIntegrationEnabled(settings.llmIntegrationEnabled);
        }
        if (settings.anthropicApiKey) {
          setApiKey(settings.anthropicApiKey);
        }
        if (settings.selectedAnthropicModel) {
          setSelectedModel(settings.selectedAnthropicModel);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isLoadingSettings) {
      saveSetting('llmIntegrationEnabled', String(llmIntegrationEnabled));
    }
  }, [llmIntegrationEnabled, isLoadingSettings]);

  useEffect(() => {
    if (!isLoadingSettings && apiKey) {
      saveSetting('anthropicApiKey', apiKey);
    }
  }, [apiKey, isLoadingSettings]);

  useEffect(() => {
    if (!isLoadingSettings && selectedModel) {
      saveSetting('selectedAnthropicModel', selectedModel);
    }
  }, [selectedModel, isLoadingSettings]);

  const fetchAvailableModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelsError('');

    try {
      if (!apiKey || apiKey.trim().length === 0) {
        setModelsError('API key is required to show available models.');
        setAvailableModels([]);
        setIsLoadingModels(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
      };
      const token = getAccessToken();
      if (token) {
        headers['x-access-token'] = token;
      }

      const response = await fetch(API_ENDPOINTS.MODELS, {
        method: 'POST',
        headers,
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setModelsError('Invalid API key. Please check your credentials.');
        setAvailableModels([]);
      } else if (response.ok && data.models) {
        setAvailableModels(data.models);

        if (data.warning) {
          setModelsError(data.warning);
        } else {
          setModelsError('');
        }

        if (
          selectedModel &&
          !data.models.find(model => model.id === selectedModel)
        ) {
          setSelectedModel('');
        }

        if (!selectedModel) {
          const claudeSonnet4 = data.models.find(
            model => model.id === 'claude-sonnet-4-20250514'
          );
          if (claudeSonnet4) {
            setSelectedModel(claudeSonnet4.id);
          }
        }
      } else {
        setModelsError(data.error || 'Failed to load available models.');
        setAvailableModels([]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setModelsError(getApiErrorMessage(error));
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, [apiKey, selectedModel]);

  useEffect(() => {
    if (llmIntegrationEnabled && apiKey) {
      fetchAvailableModels();
    } else {
      setAvailableModels([]);
      setSelectedModel('');
      setModelsError('');
    }
  }, [llmIntegrationEnabled, apiKey, fetchAvailableModels]);

  const handleAddMember = async member => {
    try {
      const newMember = await dataService.createFamilyMember(member);
      setFamilyMembers([...familyMembers, newMember]);
      setIsAddingMember(false);
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  };

  const handleUpdateMember = async updatedMember => {
    try {
      const updated = await dataService.updateFamilyMember(
        updatedMember.id,
        updatedMember
      );
      setFamilyMembers(
        familyMembers.map(member =>
          member.id === updated.id ? updated : member
        )
      );
      setEditingMember(null);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  };

  const handleDeleteMember = async memberId => {
    try {
      await dataService.deleteFamilyMember(memberId);
      setFamilyMembers(familyMembers.filter(member => member.id !== memberId));
      setIsEditModalOpen(false);
      setEditingMember(null);
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  };

  const handleEditMember = member => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMember(null);
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleLlmToggle = enabled => {
    setLlmIntegrationEnabled(enabled);
    if (!enabled) {
      setApiKey('');
      setSelectedModel('');
      setAvailableModels([]);
      setModelsError('');
    }
  };

  const handleApiKeyChange = key => {
    setApiKey(key);
    setSelectedModel('');
    setApiKeyTestResult(null);
  };

  const testApiKey = async () => {
    if (!apiKey || apiKey.trim().length === 0) {
      setApiKeyTestResult({
        success: false,
        message: 'Please enter an API key first.',
      });
      return;
    }

    setIsTestingApiKey(true);
    setApiKeyTestResult(null);

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      const token = getAccessToken();
      if (token) {
        headers['x-access-token'] = token;
      }

      const response = await fetch(API_ENDPOINTS.TEST_KEY, {
        method: 'POST',
        headers,
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (data.valid) {
        setApiKeyTestResult({
          success: true,
          message: 'API key is valid! ✓',
        });
      } else {
        setApiKeyTestResult({
          success: false,
          message:
            data.message || 'Invalid API key. Please check your credentials.',
        });
      }
    } catch (error) {
      console.error('API key test error:', error);
      setApiKeyTestResult({
        success: false,
        message: getApiErrorMessage(error),
      });
    } finally {
      setIsTestingApiKey(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="settings-header-container">
          <button
            className="back-button"
            onClick={handleBack}
            aria-label="Back to main page"
          >
            <BackArrowIcon size={24} />
          </button>
          <h1 className="settings-title">Family Settings</h1>
          <div className="settings-header-spacer"></div>
        </div>
      </header>

      <main className="settings-main">
        <div className="settings-container">
          <section className="family-section">
            <div className="section-header">
              <h2 className="section-title">Family Members</h2>
              <p className="section-description">
                Manage your family members for weekly planning
              </p>
            </div>

            <div className="members-grid">
              {isLoadingMembers ? (
                <div className="loading-message">Loading family members...</div>
              ) : membersError ? (
                <div className="error-message">{membersError}</div>
              ) : (
                familyMembers.map(member => (
                  <FamilyMemberCard
                    key={member.id}
                    member={member}
                    isEditing={false}
                    onEdit={() => handleEditMember(member)}
                    onUpdate={handleUpdateMember}
                    onDelete={handleDeleteMember}
                    onCancelEdit={() => {}}
                  />
                ))
              )}

              {isAddingMember ? (
                <AddMemberForm
                  onAdd={handleAddMember}
                  onCancel={() => setIsAddingMember(false)}
                />
              ) : (
                <button
                  className="add-member-button"
                  onClick={() => setIsAddingMember(true)}
                  aria-label="Add new family member"
                >
                  <div className="add-member-icon">
                    <PlusIcon size={32} />
                  </div>
                  <span className="add-member-text">Add Member</span>
                </button>
              )}
            </div>
          </section>

          <section className="calendar-sources-section">
            <div className="section-header">
              <h2 className="section-title">Calendar Sources</h2>
              <p className="section-description">
                Import events from external calendars (iCal/webcal)
              </p>
            </div>

            <CalendarSourcesManager />
          </section>

          <section className="llm-section">
            <div className="section-header">
              <h2 className="section-title">LLM Integration</h2>
              <p className="section-description">
                Connect with Anthropic Claude for AI-powered features
              </p>
            </div>

            <div className="llm-controls">
              <div className="toggle-container">
                <label htmlFor="llm-toggle" className="toggle-label">
                  <span className="toggle-text">Enable LLM Integration</span>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="llm-toggle"
                      checked={llmIntegrationEnabled}
                      onChange={e => handleLlmToggle(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </label>
              </div>

              {llmIntegrationEnabled && (
                <div className="llm-form">
                  <div className="form-group">
                    <label htmlFor="api-key" className="form-label">
                      Anthropic API Key
                    </label>
                    <div className="api-key-input-group">
                      <input
                        type="password"
                        id="api-key"
                        className="form-input"
                        value={apiKey}
                        onChange={e => handleApiKeyChange(e.target.value)}
                        placeholder="Enter your Anthropic API key"
                      />
                      <button
                        type="button"
                        className="test-api-key-button"
                        onClick={testApiKey}
                        disabled={!apiKey.trim() || isTestingApiKey}
                      >
                        {isTestingApiKey ? 'Testing...' : 'Test Key'}
                      </button>
                    </div>
                    {apiKeyTestResult && (
                      <div
                        className={`api-test-result ${apiKeyTestResult.success ? 'success' : 'error'}`}
                      >
                        {apiKeyTestResult.message}
                      </div>
                    )}
                  </div>

                  {apiKey && (
                    <div className="form-group">
                      <label htmlFor="model-select" className="form-label">
                        Model Selection
                      </label>
                      {isLoadingModels ? (
                        <div className="loading-models">Loading models...</div>
                      ) : modelsError ? (
                        <div className="models-error">{modelsError}</div>
                      ) : availableModels.length > 0 ? (
                        <select
                          id="model-select"
                          className="form-select"
                          value={selectedModel}
                          onChange={e => setSelectedModel(e.target.value)}
                        >
                          <option value="">Select a model</option>
                          {availableModels.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.display_name || model.id}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="no-models">
                          No models available. Please check your API key.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        member={editingMember}
        onUpdate={handleUpdateMember}
        onDelete={handleDeleteMember}
      />
    </div>
  );
};

export default Settings;
