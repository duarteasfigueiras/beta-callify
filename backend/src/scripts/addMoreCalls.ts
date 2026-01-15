import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mjtmjkfigrnhlcayoedb.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdG1qa2ZpZ3JuaGxjYXlvZWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjQ1MDQsImV4cCI6MjA4MzMwMDUwNH0.vJf0L-2EccYwdqbS8hW-rQOQp_pZ80n-Yx6OFYnJ_vw';

const supabase = createClient(supabaseUrl, supabaseKey);

const NUM_CALLS = 320;
const DAYS_RANGE = 90;
const COMPANY_ID = 1;

const contactReasons = [
  'Dúvida sobre faturação', 'Pedido de informação', 'Reclamação de serviço',
  'Alteração de dados', 'Cancelamento', 'Novo contrato', 'Problema técnico',
  'Pedido de orçamento', 'Atualização de plano', 'Suporte pós-venda'
];

const riskWords = ['cancelar', 'reclamação', 'insatisfeito', 'problema', 'mau serviço'];

const whatWentWellOptions = [
  'Boa apresentação inicial', 'Escuta ativa demonstrada', 'Empatia com o cliente',
  'Resolução rápida', 'Conhecimento do produto', 'Tom profissional'
];

const whatWentWrongOptions = [
  'Tempo de resposta lento', 'Falta de follow-up', 'Interrupção do cliente'
];

const nextSteps = [
  'Enviar proposta por email', 'Agendar chamada de follow-up',
  'Processar pedido no sistema', 'Escalar para supervisor', null
];

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
  pastDate.setHours(randomInt(8, 19), randomInt(0, 59), randomInt(0, 59));
  return pastDate;
}

function generateScore(): number {
  const r = Math.random();
  if (r < 0.05) return randomInt(1, 4);
  if (r < 0.2) return randomInt(5, 6);
  if (r < 0.7) return randomInt(7, 8);
  return randomInt(9, 10);
}

async function main(): Promise<void> {
  console.log('Adding more calls to reach 1000...\n');

  // Get existing agent IDs
  const { data: agents, error: agentError } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', COMPANY_ID)
    .eq('role', 'agent');

  if (agentError || !agents || agents.length === 0) {
    console.error('Error fetching agents:', agentError?.message);
    return;
  }

  const agentIds = agents.map(a => a.id);
  console.log(`Found ${agentIds.length} agents.\n`);

  let created = 0;

  for (let i = 0; i < NUM_CALLS; i++) {
    const agentId = randomElement(agentIds);
    const callDate = generateRandomDate(DAYS_RANGE);
    const score = generateScore();
    const direction = randomElement(['inbound', 'outbound']);
    const hasRiskWords = Math.random() < 0.15;
    const hasNextStep = Math.random() < 0.7;

    const callData = {
      company_id: COMPANY_ID,
      agent_id: agentId,
      phone_number: generatePhoneNumber(),
      direction: direction,
      duration_seconds: randomInt(30, 1800),
      audio_file_path: `/audios/call_extra_${Date.now()}_${i}.mp3`,
      transcription: `[Transcrição simulada da chamada extra ${i + 1}]`,
      transcription_timestamps: JSON.stringify([
        { start: 0, end: 5, text: 'Olá, bom dia!', speaker: 'agent' },
        { start: 5, end: 12, text: 'Bom dia, como posso ajudar?', speaker: 'client' }
      ]),
      summary: `Cliente contactou para ${randomElement(contactReasons).toLowerCase()}. Situação resolvida.`,
      next_step_recommendation: hasNextStep ? randomElement(nextSteps.filter(n => n !== null)) : null,
      final_score: score,
      score_justification: `Avaliação: ${score}/10`,
      what_went_well: JSON.stringify(randomElements(whatWentWellOptions, 1, 3).map((text, idx) => ({
        timestamp: idx * 30, text
      }))),
      what_went_wrong: score < 7 ? JSON.stringify(randomElements(whatWentWrongOptions, 1, 2).map((text, idx) => ({
        timestamp: idx * 45, text
      }))) : null,
      risk_words_detected: hasRiskWords ? JSON.stringify(randomElements(riskWords, 1, 3)) : null,
      call_date: callDate.toISOString(),
      expires_at: new Date(callDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };

    const { error } = await supabase.from('calls').insert(callData);

    if (!error) {
      created++;
      if (created % 50 === 0) {
        console.log(`Progress: ${created}/${NUM_CALLS} calls created...`);
      }
    }
  }

  console.log(`\nCreated ${created} additional calls.`);

  // Count total calls
  const { count } = await supabase.from('calls').select('*', { count: 'exact', head: true });
  console.log(`Total calls in database: ${count}`);
}

main();
