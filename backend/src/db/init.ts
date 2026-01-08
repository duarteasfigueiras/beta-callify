import { dbRun, dbGet } from './database';
import bcrypt from 'bcryptjs';

const schema = `
-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin_manager', 'agent')),
  language_preference TEXT DEFAULT 'pt' CHECK (language_preference IN ('pt', 'en')),
  theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE(company_id, username)
);

-- Criteria table
CREATE TABLE IF NOT EXISTS criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 5),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  phone_number TEXT,
  direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
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
  call_date TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- Call criteria results table
CREATE TABLE IF NOT EXISTS call_criteria_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id INTEGER NOT NULL,
  criterion_id INTEGER NOT NULL,
  passed INTEGER DEFAULT 0,
  justification TEXT,
  timestamp_reference TEXT,
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
  FOREIGN KEY (criterion_id) REFERENCES criteria(id)
);

-- Call feedback table
CREATE TABLE IF NOT EXISTS call_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  call_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('low_score', 'risk_words', 'long_duration', 'no_next_step')),
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  invited_by INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin_manager', 'agent')),
  used INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (invited_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_company ON calls(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_date ON calls(call_date);
CREATE INDEX IF NOT EXISTS idx_alerts_company ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_agent ON alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_criteria_company ON criteria(company_id);
`;

const defaultCriteria = [
  { name: 'Saudacao/Abertura', description: 'Greeting and opening of the call', weight: 1 },
  { name: 'Identificacao da necessidade', description: 'Identification of customer needs', weight: 2 },
  { name: 'Escuta ativa', description: 'Active listening skills', weight: 1 },
  { name: 'Apresentacao de solucao', description: 'Solution presentation', weight: 3 },
  { name: 'Tratamento de objecoes', description: 'Objection handling', weight: 2 },
  { name: 'Clareza na comunicacao', description: 'Communication clarity', weight: 1 },
  { name: 'Tom profissional', description: 'Professional tone', weight: 1 },
  { name: 'Proximo passo definido', description: 'Next step defined', weight: 3 },
  { name: 'Fecho da chamada', description: 'Call closing', weight: 1 },
  { name: 'Ausencia de palavras de risco', description: 'Absence of risk words', weight: 2 },
];

export async function initDatabase(): Promise<void> {
  console.log('Initializing database...');

  // Execute schema
  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await dbRun(statement + ';');
    }
  }

  console.log('Database schema created successfully');
}

export async function seedDatabase(): Promise<void> {
  console.log('Seeding database...');

  // Check if demo company exists
  const existingCompany = await dbGet<{ id: number }>('SELECT id FROM companies WHERE name = ?', ['Demo Company']);

  if (!existingCompany) {
    // Create demo company
    await dbRun('INSERT INTO companies (name) VALUES (?)', ['Demo Company']);
    console.log('Demo company created');

    // Get the company ID
    const company = await dbGet<{ id: number }>('SELECT id FROM companies WHERE name = ?', ['Demo Company']);
    if (!company) throw new Error('Failed to create company');

    // Create demo admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    await dbRun(
      'INSERT INTO users (company_id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [company.id, 'admin', passwordHash, 'admin_manager']
    );
    console.log('Demo admin user created (username: admin, password: admin123)');

    // Create demo agent user
    const agentPasswordHash = await bcrypt.hash('agent123', 10);
    await dbRun(
      'INSERT INTO users (company_id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [company.id, 'agent', agentPasswordHash, 'agent']
    );
    console.log('Demo agent user created (username: agent, password: agent123)');

    // Create default criteria
    for (const criterion of defaultCriteria) {
      await dbRun(
        'INSERT INTO criteria (company_id, name, description, weight) VALUES (?, ?, ?, ?)',
        [company.id, criterion.name, criterion.description, criterion.weight]
      );
    }
    console.log('Default evaluation criteria created');
  } else {
    console.log('Demo data already exists, skipping seed');
  }

  console.log('Database seeding completed');
}

// Run initialization if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      await initDatabase();
      await seedDatabase();
      console.log('Database initialization complete!');
      process.exit(0);
    } catch (error) {
      console.error('Error initializing database:', error);
      process.exit(1);
    }
  })();
}
