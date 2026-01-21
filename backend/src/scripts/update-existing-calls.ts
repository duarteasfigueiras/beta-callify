import { supabase } from '../db/supabase';

// Script to update existing calls with contact_reasons and objections fields
async function updateExistingCalls() {
  console.log('Starting to update existing calls...');

  // Get the company "master em relacionamentos"
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%master%relacionamentos%')
    .single();

  if (!company) {
    console.error('Company "master em relacionamentos" not found!');
    // List available companies
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name');
    console.log('Available companies:', companies);
    process.exit(1);
  }

  console.log(`Found company: ${company.name} (ID: ${company.id})`);

  // Get all calls for this company that don't have contact_reasons or objections
  const { data: calls, error } = await supabase
    .from('calls')
    .select('id, agent_id')
    .eq('company_id', company.id)
    .or('contact_reasons.is.null,objections.is.null');

  if (error) {
    console.error('Error fetching calls:', error);
    process.exit(1);
  }

  console.log(`Found ${calls?.length || 0} calls to update`);

  if (!calls || calls.length === 0) {
    console.log('No calls need updating.');
    process.exit(0);
  }

  // Get agents with their categories
  const { data: agents } = await supabase
    .from('users')
    .select('id, custom_role_name')
    .eq('company_id', company.id);

  const agentCategories: Record<number, string> = {};
  (agents || []).forEach((a: any) => {
    agentCategories[a.id] = a.custom_role_name || 'Atendimento Geral';
  });

  // Contact reasons by category
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

  // Customer objections by category
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

  let updated = 0;
  let errors = 0;

  for (const call of calls) {
    const category = agentCategories[call.agent_id] || 'Atendimento Geral';

    const categoryReasons = contactReasonsByCategory[category] || contactReasonsByCategory['Atendimento Geral'];
    const categoryObjections = objectionsByCategory[category] || objectionsByCategory['Atendimento Geral'];

    const contactReasons = categoryReasons[Math.floor(Math.random() * categoryReasons.length)];
    const objections = categoryObjections[Math.floor(Math.random() * categoryObjections.length)];

    const { error: updateError } = await supabase
      .from('calls')
      .update({
        contact_reasons: contactReasons.length > 0 ? JSON.stringify(contactReasons) : null,
        objections: objections.length > 0 ? JSON.stringify(objections) : null,
      })
      .eq('id', call.id);

    if (updateError) {
      console.error(`Error updating call ${call.id}:`, updateError);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`\nUpdate complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);

  process.exit(0);
}

updateExistingCalls().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
