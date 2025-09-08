import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FamilyMemberCard from './FamilyMemberCard';
import AddMemberForm from './AddMemberForm';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const [llmIntegrationEnabled, setLlmIntegrationEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState(null);

  useEffect(() => {
    const savedMembers = localStorage.getItem('familyMembers');
    if (savedMembers) {
      setFamilyMembers(JSON.parse(savedMembers));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
  }, [familyMembers]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'llmIntegrationEnabled',
      JSON.stringify(llmIntegrationEnabled)
    );
  }, [llmIntegrationEnabled]);

  useEffect(() => {
    localStorage.setItem('anthropicApiKey', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('selectedAnthropicModel', selectedModel);
  }, [selectedModel]);

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

      const response = await fetch('http://localhost:3001/api/models', {
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
        setModelsError('');

        // Clear selection if the current model is no longer available
        if (
          selectedModel &&
          !data.models.find(model => model.id === selectedModel)
        ) {
          setSelectedModel('');
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

  const handleAddMember = member => {
    const newMember = {
      ...member,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setFamilyMembers([...familyMembers, newMember]);
    setIsAddingMember(false);
  };

  const handleUpdateMember = updatedMember => {
    setFamilyMembers(
      familyMembers.map(member =>
        member.id === updatedMember.id ? updatedMember : member
      )
    );
    setEditingMember(null);
  };

  const handleDeleteMember = memberId => {
    setFamilyMembers(familyMembers.filter(member => member.id !== memberId));
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
      const response = await fetch('http://localhost:3001/api/test-key', {
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
              {familyMembers.map(member => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  isEditing={editingMember?.id === member.id}
                  onEdit={() => setEditingMember(member)}
                  onUpdate={handleUpdateMember}
                  onDelete={handleDeleteMember}
                  onCancelEdit={() => setEditingMember(null)}
                />
              ))}

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
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Settings;
