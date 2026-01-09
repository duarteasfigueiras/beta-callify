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

    // Get agent id for sample calls
    const agent = await dbGet<{ id: number }>('SELECT id FROM users WHERE username = ?', ['agent']);
    if (agent) {
      // Create sample calls with different dates for testing
      const sampleCalls = [
        {
          phone: '+351912345678', score: 8.5, days_ago: 0, duration: 245,
          summary: 'Cliente ligou interessado em upgrade do plano atual. Agente identificou necessidades e apresentou opcoes adequadas.',
          next_step: 'Enviar orcamento por email ate final do dia',
          went_well: JSON.stringify([
            { text: 'Boa identificacao das necessidades', timestamp: '00:45' },
            { text: 'Apresentacao clara das opcoes', timestamp: '01:30' },
            { text: 'Tom profissional mantido', timestamp: '03:15' }
          ]),
          went_wrong: JSON.stringify([
            { text: 'Poderia ter explorado mais objecoes', timestamp: '02:15' }
          ]),
          risk_words: JSON.stringify([])
        },
        {
          phone: '+351923456789', score: 7.2, days_ago: 1, duration: 180,
          summary: 'Chamada de suporte tecnico sobre problema de faturacao.',
          next_step: 'Agente vai verificar com departamento financeiro',
          went_well: JSON.stringify([
            { text: 'Escuta ativa', timestamp: '00:30' },
            { text: 'Empatia demonstrada', timestamp: '01:15' }
          ]),
          went_wrong: JSON.stringify([
            { text: 'Tempo de espera elevado', timestamp: '02:00' },
            { text: 'Resolucao nao imediata', timestamp: '02:45' }
          ]),
          risk_words: JSON.stringify([])
        },
        {
          phone: '+351934567890', score: 9.1, days_ago: 2, duration: 320,
          summary: 'Excelente chamada de vendas. Cliente fechou contrato anual.',
          next_step: 'Enviar contrato para assinatura digital',
          went_well: JSON.stringify([
            { text: 'Tratamento de objecoes exemplar', timestamp: '02:30' },
            { text: 'Fecho de venda conseguido', timestamp: '04:15' },
            { text: 'Upselling bem sucedido', timestamp: '03:45' }
          ]),
          went_wrong: JSON.stringify([]),
          risk_words: JSON.stringify([])
        },
        {
          phone: '+351945678901', score: 6.5, days_ago: 3, duration: 150,
          summary: 'Cliente com duvidas sobre servico. Informacao basica fornecida.',
          next_step: 'Cliente vai pensar e ligar de volta',
          went_well: JSON.stringify([
            { text: 'Informacao correcta fornecida', timestamp: '01:00' }
          ]),
          went_wrong: JSON.stringify([
            { text: 'Faltou criar urgencia', timestamp: '02:00' },
            { text: 'Proximo passo vago', timestamp: '02:20' }
          ]),
          risk_words: JSON.stringify([])
        },
        {
          phone: '+351956789012', score: 4.8, days_ago: 5, duration: 420,
          summary: 'Chamada de reclamacao sobre servico. Cliente muito insatisfeito.',
          next_step: 'Escalar para supervisor',
          went_well: JSON.stringify([
            { text: 'Agente manteve calma', timestamp: '03:00' }
          ]),
          went_wrong: JSON.stringify([
            { text: 'Nao conseguiu resolver', timestamp: '04:30' },
            { text: 'Cliente mencionou cancelamento', timestamp: '05:15' },
            { text: 'Chamada demasiado longa', timestamp: '06:30' }
          ]),
          risk_words: JSON.stringify(['cancelar', 'insatisfeito', 'reclamacao'])
        },
        {
          phone: '+351967890123', score: 8.0, days_ago: 7, duration: 200,
          summary: 'Renovacao de contrato bem sucedida.',
          next_step: 'Processar renovacao no sistema',
          went_well: JSON.stringify([
            { text: 'Cliente fidelizado', timestamp: '01:30' },
            { text: 'Processo rapido', timestamp: '02:45' }
          ]),
          went_wrong: JSON.stringify([
            { text: 'Poderia ter oferecido upgrade', timestamp: '03:00' }
          ]),
          risk_words: JSON.stringify([])
        },
        {
          phone: '+351978901234', score: 7.8, days_ago: 10, duration: 275,
          summary: 'Demonstracao de produto para potencial cliente.',
          next_step: 'Agendar reuniao presencial',
          went_well: JSON.stringify([
            { text: 'Demo bem estruturada', timestamp: '01:15' },
            { text: 'Interesse do cliente', timestamp: '03:30' }
          ]),
          went_wrong: JSON.stringify([
            { text: 'Algumas questoes tecnicas sem resposta', timestamp: '04:00' }
          ]),
          risk_words: JSON.stringify([])
        },
        {
          phone: '+351989012345', score: 9.5, days_ago: 14, duration: 190,
          summary: 'Chamada modelo. Todos os criterios cumpridos com excelencia.',
          next_step: 'Enviar proposta personalizada',
          went_well: JSON.stringify([
            { text: 'Abertura exemplar', timestamp: '00:15' },
            { text: 'Identificacao perfeita', timestamp: '00:45' },
            { text: 'Tratamento de objecoes excelente', timestamp: '01:30' },
            { text: 'Fecho claro', timestamp: '02:50' }
          ]),
          went_wrong: JSON.stringify([]),
          risk_words: JSON.stringify([])
        },
        {
          phone: '+351990123456', score: 5.2, days_ago: 21, duration: 380,
          summary: 'Cliente solicitou reembolso. Situacao escalada.',
          next_step: 'Departamento financeiro vai contactar cliente',
          went_well: JSON.stringify([
            { text: 'Procedimento seguido', timestamp: '02:00' }
          ]),
          went_wrong: JSON.stringify([
            { text: 'Cliente pediu reembolso', timestamp: '03:15' },
            { text: 'Mencao de advogado', timestamp: '04:30' },
            { text: 'Resolucao demorada', timestamp: '05:45' }
          ]),
          risk_words: JSON.stringify(['reembolso', 'advogado', 'devolucao'])
        },
        {
          phone: '+351901234567', score: 8.8, days_ago: 30, duration: 210,
          summary: 'Venda consultiva bem executada.',
          next_step: 'Agendar instalacao para proxima semana',
          went_well: JSON.stringify([
            { text: 'Consulta de necessidades', timestamp: '00:30' },
            { text: 'Solucao adequada', timestamp: '01:45' },
            { text: 'Cliente satisfeito', timestamp: '03:00' }
          ]),
          went_wrong: JSON.stringify([]),
          risk_words: JSON.stringify([])
        },
        {
          phone: '+351912345111', score: 7.0, days_ago: 45, duration: 165,
          summary: 'Chamada de follow-up pos-venda.',
          next_step: 'Enviar manual de utilizacao',
          went_well: JSON.stringify([
            { text: 'Cliente contactado proactivamente', timestamp: '00:15' }
          ]),
          went_wrong: JSON.stringify([
            { text: 'Algumas duvidas ficaram por esclarecer', timestamp: '02:30' }
          ]),
          risk_words: JSON.stringify([])
        },
        {
          phone: '+351923456222', score: 6.0, days_ago: 60, duration: 300,
          summary: 'Suporte tecnico com resolucao parcial.',
          next_step: 'Tecnico vai ligar amanha',
          went_well: JSON.stringify([
            { text: 'Diagnostico inicial feito', timestamp: '01:00' }
          ]),
          went_wrong: JSON.stringify([
            { text: 'Problema nao resolvido na chamada', timestamp: '03:30' },
            { text: 'Cliente frustrado', timestamp: '04:15' }
          ]),
          risk_words: JSON.stringify([])
        },
      ];

      for (const call of sampleCalls) {
        const callDate = new Date();
        callDate.setDate(callDate.getDate() - call.days_ago);
        const callDateStr = callDate.toISOString();

        await dbRun(
          `INSERT INTO calls (company_id, agent_id, phone_number, duration_seconds, final_score, call_date, summary, direction, next_step_recommendation, what_went_well, what_went_wrong, risk_words_detected)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            company.id,
            agent.id,
            call.phone,
            call.duration,
            call.score,
            callDateStr,
            call.summary,
            'inbound',
            call.next_step,
            call.went_well,
            call.went_wrong,
            call.risk_words
          ]
        );
      }
      console.log('Sample calls created for testing');

      // Add evaluation criteria results for the first few calls
      // We need to add criteria results for at least a few calls to test the evaluation tab
      // Call 1 (score 8.5) - good performance
      const criteriaForResults = [
        { name: 'Saudacao/Abertura', passed: true, justification: 'Agente cumprimentou cliente corretamente' },
        { name: 'Identificacao da necessidade', passed: true, justification: 'Necessidades do cliente bem identificadas' },
        { name: 'Escuta ativa', passed: true, justification: 'Demonstrou escuta ativa durante toda a chamada' },
        { name: 'Apresentacao de solucao', passed: true, justification: 'Solucoes apresentadas de forma clara' },
        { name: 'Tratamento de objecoes', passed: false, justification: 'Poderia ter explorado mais as objecoes do cliente', timestamp: '02:15' },
        { name: 'Clareza na comunicacao', passed: true, justification: 'Comunicacao clara e profissional' },
        { name: 'Tom profissional', passed: true, justification: 'Tom adequado mantido durante toda a chamada' },
        { name: 'Proximo passo definido', passed: true, justification: 'Proximo passo claramente definido' },
        { name: 'Fecho da chamada', passed: true, justification: 'Chamada encerrada corretamente' },
        { name: 'Ausencia de palavras de risco', passed: true, justification: 'Nenhuma palavra de risco detetada' },
      ];

      // Get criteria IDs
      for (const criteriaResult of criteriaForResults) {
        const criterion = await dbGet<{ id: number }>(
          'SELECT id FROM criteria WHERE company_id = ? AND name = ?',
          [company.id, criteriaResult.name]
        );
        if (criterion) {
          await dbRun(
            `INSERT INTO call_criteria_results (call_id, criterion_id, passed, justification, timestamp_reference)
             VALUES (?, ?, ?, ?, ?)`,
            [1, criterion.id, criteriaResult.passed ? 1 : 0, criteriaResult.justification, criteriaResult.timestamp || null]
          );
        }
      }
      console.log('Evaluation criteria results added for call #1');
    }
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
