import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FamilyMemberCard from './FamilyMemberCard';
import AddMemberForm from './AddMemberForm';
import EditMemberModal from './EditMemberModal';
import LoadingState from './LoadingState';
import { BackArrowIcon, PlusIcon } from './icons';
import { getApiErrorMessage } from '../utils/errorUtils';
import API_ENDPOINTS from '../config/api';
import dataService from '../services/dataService';
import { saveSetting } from '../utils/settingsUtils';
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
      } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback to localStorage if API fails
        const savedLlmEnabled = localStorage.getItem('llmIntegrationEnabled');
        const savedApiKey = localStorage.getItem('anthropicApiKey');
        const savedModel = localStorage.getItem('selectedAnthropicModel');

        if (savedLlmEnabled) {
          setLlmIntegrationEnabled(JSON.parse(savedLlmEnabled));
        }
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }
        if (savedModel) {
          setSelectedModel(savedModel);
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
    console.log('=== FRONTEND MODELS FETCH ===');
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`🔑 API Key provided: ${apiKey ? 'YES' : 'NO'}`);
    
    setIsLoadingModels(true);
    setModelsError('');

    try {
      if (!apiKey || apiKey.trim().length === 0) {
        console.log('❌ No API key provided for models fetch');
        console.log('=== END FRONTEND MODELS FETCH ===');
        setModelsError('API key is required to show available models.');
        setAvailableModels([]);
        setIsLoadingModels(false);
        return;
      }

      console.log('🚀 Starting models fetch request...');
      console.log(`📡 Request URL: ${API_ENDPOINTS.MODELS}`);
      
      const response = await fetch(API_ENDPOINTS.MODELS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      console.log(`📥 Models response status: ${response.status}`);
      console.log(`📥 Models response ok: ${response.ok}`);

      const data = await response.json();
      console.log('📥 Models response data:', data);

      if (response.status === 401) {
        console.log('❌ Models fetch FAILED - 401 Unauthorized');
        console.log('=== END FRONTEND MODELS FETCH ===');
        setModelsError('Invalid API key. Please check your credentials.');
        setAvailableModels([]);
      } else if (response.ok && data.models) {
        console.log(`✅ Models fetch SUCCESS - ${data.models.length} models found`);
        console.log('📋 Available models:', data.models.map(m => m.id));
        console.log('=== END FRONTEND MODELS FETCH ===');
        
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
        console.log(`❌ Models fetch FAILED - Status: ${response.status}`);
        console.log(`❌ Error: ${data.error || 'Unknown error'}`);
        console.log('=== END FRONTEND MODELS FETCH ===');
        setModelsError(data.error || 'Failed to load available models.');
        setAvailableModels([]);
      }
    } catch (error) {
      console.log('💥 Frontend models fetch ERROR occurred');
      console.error('🔍 Frontend models error details:');
      console.error(`  - Type: ${error.constructor.name}`);
      console.error(`  - Name: ${error.name}`);
      console.error(`  - Message: ${error.message}`);
      console.error('Error fetching models:', error);
      console.log('=== END FRONTEND MODELS FETCH ===');
      
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
    console.log('=== FRONTEND API KEY TEST ===');
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`🔑 API Key provided: ${apiKey ? 'YES' : 'NO'}`);
    console.log(`🔑 API Key length: ${apiKey?.length || 0} characters`);
    console.log(`🔑 API Key format: ${apiKey ? (apiKey.startsWith('sk-ant-') ? 'CORRECT (sk-ant-*)' : 'INCORRECT (should start with sk-ant-)') : 'N/A'}`);

    if (!apiKey || apiKey.trim().length === 0) {
      console.log('❌ No API key provided');
      console.log('=== END FRONTEND API KEY TEST ===');
      setApiKeyTestResult({
        success: false,
        message: 'Please enter an API key first.',
      });
      return;
    }

    setIsTestingApiKey(true);
    setApiKeyTestResult(null);

    try {
      console.log('🚀 Starting API key validation request...');
      console.log(`📡 Request URL: ${API_ENDPOINTS.TEST_KEY}`);
      console.log('📤 Request method: POST');
      console.log('📤 Request headers: Content-Type: application/json');
      
      const response = await fetch(API_ENDPOINTS.TEST_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      console.log(`📥 Response status: ${response.status}`);
      console.log(`📥 Response status text: ${response.statusText}`);
      console.log(`📥 Response ok: ${response.ok}`);

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (data.valid) {
        console.log('✅ API key validation SUCCESS');
        console.log('=== END FRONTEND API KEY TEST ===');
        setApiKeyTestResult({
          success: true,
          message: 'API key is valid! ✓',
        });
      } else {
        console.log('❌ API key validation FAILED');
        console.log(`❌ Error message: ${data.message}`);
        console.log(`❌ Error code: ${data.error || 'N/A'}`);
        console.log(`❌ Error type: ${data.errorType || 'N/A'}`);
        console.log('=== END FRONTEND API KEY TEST ===');
        setApiKeyTestResult({
          success: false,
          message:
            data.message || 'Invalid API key. Please check your credentials.',
        });
      }
    } catch (error) {
      console.log('💥 Frontend API key test ERROR occurred');
      console.error('🔍 Frontend error details:');
      console.error(`  - Type: ${error.constructor.name}`);
      console.error(`  - Name: ${error.name}`);
      console.error(`  - Message: ${error.message}`);
      console.error(`  - Stack: ${error.stack}`);
      console.error('API key test error:', error);
      console.log('=== END FRONTEND API KEY TEST ===');
      
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
