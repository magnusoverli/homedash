import { API_URL } from '../config/api';
import { getAccessToken } from './authService';
import {
  familyMemberFromAPI,
  familyMemberToAPI,
  activityFromAPI,
  activityToAPI,
  homeworkFromAPI,
  homeworkToAPI,
  settingsFromAPI,
  transformArray,
} from './transformers';

class DataService {
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = getAccessToken();
    if (token) {
      headers['x-access-token'] = token;
    }

    return headers;
  }

  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Network error' }));

      let errorMessage =
        errorData.error || `HTTP error! status: ${response.status}`;

      if (errorData.message && errorData.message !== errorData.error) {
        errorMessage += `: ${errorData.message}`;
      }

      if (response.status === 529) {
        errorMessage = `Anthropic API is currently overloaded (Error 529). Please try again in a few moments.`;
      } else if (response.status === 401) {
        if (errorData.message?.includes('access token')) {
          import('./authService').then(({ clearAccessToken }) => {
            clearAccessToken();
            window.location.reload();
          });
          errorMessage = `Session expired. Please login again.`;
        } else {
          errorMessage = `Invalid API key. Please check your API key in Settings.`;
        }
      } else if (response.status === 429) {
        errorMessage = `Rate limit exceeded. Please wait a moment before trying again.`;
      } else if (response.status >= 500) {
        errorMessage = `Server error (${response.status}). ${errorData.message || 'Please try again later.'}`;
      }

      throw new Error(errorMessage);
    }
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  async getFamilyMembers() {
    const response = await fetch(`${API_URL}/api/family-members`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const data = await this.handleResponse(response);
    return transformArray(data, familyMemberFromAPI);
  }

  async createFamilyMember(memberData) {
    const response = await fetch(`${API_URL}/api/family-members`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(familyMemberToAPI(memberData)),
    });
    const data = await this.handleResponse(response);
    return familyMemberFromAPI(data);
  }

  async updateFamilyMember(id, memberData) {
    const response = await fetch(`${API_URL}/api/family-members/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(familyMemberToAPI(memberData)),
    });
    const data = await this.handleResponse(response);
    return familyMemberFromAPI(data);
  }

  async deleteFamilyMember(id) {
    const response = await fetch(`${API_URL}/api/family-members/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getActivities(filters = {}) {
    const params = new URLSearchParams();
    if (filters.memberId) params.append('member_id', filters.memberId);
    if (filters.date) params.append('date', filters.date);
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);

    const url = `${API_URL}/api/activities${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const data = await this.handleResponse(response);
    return transformArray(data, activityFromAPI);
  }

  async createActivity(activityData) {
    const response = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(activityToAPI(activityData)),
    });
    const data = await this.handleResponse(response);
    return activityFromAPI(data);
  }

  async updateActivity(id, activityData) {
    const response = await fetch(`${API_URL}/api/activities/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(activityToAPI(activityData)),
    });
    const data = await this.handleResponse(response);
    return activityFromAPI(data);
  }

  async deleteActivity(id) {
    const response = await fetch(`${API_URL}/api/activities/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSettings() {
    const response = await fetch(`${API_URL}/api/settings`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const data = await this.handleResponse(response);
    return settingsFromAPI(data);
  }

  async updateSetting(key, value) {
    const response = await fetch(`${API_URL}/api/settings/${key}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ value }),
    });
    return this.handleResponse(response);
  }

  async getPromptContent() {
    const response = await fetch(`${API_URL}/api/prompt-content`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getHomework(filters = {}) {
    const params = new URLSearchParams();
    if (filters.member_id) params.append('member_id', filters.member_id);
    if (filters.week_start_date)
      params.append('week_start_date', filters.week_start_date);

    const url = `${API_URL}/api/homework${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const data = await this.handleResponse(response);
    return transformArray(data, homeworkFromAPI);
  }

  async createHomework(homeworkData) {
    const response = await fetch(`${API_URL}/api/homework`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(homeworkToAPI(homeworkData)),
    });
    const data = await this.handleResponse(response);
    return homeworkFromAPI(data);
  }

  async updateHomework(id, homeworkData) {
    const response = await fetch(`${API_URL}/api/homework/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(homeworkToAPI(homeworkData)),
    });
    const data = await this.handleResponse(response);
    return homeworkFromAPI(data);
  }

  async deleteHomework(id) {
    const response = await fetch(`${API_URL}/api/homework/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async extractSchoolPlan(
    memberId,
    imageFile,
    apiKey,
    selectedModel = null,
    weekStartDate = null
  ) {
    const formData = new FormData();
    formData.append('member_id', memberId);
    formData.append('api_key', apiKey);
    formData.append('schoolPlanImage', imageFile);

    if (selectedModel) {
      formData.append('selected_model', selectedModel);
    }

    if (weekStartDate) {
      formData.append('week_start_date', weekStartDate);
    }

    const headers = {};
    const token = getAccessToken();
    if (token) {
      headers['x-access-token'] = token;
    }

    const response = await fetch(`${API_URL}/api/extract-school-plan`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    return this.handleResponse(response);
  }

  async deleteSchoolSchedule(memberId) {
    const response = await fetch(`${API_URL}/api/school-schedule/${memberId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async checkSpondSyncStatus(memberId, maxAgeMinutes = 5) {
    const response = await fetch(
      `${API_URL}/api/spond-activities/${memberId}/sync-status?maxAgeMinutes=${maxAgeMinutes}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async syncSpondActivities(memberId, startDate, endDate) {
    const response = await fetch(
      `${API_URL}/api/spond-activities/${memberId}/sync`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ startDate, endDate }),
      }
    );
    return this.handleResponse(response);
  }
}

export default new DataService();
