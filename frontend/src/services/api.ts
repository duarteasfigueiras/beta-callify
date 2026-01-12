import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for login endpoint - let the component handle it
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  register: async (token: string, username: string, password: string) => {
    const response = await api.post('/auth/register', { token, username, password });
    return response.data;
  },
  recoverPassword: async (username: string) => {
    const response = await api.post('/auth/recover-password', { username });
    return response.data;
  },
  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getOverview: async (params?: { date_from?: string; date_to?: string }) => {
    const response = await api.get('/dashboard/overview', { params });
    return response.data;
  },
  getRecentCalls: async (limit?: number) => {
    const response = await api.get('/dashboard/recent-calls', { params: { limit } });
    return response.data;
  },
  getAlerts: async (limit?: number) => {
    const response = await api.get('/dashboard/alerts', { params: { limit } });
    return response.data;
  },
  getScoreEvolution: async (days?: number, agent_id?: number) => {
    const response = await api.get('/dashboard/score-evolution', { params: { days, agent_id } });
    return response.data;
  },
  getScoreByAgent: async (params?: { date_from?: string; date_to?: string }) => {
    const response = await api.get('/dashboard/score-by-agent', { params });
    return response.data;
  },
  getCallsByPeriod: async (days?: number, agent_id?: number) => {
    const response = await api.get('/dashboard/calls-by-period', { params: { days, agent_id } });
    return response.data;
  },
  getTopReasons: async () => {
    const response = await api.get('/dashboard/top-reasons');
    return response.data;
  },
  getTopObjections: async () => {
    const response = await api.get('/dashboard/top-objections');
    return response.data;
  },
};

// Calls API
export const callsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    agent_id?: number;
    date_from?: string;
    date_to?: string;
    score_min?: number;
    score_max?: number;
  }) => {
    const response = await api.get('/calls', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/calls/${id}`);
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  invite: async (role: 'admin_manager' | 'agent') => {
    const response = await api.post('/users/invite', { role });
    return response.data;
  },
  updateRole: async (id: number, role: 'admin_manager' | 'agent') => {
    const response = await api.patch(`/users/${id}/role`, { role });
    return response.data;
  },
  updatePreferences: async (data: { language_preference?: 'pt' | 'en'; theme_preference?: 'light' | 'dark' }) => {
    const response = await api.patch('/users/me/preferences', data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// Criteria API
export const criteriaApi = {
  getAll: async () => {
    const response = await api.get('/criteria');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/criteria/${id}`);
    return response.data;
  },
  create: async (data: { name: string; description: string; weight?: number }) => {
    const response = await api.post('/criteria', data);
    return response.data;
  },
  update: async (id: number, data: { name?: string; description?: string; weight?: number; is_active?: boolean }) => {
    const response = await api.put(`/criteria/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/criteria/${id}`);
    return response.data;
  },
};

// Alerts API
export const alertsApi = {
  getAll: async (params?: { page?: number; limit?: number; unread_only?: boolean }) => {
    const response = await api.get('/alerts', { params });
    return response.data;
  },
  markAsRead: async (id: number) => {
    const response = await api.patch(`/alerts/${id}/read`);
    return response.data;
  },
};
