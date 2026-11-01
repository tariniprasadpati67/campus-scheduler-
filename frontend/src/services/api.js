const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

/**
 * Standard fetch wrapper with automatic JWT authorization header
 * and structured error handling.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('cit_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new Error(`Network error connecting to backend API: ${err.message}`);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Server returned an unparseable response.`);
    }
    return null;
  }

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || `Request failed with HTTP ${response.status}`;
    const error = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request('/auth/me'),
  },

  // Timetable & Analytics
  timetable: {
    get: (params = {}) => {
      const search = new URLSearchParams();
      if (params.group_id) search.set('group_id', params.group_id);
      if (params.faculty_id) search.set('faculty_id', params.faculty_id);
      if (params.room_id) search.set('room_id', params.room_id);
      const qs = search.toString();
      return request(`/timetable${qs ? `?${qs}` : ''}`);
    },
    getUtilisation: () => request('/timetable/utilisation'),
    getConflicts: () => request('/timetable/conflicts'),
    manualSchedule: ({ session_id, day, start_period, room_id, reason }) =>
      request('/timetable/manual-schedule', {
        method: 'POST',
        body: JSON.stringify({ session_id, day, start_period, room_id, reason }),
      }),
  },

  // Change Requests & Rescheduling
  changes: {
    list: (status_filter) => {
      const qs = status_filter ? `?status_filter=${encodeURIComponent(status_filter)}` : '';
      return request(`/changes${qs}`);
    },
    propose: (changeData) =>
      request('/changes/propose', {
        method: 'POST',
        body: JSON.stringify(changeData),
      }),
    decide: (id, action, reason) =>
      request(`/changes/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  // Venue Bookings
  bookings: {
    list: (status_filter) => {
      const qs = status_filter ? `?status_filter=${encodeURIComponent(status_filter)}` : '';
      return request(`/bookings${qs}`);
    },
    create: (bookingData) =>
      request('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      }),
    cancel: (id, reason) =>
      request(`/bookings/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Cancelled by requester' }),
      }),
  },

  // Faculty Unavailability
  faculty: {
    listUnavailability: (faculty_id) => {
      const qs = faculty_id ? `?faculty_id=${encodeURIComponent(faculty_id)}` : '';
      return request(`/faculty/unavailability${qs}`);
    },
    markUnavailability: (data) =>
      request('/faculty/unavailability', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Admin Operations
  admin: {
    resetDemo: () =>
      request('/admin/reset-demo', {
        method: 'POST',
      }),
    getAuditLogs: (limit = 100) => request(`/admin/audit-logs?limit=${limit}`),
    exportSchedule: () => request('/schedule/export'),
  },

  // AI Scheduling & Parsing Assistant (Step 11)
  ai: {
    parseBooking: (text, user_role) =>
      request('/ai/parse-booking', {
        method: 'POST',
        body: JSON.stringify({ text, user_role }),
      }),
    parseChange: (text, faculty_id) =>
      request('/ai/parse-change', {
        method: 'POST',
        body: JSON.stringify({ text, faculty_id }),
      }),
    explainDecision: (decision_type, data) =>
      request('/ai/explain-decision', {
        method: 'POST',
        body: JSON.stringify({ decision_type, data }),
      }),
  },
};

