import { supabase } from '../db/supabase';

// Script to seed 50 calls with 15 agents over the last 40 days
async function seedCalls() {
  console.log('Starting to seed calls...');

  // Get the Demo Company
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

  // Create 15 agents
  const agentNames = [
    'Ana Silva', 'Bruno Costa', 'Carla Ferreira', 'David Santos', 'Elena Oliveira',
    'Filipe Rodrigues', 'Gabriela Martins', 'Hugo Pereira', 'Inês Sousa', 'João Almeida',
    'Katia Ribeiro', 'Luís Gonçalves', 'Maria Dias', 'Nuno Carvalho', 'Olga Fernandes'
  ];

  const agents: { id: number; username: string }[] = [];

  // Check for existing agents and create new ones
  for (let i = 0; i < agentNames.length; i++) {
    const username = agentNames[i].toLowerCase().replace(' ', '.');

    // Check if agent exists
    const { data: existingAgent } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .single();

    if (existingAgent) {
      agents.push({ id: existingAgent.id, username: existingAgent.username });
      console.log(`Agent ${username} already exists with ID ${existingAgent.id}`);
    } else {
      // Create new agent
      const { data: newAgent, error } = await supabase
        .from('users')
        .insert({
          username,
          password_hash: '$2b$10$dummy.hash.for.seeded.agents',
          role: 'agent',
          company_id: company.id,
          language_preference: 'pt',
          theme_preference: 'light',
          display_name: agentNames[i]
        })
        .select('id, username')
        .single();

      if (error) {
        console.error(`Error creating agent ${username}:`, error);
      } else if (newAgent) {
        agents.push({ id: newAgent.id, username: newAgent.username });
        console.log(`Created agent ${username} with ID ${newAgent.id}`);
      }
    }
  }

  console.log(`Total agents: ${agents.length}`);

  // Generate dates for the last 40 days (at least one per day)
  const today = new Date();
  const dates: Date[] = [];

  // First, ensure one call per day for the last 40 days
  for (let i = 0; i < 40; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(Math.floor(Math.random() * 10) + 8, Math.floor(Math.random() * 60), 0, 0);
    dates.push(date);
  }

  // Add 10 more random dates within the 40 days to reach 50 calls
  for (let i = 0; i < 10; i++) {
    const daysAgo = Math.floor(Math.random() * 40);
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 10) + 9, Math.floor(Math.random() * 60), 0, 0);
    dates.push(date);
  }

  // Sort dates from oldest to newest
  dates.sort((a, b) => a.getTime() - b.getTime());

  // Sample call summaries (Portuguese)
  const summaries = [
    'Cliente ligou para reportar problema técnico com o sistema. Resolvido após reiniciar o serviço.',
    'Pedido de informações sobre preços e planos disponíveis. Enviado email com proposta comercial.',
    'Reclamação sobre fatura incorreta. Crédito aplicado na próxima fatura.',
    'Cliente interessado em upgrade de plano. Agendada demonstração para próxima semana.',
    'Suporte técnico para configuração de conta. Problema resolvido com sucesso.',
    'Dúvida sobre política de devolução. Explicados os termos e condições.',
    'Cliente solicitou cancelamento. Oferecido desconto de retenção, cliente aceitou.',
    'Chamada de acompanhamento pós-venda. Cliente satisfeito com o serviço.',
    'Problema de faturação resolvido. Cliente agradeceu a rápida resolução.',
    'Pedido de alteração de dados cadastrais. Atualização efetuada com sucesso.',
    'Cliente reportou atraso na entrega. Verificado status e informado prazo atualizado.',
    'Consulta sobre disponibilidade de stock. Produto reservado para cliente.',
    'Renovação de contrato discutida. Cliente pediu tempo para pensar.',
    'Ticket de suporte aberto para bug no sistema. Encaminhado para equipa técnica.',
    'Cliente muito insatisfeito com tempo de espera. Pedido desculpas e oferecido compensação.',
    'Chamada comercial outbound. Cliente demonstrou interesse em novo produto.',
    'Follow-up de proposta enviada. Cliente ainda a avaliar opções.',
    'Pedido de reembolso processado. Valor devolvido em 5 dias úteis.',
    'Explicação detalhada sobre funcionalidades do serviço. Cliente ficou esclarecido.',
    'Agendamento de instalação técnica para próxima terça-feira.',
  ];

  const nextSteps = [
    'Enviar email de confirmação',
    'Agendar chamada de follow-up',
    'Processar pedido no sistema',
    'Encaminhar para departamento técnico',
    'Aguardar resposta do cliente',
    'Preparar proposta comercial',
    'Verificar stock e confirmar disponibilidade',
    'Contactar cliente em 48h',
    'Atualizar ticket no sistema',
    'Nenhuma ação necessária',
    '', // Some calls without next step
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
    ['advogado'],
    [],
    [],
    [],
  ];

  const directions = ['inbound', 'outbound'];
  const calls = [];

  for (let i = 0; i < 50; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const score = Math.random() < 0.15
      ? Math.round((Math.random() * 4 + 1) * 10) / 10  // 15% chance of low score (1-5)
      : Math.round((Math.random() * 4 + 6) * 10) / 10; // 85% chance of good score (6-10)

    const duration = Math.floor(Math.random() * 2400) + 60; // 1-40 minutes
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const summary = summaries[Math.floor(Math.random() * summaries.length)];
    const nextStep = nextSteps[Math.floor(Math.random() * nextSteps.length)];
    const riskWords = riskWordsList[Math.floor(Math.random() * riskWordsList.length)];

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
      final_score: score,
      next_step_recommendation: nextStep,
      risk_words_detected: riskWords.length > 0 ? JSON.stringify(riskWords) : null,
    });
  }

  // Insert calls
  const { error: insertError } = await supabase.from('calls').insert(calls);

  if (insertError) {
    console.error('Error inserting calls:', insertError);
    process.exit(1);
  }

  console.log(`\nSuccessfully created ${calls.length} calls!`);

  // Show summary
  const inbound = calls.filter(c => c.direction === 'inbound').length;
  const outbound = calls.filter(c => c.direction === 'outbound').length;
  const avgScore = calls.reduce((a, b) => a + b.final_score, 0) / calls.length;

  console.log('\nSummary:');
  console.log(`  Inbound calls: ${inbound}`);
  console.log(`  Outbound calls: ${outbound}`);
  console.log(`  Average score: ${avgScore.toFixed(1)}`);
  console.log(`  Agents used: ${agents.length}`);
  console.log(`  Date range: ${dates[0].toLocaleDateString('pt-PT')} - ${dates[dates.length - 1].toLocaleDateString('pt-PT')}`);

  process.exit(0);
}

seedCalls().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
