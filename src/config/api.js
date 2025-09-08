// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  TEST_KEY: `${API_BASE_URL}/api/test-key`,
  MODELS: `${API_BASE_URL}/api/models`,
  MESSAGES: `${API_BASE_URL}/api/messages`,
  HEALTH: `${API_BASE_URL}/api/health`,
};

export default API_ENDPOINTS;
