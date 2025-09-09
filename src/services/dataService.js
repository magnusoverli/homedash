import { API_URL } from '../config/api';

class DataService {
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
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
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return this.handleResponse(response);
  }

  async createFamilyMember(memberData) {
    const response = await fetch(`${API_URL}/api/family-members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });
    return this.handleResponse(response);
  }

  async updateFamilyMember(id, memberData) {
    const response = await fetch(`${API_URL}/api/family-members/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });
    return this.handleResponse(response);
  }

  async deleteFamilyMember(id) {
    const response = await fetch(`${API_URL}/api/family-members/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return this.handleResponse(response);
  }

  async createActivity(activityData) {
    const response = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activityData),
    });
    return this.handleResponse(response);
  }

  async updateActivity(id, activityData) {
    const response = await fetch(`${API_URL}/api/activities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activityData),
    });
    return this.handleResponse(response);
  }

  async deleteActivity(id) {
    const response = await fetch(`${API_URL}/api/activities/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return this.handleResponse(response);
  }

  // Settings
  async getSettings() {
    const response = await fetch(`${API_URL}/api/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return this.handleResponse(response);
  }

  async updateSetting(key, value) {
    const response = await fetch(`${API_URL}/api/settings/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value }),
    });
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

      console.log('Migration completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new DataService();
