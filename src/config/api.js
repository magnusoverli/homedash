// API configuration
// When accessed from external devices, use the same hostname but different port
const getApiUrl = () => {
  // If VITE_API_URL is set explicitly, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In production, use the same hostname as the frontend but on port 3001
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    return `http://${hostname}:3001`;
  }

  // In development, use localhost
  return 'http://localhost:3001';
};

const API_BASE_URL = getApiUrl();

export const API_URL = API_BASE_URL;

export const API_ENDPOINTS = {
  TEST_KEY: `${API_BASE_URL}/api/test-key`,
  MODELS: `${API_BASE_URL}/api/models`,
  MESSAGES: `${API_BASE_URL}/api/messages`,
  HEALTH: `${API_BASE_URL}/api/health`,
  // Data endpoints
  FAMILY_MEMBERS: `${API_BASE_URL}/api/family-members`,
  ACTIVITIES: `${API_BASE_URL}/api/activities`,
  SETTINGS: `${API_BASE_URL}/api/settings`,
  // School plan endpoints
  HOMEWORK: `${API_BASE_URL}/api/homework`,
  EXTRACT_SCHOOL_PLAN: `${API_BASE_URL}/api/extract-school-plan`,
  // Spond integration endpoints
  TEST_SPOND_CREDENTIALS: `${API_BASE_URL}/api/test-spond-credentials`,
  SPOND_CREDENTIALS: `${API_BASE_URL}/api/spond-credentials`,
  VALIDATE_SPOND_TOKEN: `${API_BASE_URL}/api/validate-spond-token`,
  SPOND_TOKEN_RESEARCH: `${API_BASE_URL}/api/spond-token-research`,
};

export default API_ENDPOINTS;
