export const familyMemberFromAPI = apiData => {
  if (!apiData) return null;

  return {
    id: apiData.id,
    name: apiData.name,
    avatarColor: apiData.color,
    calendarUrl: apiData.calendar_url,
    calendarLastSynced: apiData.calendar_last_synced,
    calendarEventCount: apiData.calendar_event_count,
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
  };
};

export const familyMemberToAPI = clientData => {
  if (!clientData) return null;

  return {
    name: clientData.name,
    color: clientData.avatarColor || clientData.color,
  };
};

export const activityFromAPI = apiData => {
  if (!apiData) return null;

  return {
    id: apiData.id,
    memberId: apiData.member_id,
    title: apiData.title,
    date: apiData.date,
    startTime: apiData.start_time,
    endTime: apiData.end_time,
    description: apiData.description,
    notes: apiData.notes,
    activityType: apiData.activity_type,
    recurrenceType: apiData.recurrence_type,
    recurrenceEndDate: apiData.recurrence_end_date,
    source: apiData.source || 'manual',
    locationName: apiData.location_name,
    locationAddress: apiData.location_address,
    rawData: apiData.raw_data,
    isCancelled: apiData.is_cancelled,
    organizerName: apiData.organizer_name,
    responseStatus: apiData.response_status,
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
  };
};

export const activityToAPI = clientData => {
  if (!clientData) return null;

  return {
    member_id: clientData.memberId,
    title: clientData.title,
    date: clientData.date,
    start_time: clientData.startTime,
    end_time: clientData.endTime,
    description: clientData.description || '',
    notes: clientData.notes || '',
    activity_type: clientData.activityType || 'manual',
    recurrence_type: clientData.recurrenceType || 'none',
    recurrence_end_date: clientData.recurrenceEndDate || null,
  };
};

export const homeworkFromAPI = apiData => {
  if (!apiData) return null;

  return {
    id: apiData.id,
    memberId: apiData.member_id,
    memberName: apiData.member_name,
    subject: apiData.subject,
    assignment: apiData.assignment,
    weekStartDate: apiData.week_start_date,
    completed: apiData.completed,
    extractedFromImage: apiData.extracted_from_image,
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
  };
};

export const homeworkToAPI = clientData => {
  if (!clientData) return null;

  return {
    member_id: clientData.memberId,
    subject: clientData.subject,
    assignment: clientData.assignment,
    week_start_date: clientData.weekStartDate,
    completed: clientData.completed || false,
    extracted_from_image: clientData.extractedFromImage || null,
  };
};

export const settingsFromAPI = apiData => {
  if (!apiData) return {};

  const settings = {};

  if (apiData.llmIntegrationEnabled !== undefined) {
    settings.llmIntegrationEnabled = apiData.llmIntegrationEnabled === 'true';
  }

  if (apiData.anthropicApiKey) {
    settings.anthropicApiKey = apiData.anthropicApiKey;
  }

  if (apiData.selectedAnthropicModel) {
    settings.selectedAnthropicModel = apiData.selectedAnthropicModel;
  }

  return settings;
};

export const transformArray = (array, transformer) => {
  if (!Array.isArray(array)) return [];
  return array.map(transformer);
};
