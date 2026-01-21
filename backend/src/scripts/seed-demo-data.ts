import { supabase } from '../db/supabase';

// Script to seed 50 calls with 20 agents (with categories) over the last 30 days
async function seedDemoData() {
  console.log('Starting to seed demo data...');

  // Get the Demo Company (ID 1)
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('name', 'Demo Company')
    .single();

  if (!company) {
    console.error('Demo Company not found!');
    process.exit(1);
  }

  console.log(`Using company ID: ${company.id}`);

  // 20 agents with different categories
  const agentData = [
    // Vendas (6 agents)
    { name: 'Ana Silva', category: 'Vendas' },
    { name: 'Bruno Costa', category: 'Vendas' },
    { name: 'Carla Ferreira', category: 'Vendas' },
    { name: 'David Santos', category: 'Vendas' },
    { name: 'Elena Oliveira', category: 'Vendas' },
    { name: 'Filipe Rodrigues', category: 'Vendas' },
    // Suporte Técnico (5 agents)
    { name: 'Gabriela Martins', category: 'Suporte Técnico' },
    { name: 'Hugo Pereira', category: 'Suporte Técnico' },
    { name: 'Inês Sousa', category: 'Suporte Técnico' },
    { name: 'João Almeida', category: 'Suporte Técnico' },
    { name: 'Katia Ribeiro', category: 'Suporte Técnico' },
    // Retenção (4 agents)
    { name: 'Luís Gonçalves', category: 'Retenção' },
    { name: 'Maria Dias', category: 'Retenção' },
    { name: 'Nuno Carvalho', category: 'Retenção' },
    { name: 'Olga Fernandes', category: 'Retenção' },
    // Atendimento Geral (5 agents)
    { name: 'Pedro Lima', category: 'Atendimento Geral' },
    { name: 'Rita Moreira', category: 'Atendimento Geral' },
    { name: 'Sérgio Nunes', category: 'Atendimento Geral' },
    { name: 'Tânia Vieira', category: 'Atendimento Geral' },
    { name: 'Vasco Teixeira', category: 'Atendimento Geral' },
  ];

  const agents: { id: number; username: string; category: string }[] = [];

  // Create or get agents
  for (const agent of agentData) {
    const username = agent.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '.');

    // Check if agent exists
    const { data: existingAgent } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .eq('company_id', company.id)
      .single();

    if (existingAgent) {
      // Update category if needed
      await supabase
        .from('users')
        .update({ custom_role_name: agent.category, display_name: agent.name })
        .eq('id', existingAgent.id);

      agents.push({ id: existingAgent.id, username: existingAgent.username, category: agent.category });
      console.log(`Agent ${username} updated with category ${agent.category}`);
    } else {
      // Create new agent
      const { data: newAgent, error } = await supabase
        .from('users')
        .insert({
          username,
          password_hash: '$2b$10$rqXpPJeZFUhvFRiQ.tFYL.RWYQTNmXVXqNqf.Dz1zWJZqvKiXK1Gy', // password: agent123
          role: 'agent',
          company_id: company.id,
          language_preference: 'pt',
          theme_preference: 'light',
          display_name: agent.name,
          custom_role_name: agent.category
        })
        .select('id, username')
        .single();

      if (error) {
        console.error(`Error creating agent ${username}:`, error);
      } else if (newAgent) {
        agents.push({ id: newAgent.id, username: newAgent.username, category: agent.category });
        console.log(`Created agent ${username} with category ${agent.category}`);
      }
    }
  }

  console.log(`\nTotal agents: ${agents.length}`);

  // Generate 50 dates over the last 30 days
  const today = new Date();
  const dates: Date[] = [];

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 10) + 8, Math.floor(Math.random() * 60), 0, 0);
    dates.push(date);
  }

  // Sort dates from oldest to newest
  dates.sort((a, b) => a.getTime() - b.getTime());

  // Sample call summaries by category
  const summariesByCategory: Record<string, string[]> = {
    'Vendas': [
      'Contacto comercial para apresentação de novo plano. Cliente mostrou interesse e pediu proposta.',
      'Follow-up de proposta enviada. Cliente aceita condições e fecha negócio.',
      'Chamada de prospecção. Identificadas necessidades do cliente, agendada demonstração.',
      'Cliente pediu comparação com concorrência. Enviado material comparativo.',
      'Renovação de contrato negociada com sucesso. Upsell de 20% alcançado.',
      'Cold call para novo lead. Qualificação inicial concluída.',
    ],
    'Suporte Técnico': [
      'Cliente reportou erro no sistema. Problema identificado e corrigido remotamente.',
      'Configuração de nova funcionalidade realizada com sucesso.',
      'Troubleshooting de problemas de conectividade. Reset de credenciais efectuado.',
      'Instalação guiada de software concluída. Cliente satisfeito.',
      'Bug reportado e documentado. Ticket criado para equipa de desenvolvimento.',
    ],
    'Retenção': [
      'Cliente insatisfeito solicitou cancelamento. Oferecido desconto de 30%, cliente aceitou ficar.',
      'Negociação de condições especiais para retenção. Sucesso - cliente renovou por 12 meses.',
      'Cliente a considerar concorrência. Apresentados benefícios exclusivos.',
      'Resolução de reclamação antiga. Cliente satisfeito com compensação oferecida.',
    ],
    'Atendimento Geral': [
      'Pedido de informações sobre serviços. Cliente esclarecido e satisfeito.',
      'Actualização de dados cadastrais processada com sucesso.',
      'Dúvida sobre facturação resolvida. Explicação detalhada fornecida.',
      'Agendamento de serviço técnico para próxima semana.',
      'Encaminhamento para departamento especializado após triagem.',
    ],
  };

  const nextSteps = [
    'Enviar email de confirmação',
    'Agendar chamada de follow-up em 48h',
    'Processar pedido no sistema',
    'Encaminhar para departamento técnico',
    'Aguardar resposta do cliente',
    'Preparar proposta comercial personalizada',
    'Contactar cliente em 24h',
    'Atualizar CRM com notas da chamada',
    '',
    '',
  ];

  const riskWordsList = [
    [],
    [],
    [],
    [],
    ['cancelar'],
    ['insatisfeito'],
    ['reclamação'],
    ['problema', 'urgente'],
    [],
    [],
    [],
    [],
  ];

  const directions = ['inbound', 'outbound'];
  const calls = [];

  // What went well / wrong examples
  const whatWentWellExamples = [
    ['Boa apresentação inicial', 'Escuta ativa demonstrada'],
    ['Empatia com o cliente', 'Resolução rápida do problema'],
    ['Tom profissional mantido', 'Explicação clara e concisa'],
    ['Bom rapport estabelecido', 'Identificação correta das necessidades'],
    ['Gestão eficiente do tempo', 'Proposta de valor bem articulada'],
  ];

  const whatWentWrongExamples = [
    ['Interrupções frequentes', 'Falta de escuta ativa'],
    ['Tom pouco empático', 'Não confirmou entendimento'],
    ['Explicação confusa', 'Não ofereceu alternativas'],
    ['Tempo de resposta lento', 'Faltou seguimento adequado'],
    [],
    [],
  ];

  // Contact reasons by category (why customers called)
  const contactReasonsByCategory: Record<string, { text: string; timestamp: string }[][]> = {
    'Vendas': [
      [{ text: 'Pedido de informação sobre preços', timestamp: '00:15' }],
      [{ text: 'Interesse em novo produto', timestamp: '00:20' }, { text: 'Comparação com concorrência', timestamp: '01:30' }],
      [{ text: 'Renovação de contrato', timestamp: '00:10' }],
      [{ text: 'Solicitação de proposta comercial', timestamp: '00:25' }],
    ],
    'Suporte Técnico': [
      [{ text: 'Problema técnico no sistema', timestamp: '00:15' }],
      [{ text: 'Erro de login', timestamp: '00:10' }, { text: 'Necessidade de reset de password', timestamp: '00:45' }],
      [{ text: 'Configuração de funcionalidade', timestamp: '00:20' }],
      [{ text: 'Bug no software', timestamp: '00:15' }],
    ],
    'Retenção': [
      [{ text: 'Pedido de cancelamento', timestamp: '00:10' }],
      [{ text: 'Insatisfação com serviço', timestamp: '00:15' }, { text: 'Reclamação de preço', timestamp: '01:00' }],
      [{ text: 'Comparação com concorrência', timestamp: '00:20' }],
      [{ text: 'Problemas recorrentes não resolvidos', timestamp: '00:15' }],
    ],
    'Atendimento Geral': [
      [{ text: 'Dúvida sobre faturação', timestamp: '00:10' }],
      [{ text: 'Atualização de dados cadastrais', timestamp: '00:15' }],
      [{ text: 'Informações sobre serviços', timestamp: '00:20' }],
      [{ text: 'Agendamento de serviço', timestamp: '00:10' }],
    ],
  };

  // Customer objections (concerns raised by customers)
  const objectionsByCategory: Record<string, { text: string; timestamp: string }[][]> = {
    'Vendas': [
      [{ text: 'Preço elevado', timestamp: '02:15' }],
      [{ text: 'Prazo de entrega longo', timestamp: '03:00' }, { text: 'Falta de funcionalidades', timestamp: '04:30' }],
      [{ text: 'Já tenho fornecedor', timestamp: '01:45' }],
      [],
    ],
    'Suporte Técnico': [
      [{ text: 'Problema já ocorreu antes', timestamp: '02:00' }],
      [{ text: 'Tempo de resposta lento', timestamp: '01:30' }],
      [],
      [],
    ],
    'Retenção': [
      [{ text: 'Preço muito alto', timestamp: '01:00' }, { text: 'Serviço não corresponde às expectativas', timestamp: '02:30' }],
      [{ text: 'Concorrência oferece melhor preço', timestamp: '01:45' }],
      [{ text: 'Má experiência anterior', timestamp: '02:00' }],
      [{ text: 'Falta de funcionalidades necessárias', timestamp: '01:30' }],
    ],
    'Atendimento Geral': [
      [{ text: 'Tempo de espera elevado', timestamp: '00:30' }],
      [{ text: 'Informação confusa no site', timestamp: '01:15' }],
      [],
      [],
    ],
  };

  for (let i = 0; i < 50; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];

    // Score varies by category (some categories tend to have better scores)
    let baseScore = 7;
    if (agent.category === 'Vendas') baseScore = 7.5;
    if (agent.category === 'Retenção') baseScore = 6.5;
    if (agent.category === 'Suporte Técnico') baseScore = 8;

    const score = Math.min(10, Math.max(1, baseScore + (Math.random() * 4 - 2)));
    const roundedScore = Math.round(score * 10) / 10;

    const duration = Math.floor(Math.random() * 1800) + 120; // 2-32 minutes
    const direction = directions[Math.floor(Math.random() * directions.length)];

    const categorySummaries = summariesByCategory[agent.category] || summariesByCategory['Atendimento Geral'];
    const summary = categorySummaries[Math.floor(Math.random() * categorySummaries.length)];

    const nextStep = nextSteps[Math.floor(Math.random() * nextSteps.length)];
    const riskWords = riskWordsList[Math.floor(Math.random() * riskWordsList.length)];

    const whatWentWell = whatWentWellExamples[Math.floor(Math.random() * whatWentWellExamples.length)];
    const whatWentWrong = whatWentWrongExamples[Math.floor(Math.random() * whatWentWrongExamples.length)];

    // Get contact reasons and objections for this category
    const categoryReasons = contactReasonsByCategory[agent.category] || contactReasonsByCategory['Atendimento Geral'];
    const categoryObjections = objectionsByCategory[agent.category] || objectionsByCategory['Atendimento Geral'];
    const contactReasons = categoryReasons[Math.floor(Math.random() * categoryReasons.length)];
    const objections = categoryObjections[Math.floor(Math.random() * categoryObjections.length)];

    // Generate phone number
    const phoneNumber = `+351 9${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`;

    calls.push({
      company_id: company.id,
      agent_id: agent.id,
      phone_number: phoneNumber,
      call_date: dates[i].toISOString(),
      direction,
      duration_seconds: duration,
      summary,
      final_score: roundedScore,
      next_step_recommendation: nextStep,
      risk_words_detected: riskWords.length > 0 ? JSON.stringify(riskWords) : null,
      what_went_well: whatWentWell.length > 0 ? JSON.stringify(whatWentWell) : null,
      what_went_wrong: whatWentWrong.length > 0 ? JSON.stringify(whatWentWrong) : null,
      contact_reasons: contactReasons.length > 0 ? JSON.stringify(contactReasons) : null,
      objections: objections.length > 0 ? JSON.stringify(objections) : null,
    });
  }

  // Insert calls
  const { error: insertError } = await supabase.from('calls').insert(calls);

  if (insertError) {
    console.error('Error inserting calls:', insertError);
    process.exit(1);
  }

  console.log(`\nSuccessfully created ${calls.length} calls!`);

  // Show summary by category
  console.log('\nSummary by category:');
  const categories = [...new Set(agents.map(a => a.category))];
  for (const cat of categories) {
    const catAgents = agents.filter(a => a.category === cat);
    const catCalls = calls.filter(c => catAgents.some(a => a.id === c.agent_id));
    const avgScore = catCalls.length > 0
      ? catCalls.reduce((a, b) => a + b.final_score, 0) / catCalls.length
      : 0;
    console.log(`  ${cat}: ${catAgents.length} agents, ${catCalls.length} calls, avg score: ${avgScore.toFixed(1)}`);
  }

  const inbound = calls.filter(c => c.direction === 'inbound').length;
  const outbound = calls.filter(c => c.direction === 'outbound').length;

  console.log('\nCall types:');
  console.log(`  Inbound: ${inbound}`);
  console.log(`  Outbound: ${outbound}`);

  process.exit(0);
}

seedDemoData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
