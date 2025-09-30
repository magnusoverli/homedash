import { API_URL } from '../config/api';
import { getAccessToken } from './authService';

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

      // Create a more informative error message
      let errorMessage =
        errorData.error || `HTTP error! status: ${response.status}`;

      // If there's additional context in the message field, include it
      if (errorData.message && errorData.message !== errorData.error) {
        errorMessage += `: ${errorData.message}`;
      }

      // For specific HTTP status codes, provide more context
      if (response.status === 529) {
        errorMessage = `Anthropic API is currently overloaded (Error 529). Please try again in a few moments.`;
      } else if (response.status === 401) {
        // Check if this is an auth error vs API key error
        if (errorData.message?.includes('access token')) {
          // Clear invalid token and reload to show login
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

  // Family Members
  async getFamilyMembers() {
    const response = await fetch(`${API_URL}/api/family-members`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async createFamilyMember(memberData) {
    const response = await fetch(`${API_URL}/api/family-members`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(memberData),
    });
    return this.handleResponse(response);
  }

  async updateFamilyMember(id, memberData) {
    const response = await fetch(`${API_URL}/api/family-members/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(memberData),
    });
    return this.handleResponse(response);
  }

  async deleteFamilyMember(id) {
    const response = await fetch(`${API_URL}/api/family-members/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Activities
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
    return this.handleResponse(response);
  }

  async createActivity(activityData) {
    const response = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(activityData),
    });
    return this.handleResponse(response);
  }

  async updateActivity(id, activityData) {
    const response = await fetch(`${API_URL}/api/activities/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(activityData),
    });
    return this.handleResponse(response);
  }

  async deleteActivity(id) {
    const response = await fetch(`${API_URL}/api/activities/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Settings
  async getSettings() {
    const response = await fetch(`${API_URL}/api/settings`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
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

  // Homework
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
    return this.handleResponse(response);
  }

  async createHomework(homeworkData) {
    const response = await fetch(`${API_URL}/api/homework`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(homeworkData),
    });
    return this.handleResponse(response);
  }

  async updateHomework(id, homeworkData) {
    const response = await fetch(`${API_URL}/api/homework/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(homeworkData),
    });
    return this.handleResponse(response);
  }

  async deleteHomework(id) {
    const response = await fetch(`${API_URL}/api/homework/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // School Plan Extraction
  async extractSchoolPlan(memberId, imageFile, apiKey, selectedModel = null) {
    const formData = new FormData();
    formData.append('member_id', memberId);
    formData.append('api_key', apiKey);
    formData.append('schoolPlanImage', imageFile);

    // Pass the selected model if provided
    if (selectedModel) {
      formData.append('selected_model', selectedModel);
    }

    const headers = {};
    const token = getAccessToken();
    if (token) {
      headers['x-access-token'] = token;
    }

    const response = await fetch(`${API_URL}/api/extract-school-plan`, {
      method: 'POST',
      headers: headers, // Don't set Content-Type for FormData, but include auth token
      body: formData,
    });
    return this.handleResponse(response);
  }

  // School Schedule Batch Deletion
  async deleteSchoolSchedule(memberId) {
    const response = await fetch(`${API_URL}/api/school-schedule/${memberId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Spond Activities Sync Status Check
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

  // Spond Activities Sync
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

  // Migration helper
  async migrateFromLocalStorage() {
    try {
      const familyMembers = JSON.parse(
        localStorage.getItem('familyMembers') || '[]'
      );
      const activities = JSON.parse(localStorage.getItem('activities') || '{}');
      const llmSettings = {
        llmIntegrationEnabled:
          localStorage.getItem('llmIntegrationEnabled') === 'true',
        anthropicApiKey: localStorage.getItem('anthropicApiKey') || '',
        selectedAnthropicModel:
          localStorage.getItem('selectedAnthropicModel') || '',
      };

      // Migrate family members
      for (const member of familyMembers) {
        try {
          await this.createFamilyMember({
            name: member.name,
            color: member.color,
          });
        } catch (error) {
          console.error('Error migrating member:', member.name, error);
        }
      }

      // Get the new members with their database IDs
      const newMembers = await this.getFamilyMembers();
      const memberIdMap = {};
      familyMembers.forEach(oldMember => {
        const newMember = newMembers.find(
          m => m.name === oldMember.name && m.color === oldMember.color
        );
        if (newMember) {
          memberIdMap[oldMember.id] = newMember.id;
        }
      });

      // Migrate activities
      for (const weekActivities of Object.values(activities)) {
        for (const [memberId, memberActivities] of Object.entries(
          weekActivities
        )) {
          const newMemberId = memberIdMap[memberId];
          if (newMemberId && Array.isArray(memberActivities)) {
            for (const activity of memberActivities) {
              try {
                await this.createActivity({
                  member_id: newMemberId,
                  title: activity.title,
                  date: activity.date,
                  start_time: activity.startTime,
                  end_time: activity.endTime,
                  description: activity.description || '',
                });
              } catch (error) {
                console.error(
                  'Error migrating activity:',
                  activity.title,
                  error
                );
              }
            }
          }
        }
      }

      // Migrate settings
      for (const [key, value] of Object.entries(llmSettings)) {
        if (value !== null && value !== undefined && value !== '') {
          try {
            await this.updateSetting(key, String(value));
          } catch (error) {
            console.error('Error migrating setting:', key, error);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new DataService();
