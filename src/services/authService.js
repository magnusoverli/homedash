import { getApiUrl } from '../config/api';

const TOKEN_KEY = 'access_token';

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
}

/**
 * Login with password
 */
export async function login(password) {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  if (data.token) {
    setAccessToken(data.token);
  }

  return data;
}

/**
 * Logout
 */
export async function logout() {
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
