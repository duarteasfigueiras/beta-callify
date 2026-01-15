import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mjtmjkfigrnhlcayoedb.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdG1qa2ZpZ3JuaGxjYXlvZWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjQ1MDQsImV4cCI6MjA4MzMwMDUwNH0.vJf0L-2EccYwdqbS8hW-rQOQp_pZ80n-Yx6OFYnJ_vw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const NUM_AGENTS = 20;
const NUM_CALLS = 1000;
const DAYS_RANGE = 90;
const COMPANY_ID = 1; // Adjust based on your setup

// Portuguese first names and last names for realistic agent names
const firstNames = [
  'João', 'Maria', 'Pedro', 'Ana', 'Rui', 'Sofia', 'Miguel', 'Inês',
  'Carlos', 'Beatriz', 'André', 'Catarina', 'Tiago', 'Mariana', 'Hugo',
  'Rita', 'Diogo', 'Francisca', 'Bruno', 'Marta', 'Rafael', 'Leonor',
  'Gonçalo', 'Carolina', 'Filipe'
];

const lastNames = [
  'Silva', 'Santos', 'Ferreira', 'Oliveira', 'Costa', 'Rodrigues',
  'Martins', 'Sousa', 'Fernandes', 'Pereira', 'Alves', 'Carvalho',
  'Gomes', 'Ribeiro', 'Lopes', 'Marques', 'Mendes', 'Nunes', 'Pinto'
];

// Sample data for realistic calls
const contactReasons = [
  'Dúvida sobre faturação',
  'Pedido de informação',
  'Reclamação de serviço',
  'Alteração de dados',
  'Cancelamento',
  'Novo contrato',
  'Problema técnico',
  'Pedido de orçamento',
  'Atualização de plano',
  'Suporte pós-venda'
];

const objections = [
  'Preço muito alto',
  'Preciso pensar',
  'Já tenho fornecedor',
  'Não tenho tempo',
  'Não estou interessado',
  'Vou falar com o gestor',
  'Ligar mais tarde',
  'Envie por email'
];

const riskWords = [
  'cancelar', 'reclamação', 'insatisfeito', 'problema', 'mau serviço',
  'concorrência', 'caro', 'nunca mais', 'tribunal', 'advogado'
];

const summaryTemplates = [
  'Cliente contactou para {reason}. A situação foi {resolution}.',
  'Chamada recebida sobre {reason}. {resolution}.',
  'Agente atendeu questão de {reason}. {resolution}.',
  'Interação relacionada com {reason}. {resolution}.',
  'Cliente apresentou {reason}. O agente {resolution}.'
];

const resolutions = [
  'resolvida com sucesso',
  'encaminhada para o departamento responsável',
  'em análise',
  'concluída satisfatoriamente',
  'requer follow-up'
];

const nextSteps = [
  'Enviar proposta por email',
  'Agendar chamada de follow-up',
  'Processar pedido no sistema',
  'Escalar para supervisor',
  'Aguardar decisão do cliente',
  'Preparar documentação',
  null // Some calls don't have next steps
];

const whatWentWellOptions = [
  'Boa apresentação inicial',
  'Escuta ativa demonstrada',
  'Empatia com o cliente',
  'Resolução rápida',
  'Conhecimento do produto',
  'Tom profissional',
  'Identificação de oportunidade',
  'Gestão de objeções eficaz'
];

const whatWentWrongOptions = [
  'Tempo de resposta lento',
  'Falta de follow-up',
  'Interrupção do cliente',
  'Informação incompleta',
  'Tom inadequado',
  'Oportunidade perdida'
];

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], min: number, max: number): T[] {
  const count = randomInt(min, max);
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generatePhoneNumber(): string {
  const prefixes = ['91', '92', '93', '96'];
  const prefix = randomElement(prefixes);
  const number = randomInt(1000000, 9999999);
  return `+351 ${prefix}${number}`;
}

function generateRandomDate(daysBack: number): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - randomInt(0, daysBack) * 24 * 60 * 60 * 1000);
  // Add random hours
  pastDate.setHours(randomInt(8, 19), randomInt(0, 59), randomInt(0, 59));
  return pastDate;
}

function generateSummary(): string {
  const template = randomElement(summaryTemplates);
  const reason = randomElement(contactReasons);
  const resolution = randomElement(resolutions);
  return template.replace('{reason}', reason.toLowerCase()).replace('{resolution}', resolution);
}

function generateScore(): number {
  // Generate scores with realistic distribution (mostly 5-9)
  const r = Math.random();
  if (r < 0.05) return randomInt(1, 4); // 5% bad scores
  if (r < 0.2) return randomInt(5, 6);  // 15% average
  if (r < 0.7) return randomInt(7, 8);  // 50% good
  return randomInt(9, 10);              // 30% excellent
}

