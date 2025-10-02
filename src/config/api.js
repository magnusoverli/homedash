// API configuration
// When accessed from external devices, use the same hostname but different port
export const getApiUrl = () => {
  // If VITE_API_URL is set explicitly, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Get current hostname
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // In production mode
  if (import.meta.env.PROD) {
    // If accessing via network IP, add port 3001
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:3001`;
    }
    // For Cloudflare tunnel or same-port setups
    return `${protocol}//${hostname}`;
  }

  // In development, check if we're accessing via network IP (not localhost)
  // If hostname is an IP address or not localhost, use that IP for backend too
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//${hostname}:3001`;
  }

  // Default: localhost for local development
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
  SPOND_GROUPS: `${API_BASE_URL}/api/spond-groups`,
  SPOND_GROUP_SELECTIONS: `${API_BASE_URL}/api/spond-groups`,
};

export default API_ENDPOINTS;
