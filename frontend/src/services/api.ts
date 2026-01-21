import axios from 'axios';

// API URL from environment variable or default to localhost for development
const envUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001/api';
// Ensure URL has protocol and /api suffix
let API_BASE_URL = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
if (!API_BASE_URL.endsWith('/api')) {
  API_BASE_URL = API_BASE_URL.replace(/\/$/, '') + '/api';
}
console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests (check both localStorage and sessionStorage)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
      // Clear both storages
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
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
  register: async (token: string, username: string, password: string, display_name?: string, phone_number?: string) => {
    const response = await api.post('/auth/register', { token, username, password, display_name, phone_number });
    return response.data;
  },
  recoverPassword: async (username: string, email: string) => {
    const response = await api.post('/auth/recover-password', { username, email });
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
  getTopReasons: async (params?: { date_from?: string; date_to?: string }) => {
    const response = await api.get('/dashboard/top-reasons', { params });
    return response.data;
  },
  getTopObjections: async () => {
    const response = await api.get('/dashboard/top-objections');
    return response.data;
  },
  getScoreEvolutionByCategory: async (days?: number) => {
    const response = await api.get('/dashboard/score-evolution-by-category', { params: { days } });
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
    sort_by?: string;
    sort_order?: string;
    direction?: string;
  }) => {
    const response = await api.get('/calls', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/calls/${id}`);
    return response.data;
  },
  getByRiskWord: async (word: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/calls/by-risk-word/${encodeURIComponent(word)}`, { params });
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
  getMyCompany: async () => {
    const response = await api.get('/users/me/company');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  invite: async (role: 'admin_manager' | 'agent', company_id?: number, custom_role_name?: string) => {
    const response = await api.post('/users/invite', { role, company_id, custom_role_name });
    return response.data;
  },
  updateRole: async (id: number, role: 'admin_manager' | 'agent') => {
    const response = await api.patch(`/users/${id}/role`, { role });
    return response.data;
  },
  updatePreferences: async (data: { language_preference?: 'pt' | 'en'; theme_preference?: 'light' | 'dark'; phone_number?: string | null; display_name?: string | null }) => {
    const response = await api.patch('/users/me/preferences', data);
    return response.data;
  },
  updatePhoneNumber: async (id: number, phone_number: string | null) => {
    const response = await api.patch(`/users/${id}/phone`, { phone_number });
    return response.data;
  },
  updateCategory: async (id: number, custom_role_name: string | null) => {
    const response = await api.patch(`/users/${id}/category`, { custom_role_name });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// Criteria API
export const criteriaApi = {
  getAll: async (params?: { category?: string }) => {
    const response = await api.get('/criteria', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/criteria/${id}`);
    return response.data;
  },
  create: async (data: { name: string; description: string; weight?: number; category?: string }) => {
    const response = await api.post('/criteria', data);
    return response.data;
  },
  update: async (id: number, data: { name?: string; description?: string; weight?: number; is_active?: boolean; category?: string }) => {
    const response = await api.put(`/criteria/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/criteria/${id}`);
    return response.data;
  },
};

// Alert Settings API
export interface AlertSettings {
  id?: number;
  company_id: number;
  low_score_enabled: boolean;
  low_score_threshold: number;
  risk_words_enabled: boolean;
  risk_words_list: string;
  long_duration_enabled: boolean;
  long_duration_threshold_minutes: number;
  no_next_step_enabled: boolean;
}

export const alertSettingsApi = {
  get: async (): Promise<AlertSettings> => {
    const response = await api.get('/criteria/alert-settings');
    return response.data;
  },
  update: async (data: Partial<AlertSettings>): Promise<AlertSettings> => {
    const response = await api.put('/criteria/alert-settings', data);
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

// Companies API (developer only)
export const companiesApi = {
  getAll: async () => {
    const response = await api.get('/users/companies');
    return response.data;
  },
  create: async (name: string, invite_limit?: number) => {
    const response = await api.post('/users/companies', { name, invite_limit });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/users/companies/${id}`);
    return response.data;
  },
};

// Categories API
export interface Category {
  key: string;
  name: string;
  color_id: string;
  color_classes: string;
  is_builtin: boolean;
  criteria_count?: number;
}

export interface ColorOption {
  id: string;
  bg: string;
  text: string;
  darkBg: string;
  darkText: string;
  preview: string; // Vibrant color for the color picker
}

export const categoriesApi = {
  getAll: async (company_id?: number): Promise<Category[]> => {
    const response = await api.get('/categories', { params: company_id ? { company_id } : {} });
    return response.data;
  },
  getColors: async (): Promise<ColorOption[]> => {
    const response = await api.get('/categories/colors');
    return response.data;
  },
  create: async (name: string, color_id: string, company_id?: number): Promise<Category> => {
    const response = await api.post('/categories', { name, color_id, company_id });
    return response.data;
  },
  update: async (key: string, name: string, color_id: string, company_id?: number): Promise<Category> => {
    const response = await api.put(`/categories/${key}`, { name, color_id, company_id });
    return response.data;
  },
  delete: async (key: string, company_id?: number): Promise<{ message: string; deleted_criteria: number }> => {
    const response = await api.delete(`/categories/${key}`, { params: company_id ? { company_id } : {} });
    return response.data;
  },
};

