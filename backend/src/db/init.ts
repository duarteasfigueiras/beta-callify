import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

export async function initDatabase(): Promise<void> {
  console.log('Checking Supabase connection...');

  // Test connection
  const { data, error } = await supabase.from('companies').select('id').limit(1);
  if (error) {
    console.error('Supabase connection error:', error.message);
    throw error;
  }

  console.log('Supabase connected successfully');
}

export async function seedDatabase(): Promise<void> {
  console.log('Checking for existing demo data...');

  // Check if demo company exists
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('name', 'Demo Company')
    .single();

  if (!existingCompany) {
    console.log('Creating demo data...');

    // Create demo company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: 'Demo Company' })
      .select('id')
      .single();

    if (companyError) throw companyError;
    console.log('Demo company created');

    // Create demo admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const { error: adminError } = await supabase
      .from('users')
      .insert({
        company_id: company.id,
        username: 'admin',
        password_hash: adminPasswordHash,
        role: 'admin_manager'
      });

    if (adminError) throw adminError;
    console.log('Demo admin user created (username: admin, password: admin123)');

    // Create demo agent user
    const agentPasswordHash = await bcrypt.hash('agent123', 10);
    const { data: agent, error: agentError } = await supabase
      .from('users')
      .insert({
        company_id: company.id,
        username: 'agent',
        password_hash: agentPasswordHash,
        role: 'agent'
      })
      .select('id')
      .single();

    if (agentError) throw agentError;
    console.log('Demo agent user created (username: agent, password: agent123)');

    // Create default criteria
    const defaultCriteria = [
      { name: 'Saudação/Abertura', description: 'Cumprimento e abertura da chamada', weight: 1 },
      { name: 'Identificação da necessidade', description: 'Identificação das necessidades do cliente', weight: 2 },
      { name: 'Escuta ativa', description: 'Demonstração de escuta ativa', weight: 1 },
      { name: 'Apresentação de solução', description: 'Apresentação clara de soluções', weight: 3 },
      { name: 'Tratamento de objeções', description: 'Gestão eficaz das objeções do cliente', weight: 2 },
      { name: 'Clareza na comunicação', description: 'Comunicação clara e compreensível', weight: 1 },
      { name: 'Tom profissional', description: 'Manutenção de tom profissional', weight: 1 },
      { name: 'Próximo passo definido', description: 'Definição clara do próximo passo', weight: 3 },
      { name: 'Fecho da chamada', description: 'Encerramento profissional da chamada', weight: 1 },
      { name: 'Ausência de palavras de risco', description: 'Evitar palavras de risco ou gatilhos', weight: 2 },
    ];

    for (const criterion of defaultCriteria) {
      await supabase.from('criteria').insert({
        company_id: company.id,
        ...criterion
      });
    }
    console.log('Default evaluation criteria created');

    // Create sample calls
    const sampleCalls = [
      {
        phone: '+351912345678', score: 8.5, days_ago: 0, duration: 245,
        summary: 'Cliente ligou interessado em upgrade do plano atual. Agente identificou necessidades e apresentou opções adequadas.',
        next_step: 'Enviar orçamento por email até final do dia',
        went_well: JSON.stringify([
          { text: 'Boa identificação das necessidades', timestamp: '00:45' },
          { text: 'Apresentação clara das opções', timestamp: '01:30' },
          { text: 'Tom profissional mantido', timestamp: '03:15' }
        ]),
        went_wrong: JSON.stringify([
          { text: 'Poderia ter explorado mais objeções', timestamp: '02:15' }
        ]),
        risk_words: JSON.stringify([])
      },
      {
        phone: '+351923456789', score: 7.2, days_ago: 1, duration: 180,
        summary: 'Chamada de suporte técnico sobre problema de faturação.',
        next_step: 'Agente vai verificar com departamento financeiro',
        went_well: JSON.stringify([
          { text: 'Escuta ativa', timestamp: '00:30' },
          { text: 'Empatia demonstrada', timestamp: '01:15' }
        ]),
        went_wrong: JSON.stringify([
          { text: 'Tempo de espera elevado', timestamp: '02:00' },
          { text: 'Resolução não imediata', timestamp: '02:45' }
        ]),
        risk_words: JSON.stringify([])
      },
      {
        phone: '+351934567890', score: 9.1, days_ago: 2, duration: 320,
        summary: 'Excelente chamada de vendas. Cliente fechou contrato anual.',
        next_step: 'Enviar contrato para assinatura digital',
        went_well: JSON.stringify([
          { text: 'Tratamento de objeções exemplar', timestamp: '02:30' },
          { text: 'Fecho de venda conseguido', timestamp: '04:15' },
          { text: 'Upselling bem sucedido', timestamp: '03:45' }
        ]),
        went_wrong: JSON.stringify([]),
        risk_words: JSON.stringify([])
      },
      {
        phone: '+351945678901', score: 6.5, days_ago: 3, duration: 150,
        summary: 'Cliente com dúvidas sobre serviço. Informação básica fornecida.',
        next_step: 'Cliente vai pensar e ligar de volta',
        went_well: JSON.stringify([
          { text: 'Informação correta fornecida', timestamp: '01:00' }
        ]),
        went_wrong: JSON.stringify([
          { text: 'Faltou criar urgência', timestamp: '02:00' },
          { text: 'Próximo passo vago', timestamp: '02:20' }
        ]),
        risk_words: JSON.stringify([])
      },
      {
        phone: '+351956789012', score: 4.8, days_ago: 5, duration: 420,
        summary: 'Chamada de reclamação sobre serviço. Cliente muito insatisfeito.',
        next_step: 'Escalar para supervisor',
        went_well: JSON.stringify([
          { text: 'Agente manteve calma', timestamp: '03:00' }
        ]),
        went_wrong: JSON.stringify([
          { text: 'Não conseguiu resolver', timestamp: '04:30' },
          { text: 'Cliente mencionou cancelamento', timestamp: '05:15' },
          { text: 'Chamada demasiado longa', timestamp: '06:30' }
        ]),
        risk_words: JSON.stringify(['cancelar', 'insatisfeito', 'reclamação'])
      }
    ];

    for (const call of sampleCalls) {
      const callDate = new Date();
      callDate.setDate(callDate.getDate() - call.days_ago);

      await supabase.from('calls').insert({
        company_id: company.id,
        agent_id: agent.id,
        phone_number: call.phone,
        duration_seconds: call.duration,
        final_score: call.score,
        call_date: callDate.toISOString(),
        summary: call.summary,
        direction: 'inbound',
        next_step_recommendation: call.next_step,
        what_went_well: call.went_well,
        what_went_wrong: call.went_wrong,
        risk_words_detected: call.risk_words
      });
    }
    console.log('Sample calls created for testing');

    console.log('Demo data seeding completed');
  } else {
    console.log('Demo data already exists, skipping seed');
  }
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
