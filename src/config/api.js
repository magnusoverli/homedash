export const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  if (import.meta.env.PROD) {
    const isLocalAccess = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLocalNetworkIP =
      /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|100\.)/.test(hostname);

    if (isLocalAccess || isLocalNetworkIP) {
      return `${protocol}//${hostname}:3001`;
    }

    return `${protocol}//${hostname}`;
  }

  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//${hostname}:3001`;
  }

  return 'http://localhost:3001';
};

const BASE_URL = getApiUrl();

const buildUrl = (path, params = {}) => {
  const url = `${BASE_URL}${path}`;
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};

export const API_URL = BASE_URL;

export const ENDPOINTS = {
  auth: {
    status: `${BASE_URL}/api/auth/status`,
    login: `${BASE_URL}/api/auth/login`,
    logout: `${BASE_URL}/api/auth/logout`,
    refresh: `${BASE_URL}/api/auth/refresh`,
  },
  llm: {
    testKey: `${BASE_URL}/api/test-key`,
    models: `${BASE_URL}/api/models`,
    messages: `${BASE_URL}/api/messages`,
  },
  family: {
    list: `${BASE_URL}/api/family-members`,
    create: `${BASE_URL}/api/family-members`,
    update: id => `${BASE_URL}/api/family-members/${id}`,
    delete: id => `${BASE_URL}/api/family-members/${id}`,
    importCalendar: id =>
      `${BASE_URL}/api/family-members/${id}/import-calendar`,
    removeCalendar: id =>
      `${BASE_URL}/api/family-members/${id}/remove-calendar`,
  },
  activities: {
    list: params => buildUrl('/api/activities', params),
    create: `${BASE_URL}/api/activities`,
    update: id => `${BASE_URL}/api/activities/${id}`,
    delete: id => `${BASE_URL}/api/activities/${id}`,
    schoolSchedule: {
      delete: memberId =>
        `${BASE_URL}/api/activities/school-schedule/${memberId}`,
    },
  },
  homework: {
    list: params => buildUrl('/api/homework', params),
    create: `${BASE_URL}/api/homework`,
    update: id => `${BASE_URL}/api/homework/${id}`,
    delete: id => `${BASE_URL}/api/homework/${id}`,
  },
  schoolPlan: {
    extract: `${BASE_URL}/api/extract-school-plan`,
  },
  spond: {
    testCredentials: `${BASE_URL}/api/spond/test-credentials`,
    credentials: {
      get: memberId => `${BASE_URL}/api/spond/credentials/${memberId}`,
      save: memberId => `${BASE_URL}/api/spond/credentials/${memberId}`,
      delete: memberId => `${BASE_URL}/api/spond/credentials/${memberId}`,
    },
    groups: {
      list: memberId => `${BASE_URL}/api/spond/groups/${memberId}`,
      selections: memberId =>
        `${BASE_URL}/api/spond/groups/${memberId}/selections`,
    },
    profiles: {
      list: memberId => `${BASE_URL}/api/spond/profiles/${memberId}`,
    },
    profileMapping: {
      get: memberId => `${BASE_URL}/api/spond/profile-mapping/${memberId}`,
      save: memberId => `${BASE_URL}/api/spond/profile-mapping/${memberId}`,
    },
    activities: {
      syncStatus: memberId =>
        `${BASE_URL}/api/spond-activities/${memberId}/sync-status`,
      sync: memberId => `${BASE_URL}/api/spond-activities/${memberId}/sync`,
    },
  },
  settings: {
    list: `${BASE_URL}/api/settings`,
    update: key => `${BASE_URL}/api/settings/${key}`,
    promptContent: `${BASE_URL}/api/prompt-content`,
  },
  health: `${BASE_URL}/api/health`,
};

export const API_ENDPOINTS = {
  TEST_KEY: ENDPOINTS.llm.testKey,
  MODELS: ENDPOINTS.llm.models,
  FAMILY_MEMBERS: ENDPOINTS.family.list,
  TEST_SPOND_CREDENTIALS: ENDPOINTS.spond.testCredentials,
  SPOND_CREDENTIALS: ENDPOINTS.spond.credentials,
  SPOND_GROUPS: ENDPOINTS.spond.groups,
  SPOND_GROUP_SELECTIONS: ENDPOINTS.spond.groups,
};

export default API_ENDPOINTS;
export { buildUrl };
