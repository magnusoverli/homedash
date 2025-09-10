import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FamilyMemberCard from './FamilyMemberCard';
import AddMemberForm from './AddMemberForm';
import EditMemberModal from './EditMemberModal';
import API_ENDPOINTS from '../config/api';
import dataService from '../services/dataService';
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
  const [selectedPromptVersion, setSelectedPromptVersion] = useState('original');

  // Load family members from API
  useEffect(() => {
    const loadFamilyMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const members = await dataService.getFamilyMembers();
        // Map backend 'color' field to frontend 'avatarColor'
        const mappedMembers = members.map(m => ({
          ...m,
          avatarColor: m.color,
        }));
        setFamilyMembers(mappedMembers);
        setMembersError('');
      } catch (error) {
        console.error('Error loading family members:', error);
        setMembersError('Failed to load family members');
        // Fallback to localStorage if API fails
        const savedMembers = localStorage.getItem('familyMembers');
        if (savedMembers) {
          setFamilyMembers(JSON.parse(savedMembers));
        }
      } finally {
        setIsLoadingMembers(false);
      }
    };
    loadFamilyMembers();
  }, []);

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const settings = await dataService.getSettings();
        if (settings.llmIntegrationEnabled !== undefined) {
          setLlmIntegrationEnabled(settings.llmIntegrationEnabled === 'true');
        }
        if (settings.anthropicApiKey) {
          setApiKey(settings.anthropicApiKey);
        }
        if (settings.selectedAnthropicModel) {
          setSelectedModel(settings.selectedAnthropicModel);
        }
        if (settings.selectedPromptVersion) {
          setSelectedPromptVersion(settings.selectedPromptVersion);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback to localStorage if API fails
        const savedLlmEnabled = localStorage.getItem('llmIntegrationEnabled');
        const savedApiKey = localStorage.getItem('anthropicApiKey');
        const savedModel = localStorage.getItem('selectedAnthropicModel');
        const savedPromptVersion = localStorage.getItem('selectedPromptVersion');

        if (savedLlmEnabled) {
          setLlmIntegrationEnabled(JSON.parse(savedLlmEnabled));
        }
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }
        if (savedModel) {
          setSelectedModel(savedModel);
        }
        if (savedPromptVersion) {
          setSelectedPromptVersion(savedPromptVersion);
        }
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Save LLM settings to API when they change
  useEffect(() => {
    if (!isLoadingSettings) {
      dataService
        .updateSetting('llmIntegrationEnabled', String(llmIntegrationEnabled))
        .catch(error => {
          console.error('Error saving llmIntegrationEnabled:', error);
          // Fallback to localStorage
          localStorage.setItem(
            'llmIntegrationEnabled',
            JSON.stringify(llmIntegrationEnabled)
          );
        });
    }
  }, [llmIntegrationEnabled, isLoadingSettings]);

  useEffect(() => {
    if (!isLoadingSettings && apiKey) {
      dataService.updateSetting('anthropicApiKey', apiKey).catch(error => {
        console.error('Error saving apiKey:', error);
        // Fallback to localStorage
        localStorage.setItem('anthropicApiKey', apiKey);
      });
    }
  }, [apiKey, isLoadingSettings]);

  useEffect(() => {
    if (!isLoadingSettings && selectedModel) {
      dataService
        .updateSetting('selectedAnthropicModel', selectedModel)
        .catch(error => {
          console.error('Error saving selectedModel:', error);
          // Fallback to localStorage
          localStorage.setItem('selectedAnthropicModel', selectedModel);
        });
    }
  }, [selectedModel, isLoadingSettings]);

  useEffect(() => {
    if (!isLoadingSettings && selectedPromptVersion) {
      dataService
        .updateSetting('selectedPromptVersion', selectedPromptVersion)
        .catch(error => {
          console.error('Error saving selectedPromptVersion:', error);
          // Fallback to localStorage
          localStorage.setItem('selectedPromptVersion', selectedPromptVersion);
        });
    }
  }, [selectedPromptVersion, isLoadingSettings]);

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

      const response = await fetch(API_ENDPOINTS.MODELS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setModelsError('Invalid API key. Please check your credentials.');
        setAvailableModels([]);
      } else if (response.ok && data.models) {
        setAvailableModels(data.models);
        
        // Show warning if API key validation failed but models are available
        if (data.warning) {
          setModelsError(data.warning);
        } else {
          setModelsError('');
        }

        // Clear selection if the current model is no longer available
        if (
          selectedModel &&
          !data.models.find(model => model.id === selectedModel)
        ) {
          setSelectedModel('');
        }

        // Auto-select Claude Sonnet 4 as default if no model is selected
        if (!selectedModel) {
          const claudeSonnet4 = data.models.find(model => 
            model.id === 'claude-sonnet-4-20250514'
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
      setModelsError(
        'Failed to connect to backend. Please ensure the server is running.'
      );
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
      const newMember = await dataService.createFamilyMember({
        name: member.name,
        color: member.avatarColor || member.color,
      });
      // Map backend 'color' field to frontend 'avatarColor'
      setFamilyMembers([
        ...familyMembers,
        { ...newMember, avatarColor: newMember.color },
      ]);
      setIsAddingMember(false);
    } catch (error) {
      console.error('Error adding member:', error);
      // Fallback to localStorage
      const newMember = {
        ...member,
        id: Date.now().toString(),
        color: member.avatarColor || member.color,
        createdAt: new Date().toISOString(),
      };
      setFamilyMembers([...familyMembers, newMember]);
      localStorage.setItem(
        'familyMembers',
        JSON.stringify([...familyMembers, newMember])
      );
      setIsAddingMember(false);
    }
  };

  const handleUpdateMember = async updatedMember => {
    try {
      const updated = await dataService.updateFamilyMember(updatedMember.id, {
        name: updatedMember.name,
        color: updatedMember.avatarColor || updatedMember.color,
        schoolPlanImage: updatedMember.schoolPlanImage,
      });
      // Map backend 'color' field to frontend 'avatarColor'
      setFamilyMembers(
        familyMembers.map(member =>
          member.id === updated.id
            ? { ...updated, avatarColor: updated.color }
            : member
        )
      );
      setEditingMember(null);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating member:', error);
      // Fallback to localStorage
      setFamilyMembers(
        familyMembers.map(member =>
          member.id === updatedMember.id ? updatedMember : member
        )
      );
      localStorage.setItem(
        'familyMembers',
        JSON.stringify(
          familyMembers.map(member =>
            member.id === updatedMember.id ? updatedMember : member
          )
        )
      );
      setEditingMember(null);
      setIsEditModalOpen(false);
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
      // Fallback to localStorage
      const updatedMembers = familyMembers.filter(
        member => member.id !== memberId
      );
      setFamilyMembers(updatedMembers);
      localStorage.setItem('familyMembers', JSON.stringify(updatedMembers));
      setIsEditModalOpen(false);
      setEditingMember(null);
    }
  };

  const handleEditMember = (member) => {
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
      const response = await fetch(API_ENDPOINTS.TEST_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        message:
          'Failed to connect to backend. Please ensure the server is running.',
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
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16 8V24M8 16H24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="add-member-text">Add Member</span>
                </button>
              )}
            </div>
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

                  <div className="form-group">
                    <div className="toggle-container">
                      <label htmlFor="prompt-toggle" className="toggle-label">
                        <span className="toggle-text">Use optimized prompt</span>
                        <div className="toggle-switch">
                          <input
                            type="checkbox"
                            id="prompt-toggle"
                            checked={selectedPromptVersion === 'optimized'}
                            onChange={e => setSelectedPromptVersion(e.target.checked ? 'optimized' : 'original')}
                          />
                          <span className="toggle-slider"></span>
                        </div>
                      </label>
                    </div>
                    <p className="form-description">
                      Enable to use the optimized prompt with improved organization and clarity instead of the original comprehensive prompt.
                    </p>
                  </div>
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
