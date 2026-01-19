-- Callify Database Schema for Supabase
-- Execute this in Supabase SQL Editor

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  invite_limit INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin_manager', 'agent')),
  custom_role_name TEXT,
  language_preference TEXT DEFAULT 'pt' CHECK (language_preference IN ('pt', 'en')),
  theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, username)
);

-- Criteria table
CREATE TABLE IF NOT EXISTS criteria (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 5),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  agent_id INTEGER NOT NULL REFERENCES users(id),
  phone_number TEXT,
  direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound', 'meeting')),
  duration_seconds INTEGER DEFAULT 0,
  audio_file_path TEXT,
  transcription TEXT,
  transcription_timestamps TEXT,
  summary TEXT,
  next_step_recommendation TEXT,
  final_score REAL,
  score_justification TEXT,
  what_went_well TEXT,
  what_went_wrong TEXT,
  risk_words_detected TEXT,
  -- New AI coaching fields
  phrases_to_avoid TEXT,           -- JSON array of phrases the agent should avoid
  recommended_phrases TEXT,        -- JSON array of recommended phrases
  response_improvement_example TEXT, -- JSON object with before/after example
  top_performer_comparison TEXT,   -- JSON object comparing to top performer
  skill_scores TEXT,               -- JSON object with skill breakdown (escuta_ativa, clareza, objecoes, fecho, empatia)
  call_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Call criteria results table
CREATE TABLE IF NOT EXISTS call_criteria_results (
  id SERIAL PRIMARY KEY,
  call_id INTEGER NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  criterion_id INTEGER NOT NULL REFERENCES criteria(id),
  passed BOOLEAN DEFAULT FALSE,
  justification TEXT,
  timestamp_reference TEXT
);

-- Call feedback table
CREATE TABLE IF NOT EXISTS call_feedback (
  id SERIAL PRIMARY KEY,
  call_id INTEGER NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  call_id INTEGER NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('low_score', 'risk_words', 'long_duration', 'no_next_step')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  invited_by INTEGER NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin_manager', 'agent')),
  custom_role_name TEXT,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_company ON calls(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_date ON calls(call_date);
CREATE INDEX IF NOT EXISTS idx_alerts_company ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_agent ON alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_criteria_company ON criteria(company_id);

-- Insert demo company
INSERT INTO companies (name) VALUES ('Demo Company')
ON CONFLICT DO NOTHING;

-- Insert demo users (passwords are hashed versions of 'admin123' and 'agent123')
-- Note: You may need to update these hashes if they don't work
INSERT INTO users (company_id, username, password_hash, role)
VALUES
  (1, 'admin', '$2a$10$8K1p/a0dL1LXMw0ER8iCKO8F.K1Bq8x6g/G5Uw5EIWO6x/H.yKZJi', 'admin_manager'),
  (1, 'agent', '$2a$10$rKN3EhHv4AqzG9V3JyHZOe3XJoM9X1xCvwNQ7zWvYwB4nKJfLxGLm', 'agent')
ON CONFLICT DO NOTHING;

-- Insert default criteria in Portuguese
INSERT INTO criteria (company_id, name, description, weight) VALUES
  (1, 'Saudacao/Abertura', 'Cumprimento e abertura da chamada', 1),
  (1, 'Identificacao da necessidade', 'Identificacao das necessidades do cliente', 2),
  (1, 'Escuta ativa', 'Demonstracao de escuta ativa', 1),
  (1, 'Apresentacao de solucao', 'Apresentacao clara de solucoes', 3),
  (1, 'Tratamento de objecoes', 'Gestao eficaz das objecoes do cliente', 2),
  (1, 'Clareza na comunicacao', 'Comunicacao clara e compreensivel', 1),
  (1, 'Tom profissional', 'Manutencao de tom profissional', 1),
  (1, 'Proximo passo definido', 'Definicao clara do proximo passo', 3),
  (1, 'Fecho da chamada', 'Encerramento profissional da chamada', 1),
  (1, 'Ausencia de palavras de risco', 'Evitar palavras de risco ou gatilhos', 2)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_criteria_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since we handle auth in the backend)
CREATE POLICY "Allow all for companies" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for criteria" ON criteria FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for calls" ON calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for call_criteria_results" ON call_criteria_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for call_feedback" ON call_feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for invitations" ON invitations FOR ALL USING (true) WITH CHECK (true);