async function seedAgents(): Promise<number[]> {
  console.log(`Creating ${NUM_AGENTS} test agents...`);

  const agentIds: number[] = [];
  const passwordHash = await bcrypt.hash('teste123', 10);

  for (let i = 0; i < NUM_AGENTS; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}`;

    const { data, error } = await supabase
      .from('users')
      .insert({
        company_id: COMPANY_ID,
        username: username,
        password_hash: passwordHash,
        role: 'agent',
        language_preference: 'pt',
        theme_preference: 'light'
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Error creating agent ${username}:`, error.message);
      continue;
    }

    agentIds.push(data.id);
    console.log(`  Created agent: ${username} (ID: ${data.id})`);
  }

  console.log(`Created ${agentIds.length} agents successfully.\n`);
  return agentIds;
}

async function seedCalls(agentIds: number[]): Promise<void> {
  console.log(`Creating ${NUM_CALLS} test calls over ${DAYS_RANGE} days...`);

  let created = 0;
  let failed = 0;

  for (let i = 0; i < NUM_CALLS; i++) {
    const agentId = randomElement(agentIds);
    const callDate = generateRandomDate(DAYS_RANGE);
    const score = generateScore();
    const direction = randomElement(['inbound', 'outbound']);
    const hasRiskWords = Math.random() < 0.15; // 15% chance of risk words
    const hasNextStep = Math.random() < 0.7; // 70% have next step

    const callData = {
      company_id: COMPANY_ID,
      agent_id: agentId,
      phone_number: generatePhoneNumber(),
      direction: direction,
      duration_seconds: randomInt(30, 1800), // 30 seconds to 30 minutes
      audio_file_path: `/audios/call_${Date.now()}_${i}.mp3`,
      transcription: `[Transcrição simulada da chamada ${i + 1}]`,
      transcription_timestamps: JSON.stringify([
        { start: 0, end: 5, text: 'Olá, bom dia!', speaker: 'agent' },
        { start: 5, end: 12, text: 'Bom dia, como posso ajudar?', speaker: 'client' }
      ]),
      summary: generateSummary(),
      next_step_recommendation: hasNextStep ? randomElement(nextSteps.filter(n => n !== null)) : null,
      final_score: score,
      score_justification: `Avaliação baseada nos critérios definidos. Score: ${score}/10`,
      what_went_well: JSON.stringify(randomElements(whatWentWellOptions, 1, 3).map((text, idx) => ({
        timestamp: idx * 30,
        text
      }))),
      what_went_wrong: score < 7 ? JSON.stringify(randomElements(whatWentWrongOptions, 1, 2).map((text, idx) => ({
        timestamp: idx * 45,
        text
      }))) : null,
      risk_words_detected: hasRiskWords ? JSON.stringify(randomElements(riskWords, 1, 3)) : null,
      call_date: callDate.toISOString(),
      expires_at: new Date(callDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days from call
    };

    const { error } = await supabase.from('calls').insert(callData);

    if (error) {
      failed++;
      if (failed <= 5) {
        console.error(`Error creating call ${i + 1}:`, error.message);
      }
    } else {
      created++;
      if (created % 100 === 0) {
        console.log(`  Progress: ${created}/${NUM_CALLS} calls created...`);
      }
    }
  }

  console.log(`\nCreated ${created} calls successfully.`);
  if (failed > 0) {
    console.log(`Failed to create ${failed} calls.`);
  }
}

async function seedAlerts(agentIds: number[]): Promise<void> {
  console.log('\nCreating sample alerts...');

  // Get some recent calls to create alerts for
  const { data: calls, error } = await supabase
    .from('calls')
    .select('id, agent_id, final_score, risk_words_detected')
    .order('call_date', { ascending: false })
    .limit(100);

  if (error || !calls) {
    console.error('Error fetching calls for alerts:', error?.message);
    return;
  }

  let alertCount = 0;

  for (const call of calls) {
    // Low score alert
    if (call.final_score && call.final_score < 5) {
      await supabase.from('alerts').insert({
        company_id: COMPANY_ID,
        call_id: call.id,
        agent_id: call.agent_id,
        type: 'low_score',
        message: `Chamada com pontuação baixa: ${call.final_score}/10`,
        is_read: Math.random() < 0.5
      });
      alertCount++;
    }

    // Risk words alert
    if (call.risk_words_detected) {
      await supabase.from('alerts').insert({
        company_id: COMPANY_ID,
        call_id: call.id,
        agent_id: call.agent_id,
        type: 'risk_words',
        message: 'Palavras de risco detetadas na chamada',
        is_read: Math.random() < 0.5
      });
      alertCount++;
    }
  }

  console.log(`Created ${alertCount} alerts.`);
}

async function main(): Promise<void> {
  console.log('===========================================');
  console.log('  CALLIFY - Test Data Seeder');
  console.log('===========================================\n');

  try {
    // Create agents
    const agentIds = await seedAgents();

    if (agentIds.length === 0) {
      console.error('No agents created. Exiting.');
      return;
    }

    // Create calls
    await seedCalls(agentIds);

    // Create alerts
    await seedAlerts(agentIds);

    console.log('\n===========================================');
    console.log('  Seeding completed successfully!');
    console.log('===========================================\n');

  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  }
}

main();
