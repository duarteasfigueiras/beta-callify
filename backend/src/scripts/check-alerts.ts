import { supabase } from '../db/supabase';

async function checkAlerts() {
  console.log('=== Verificação de Alertas - Master em Relacionamentos ===\n');

  // Buscar a empresa "Master em Relacionamentos"
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%master%relacionamentos%')
    .single();

  if (companyError || !company) {
    console.error('Empresa "Master em Relacionamentos" não encontrada!');
    // Listar empresas disponíveis
    const { data: companies } = await supabase.from('companies').select('id, name');
    console.log('\nEmpresas disponíveis:');
    companies?.forEach(c => console.log(`  - ${c.id}: ${c.name}`));
    process.exit(1);
  }

  console.log(`Empresa encontrada: ${company.name} (ID: ${company.id})\n`);

  // 1. Verificar quantos alertas existem para esta empresa
  const { count: alertCount, error: alertError } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id);

  if (alertError) {
    console.error('Erro ao verificar alertas:', alertError);
  } else {
    console.log(`Total de alertas na base de dados: ${alertCount || 0}`);
  }

  // 2. Verificar quantas chamadas existem para esta empresa
  const { data: calls, count: callCount, error: callError } = await supabase
    .from('calls')
    .select('id, final_score, duration_seconds, next_step_recommendation, risk_words_detected', { count: 'exact' })
    .eq('company_id', company.id);

  if (callError) {
    console.error('Erro ao verificar chamadas:', callError);
  } else {
    console.log(`Total de chamadas na base de dados: ${callCount || 0}`);
  }

  // 3. Verificar alert_settings para esta empresa
  const { data: settings, error: settingsError } = await supabase
    .from('alert_settings')
    .select('*')
    .eq('company_id', company.id);

  if (settingsError) {
    console.error('Erro ao verificar configurações:', settingsError);
  } else {
    console.log(`\nConfigurações de alertas encontradas: ${settings ? settings.length : 0}`);
    if (settings && settings.length > 0) {
      settings.forEach(s => {
        console.log(`  Company ${s.company_id}:`);
        console.log(`    - Low score threshold: ${s.low_score_threshold}`);
        console.log(`    - Long duration threshold: ${s.long_duration_threshold_minutes} min`);
        console.log(`    - Low score enabled: ${s.low_score_enabled}`);
        console.log(`    - Risk words enabled: ${s.risk_words_enabled}`);
        console.log(`    - Long duration enabled: ${s.long_duration_enabled}`);
        console.log(`    - No next step enabled: ${s.no_next_step_enabled}`);
      });
    }
  }

  // 4. Analisar chamadas que deveriam gerar alertas
  if (calls && calls.length > 0) {
    const lowScoreThreshold = 5.0;
    const longDurationThreshold = 30 * 60; // 30 minutos em segundos

    let lowScoreCalls = 0;
    let longDurationCalls = 0;
    let noNextStepCalls = 0;
    let riskWordsCalls = 0;

    for (const call of calls) {
      if (call.final_score !== null && call.final_score < lowScoreThreshold) {
        lowScoreCalls++;
      }
      if (call.duration_seconds && call.duration_seconds > longDurationThreshold) {
        longDurationCalls++;
      }
      if (!call.next_step_recommendation || call.next_step_recommendation.trim() === '') {
        noNextStepCalls++;
      }
      if (call.risk_words_detected) {
        let riskWords: string[] = [];
        try {
          riskWords = typeof call.risk_words_detected === 'string'
            ? JSON.parse(call.risk_words_detected)
            : call.risk_words_detected;
        } catch {
          riskWords = [];
        }
        if (riskWords.length > 0) {
          riskWordsCalls++;
        }
      }
    }

    console.log(`\n=== Chamadas que deveriam gerar alertas (thresholds padrão) ===`);
    console.log(`  - Pontuação baixa (<5.0): ${lowScoreCalls}`);
    console.log(`  - Duração longa (>30min): ${longDurationCalls}`);
    console.log(`  - Sem próximo passo: ${noNextStepCalls}`);
    console.log(`  - Com palavras de risco: ${riskWordsCalls}`);
    console.log(`\nTotal potencial de alertas: ${lowScoreCalls + longDurationCalls + noNextStepCalls + riskWordsCalls}`);
  }

  // 5. Mostrar alguns alertas existentes (se houver)
  const { data: sampleAlerts } = await supabase
    .from('alerts')
    .select('id, type, message, is_read, created_at')
    .eq('company_id', company.id)
    .limit(5);

  if (sampleAlerts && sampleAlerts.length > 0) {
    console.log('\n=== Amostra de alertas existentes ===');
    sampleAlerts.forEach(alert => {
      console.log(`  [${alert.type}] ${alert.message} (read: ${alert.is_read})`);
    });
  }

  process.exit(0);
}

checkAlerts().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
