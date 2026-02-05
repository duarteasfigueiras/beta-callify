// User Roles
export type UserRole = 'developer' | 'admin_manager' | 'agent';

// User categories for criteria assignment
export type UserCategory = 'comercial' | 'suporte' | 'tecnico' | 'supervisor' | 'all';

// Helper functions for role checks
export const isDeveloper = (role: UserRole): boolean => role === 'developer';
export const isAdminOrDeveloper = (role: UserRole): boolean => ['developer', 'admin_manager'].includes(role);

// Language preferences
export type Language = 'pt' | 'en';

// Theme preferences
export type Theme = 'light' | 'dark';

// Call direction
export type CallDirection = 'inbound' | 'outbound' | 'meeting';

// Alert types
export type AlertType = 'low_score' | 'risk_words' | 'long_duration' | 'no_next_step';

// Company model
export interface Company {
  id: number;
  name: string;
  invite_limit: number;
  users_count?: number;
  created_at: string;
  updated_at: string;
}

// User model (without password)
export interface User {
  id: number;
  company_id: number | null;  // null for developer role
  company_name?: string;      // included when fetching all users as developer
  username: string;
  role: UserRole;
  custom_role_name?: string | null;  // custom display name for the role (e.g., "Vendedor", "Suporte")
  categories?: string[];  // multiple categories for agents (e.g., ["Vendas", "Suporte"])
  display_name?: string | null;  // user's real name for call association
  phone_number?: string | null;  // phone number for call association
  language_preference: Language;
  theme_preference: Theme;
  created_at: string;
  updated_at: string;
}

// Criterion model
export interface Criterion {
  id: number;
  company_id: number;
  name: string;
  description: string;
  weight: number;
  is_active: boolean;
  category: UserCategory;  // Which user category this criterion applies to ('all' for all categories)
  created_at: string;
  updated_at: string;
}

// Call model
export interface Call {
  id: number;
  company_id: number;
  agent_id: number;
  agent_name?: string;  // display_name or username
  phone_number: string;
  direction: CallDirection;
  duration_seconds: number;
  audio_file_path: string;
  transcription: string | null;
  transcription_timestamps: TranscriptionTimestamp[] | null;
  summary: string | null;
  next_step_recommendation: string | null;
  final_score: number | null;
  score_justification: string | null;
  what_went_well: TimestampedItem[] | null;
  what_went_wrong: TimestampedItem[] | null;
  risk_words_detected: string[] | null;
  detected_category?: string | null;  // AI-detected category (when agent has multiple categories)
  call_date: string;
  created_at: string;
  expires_at: string;
}

export interface TranscriptionTimestamp {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface TimestampedItem {
  timestamp: number;
  text: string;
}

// Call criterion result
export interface CallCriterionResult {
  id: number;
  call_id: number;
  criterion_id: number;
  criterion_name?: string;
  passed: boolean;
  justification: string;
  timestamp_reference: string | null;
}

// Call feedback
export interface CallFeedback {
  id: number;
  call_id: number;
  author_id: number;
  author_username?: string;
  content: string;
  created_at: string;
}

// Alert model
export interface Alert {
  id: number;
  company_id: number;
  call_id: number;
  agent_id: number;
  type: AlertType;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Invitation model
export interface Invitation {
  id: number;
  company_id: number;
  invited_by: number;
  token: string;
  role: UserRole;
  used: boolean;
  expires_at: string;
  created_at: string;
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email?: string;
  username?: string;  // Legacy support
  password: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string>;
}

// Filter types
export interface CallFilters {
  agent_id?: number;
  date_from?: string;
  date_to?: string;
  score_min?: number;
  score_max?: number;
  duration_min?: number;
  duration_max?: number;
  sort_by?: 'date' | 'score' | 'duration';
  sort_order?: 'asc' | 'desc';
}

// Report types
export interface DashboardOverview {
  total_calls: number;
  average_score: number;
  alerts_count: number;
  calls_with_next_step_percentage: number;
}

export interface ScoreByAgent {
  agent_id: number;
  agent_username: string;
  agent_name: string;  // display_name or username
  average_score: number;
  total_calls: number;
}

export interface ScoreEvolution {
  date: string;
  average_score: number;
  total_calls: number;
}

export interface CallsByPeriod {
  period: string;
  count: number;
}

export interface TopReason {
  reason: string;
  count: number;
}

// Grouped contact reasons by category
export interface GroupedReason {
  category: string;
  count: number;
  reasons: TopReason[];
}

export interface TopObjection {
  objection: string;
  count: number;
}

// Form types
export interface CriterionFormData {
  name: string;
  description: string;
  weight: number;
  category?: UserCategory;
}

export interface UserFormData {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface InvitationFormData {
  role: UserRole;
}

export interface FeedbackFormData {
  content: string;
}

export interface SettingsFormData {
  language_preference: Language;
  theme_preference: Theme;
}
