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
    // If accessing via localhost or local network IP, add port 3001
    const isLocalAccess = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLocalNetworkIP =
      /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|100\.)/.test(hostname);

    if (isLocalAccess || isLocalNetworkIP) {
      return `${protocol}//${hostname}:3001`;
    }

    // For Cloudflare tunnel or domain names - use same host without port
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
  FAMILY_MEMBERS: `${API_BASE_URL}/api/family-members`,
  TEST_SPOND_CREDENTIALS: `${API_BASE_URL}/api/test-spond-credentials`,
  SPOND_CREDENTIALS: `${API_BASE_URL}/api/spond-credentials`,
  SPOND_GROUPS: `${API_BASE_URL}/api/spond-groups`,
  SPOND_GROUP_SELECTIONS: `${API_BASE_URL}/api/spond-groups`,
};

export default API_ENDPOINTS;
