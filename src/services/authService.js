import { getApiUrl } from '../config/api';

const TOKEN_KEY = 'access_token';
const EXPIRY_KEY = 'token_expires_at';
const REMEMBER_ME_KEY = 'remember_me';
const REFRESH_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const REFRESH_THRESHOLD = 30 * 60 * 1000; // Refresh if < 30 minutes remaining

/**
 * Check if access control is enabled on the server
 */
export async function checkAuthStatus() {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/auth/status`);
    const data = await response.json();
    return data.enabled || false;
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return false;
  }
}

/**
 * Get stored access token
 */
export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store access token
 */
export function setAccessToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove access token
 */
export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
}

/**
 * Get token expiration time
 */
function getTokenExpiry() {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  return expiry ? new Date(expiry) : null;
}

/**
 * Check if token is expired
 */
export function isTokenExpired() {
  const expiry = getTokenExpiry();
  if (!expiry) return true;
  return new Date() >= expiry;
}

/**
 * Check if token needs refresh
 */
function needsTokenRefresh() {
  const expiry = getTokenExpiry();
  if (!expiry) return false;

  const timeUntilExpiry = expiry - new Date();
  return timeUntilExpiry < REFRESH_THRESHOLD && timeUntilExpiry > 0;
}

/**
 * Refresh access token
 */
async function refreshToken() {
  const token = getAccessToken();

  if (!token) {
    throw new Error('No token to refresh');
  }

  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Token refresh failed');
  }

  if (data.token) {
    setAccessToken(data.token);
    localStorage.setItem(EXPIRY_KEY, data.expiresAt);
    localStorage.setItem(REMEMBER_ME_KEY, data.rememberMe);
  }

  return data;
}

/**
 * Start automatic token refresh
 */
let refreshInterval = null;

export function startTokenRefresh() {
  // Clear any existing interval
  stopTokenRefresh();

  refreshInterval = setInterval(async () => {
    if (needsTokenRefresh()) {
      try {
        console.log('🔄 Auto-refreshing token...');
        await refreshToken();
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        // If refresh fails, clear token and reload to show login
        clearAccessToken();
        window.location.reload();
      }
    }
  }, REFRESH_CHECK_INTERVAL);
}

/**
 * Stop automatic token refresh
 */
export function stopTokenRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

/**
 * Login with password
 */
export async function login(password, rememberMe = false) {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password, rememberMe }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  if (data.token) {
    setAccessToken(data.token);
    localStorage.setItem(EXPIRY_KEY, data.expiresAt);
    localStorage.setItem(REMEMBER_ME_KEY, data.rememberMe);
  }

  return data;
}

/**
 * Logout
 */
export async function logout() {
  stopTokenRefresh();

  const token = getAccessToken();

  if (token) {
    try {
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'x-access-token': token,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  clearAccessToken();
}
