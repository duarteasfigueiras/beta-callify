// User Roles
export type UserRole = 'admin_manager' | 'agent';

// Language preferences
export type Language = 'pt' | 'en';

// Theme preferences
export type Theme = 'light' | 'dark';

// Call direction
export type CallDirection = 'inbound' | 'outbound';

// Alert types
export type AlertType = 'low_score' | 'risk_words' | 'long_duration' | 'no_next_step';

// Database Models
export interface Company {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  company_id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  language_preference: Language;
  theme_preference: Theme;
  created_at: string;
  updated_at: string;
}

export interface Criterion {
  id: number;
  company_id: number;
  name: string;
  description: string;
  weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: number;
  company_id: number;
  agent_id: number;
  phone_number: string;
  direction: CallDirection;
  duration_seconds: number;
  audio_file_path: string;
  transcription: string | null;
  transcription_timestamps: string | null; // JSON string
  summary: string | null;
  next_step_recommendation: string | null;
  final_score: number | null;
  score_justification: string | null;
  what_went_well: string | null; // JSON string
  what_went_wrong: string | null; // JSON string
  risk_words_detected: string | null; // JSON string
  call_date: string;
  created_at: string;
  expires_at: string;
}

export interface CallCriterionResult {
  id: number;
  call_id: number;
  criterion_id: number;
  passed: boolean;
  justification: string;
  timestamp_reference: string | null;
}

export interface CallFeedback {
  id: number;
  call_id: number;
  author_id: number;
  content: string;
  created_at: string;
}

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

// API Request/Response Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
}

export interface CreateCriterionRequest {
  name: string;
  description: string;
  weight: number;
}

export interface UpdateCriterionRequest {
  name?: string;
  description?: string;
  weight?: number;
  is_active?: boolean;
}

export interface CreateInvitationRequest {
  role: UserRole;
}

export interface RegisterRequest {
  token: string;
  username: string;
  password: string;
}

export interface AddFeedbackRequest {
  content: string;
}

export interface UpdateSettingsRequest {
  language_preference?: Language;
  theme_preference?: Theme;
}

// JWT Payload
export interface JWTPayload {
  userId: number;
  companyId: number;
  role: UserRole;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Call Filters
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

// Report Types
export interface DashboardOverview {
  total_calls: number;
  average_score: number;
  alerts_count: number;
  calls_with_next_step_percentage: number;
}

export interface ScoreByAgent {
  agent_id: number;
  agent_username: string;
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

export interface TopObjection {
  objection: string;
  count: number;
}
