import { supabase } from '../db/supabase';

async function generateAlertsForMaster() {
  console.log('=== Gerando Alertas para Master em Relacionamentos ===\n');

  // Buscar a empresa
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%master%relacionamentos%')
    .single();

  if (companyError || !company) {
    console.error('Empresa não encontrada!');
    process.exit(1);
  }

  console.log(`Empresa: ${company.name} (ID: ${company.id})\n`);

  // Buscar configurações de alertas
  const { data: alertSettings } = await supabase
    .from('alert_settings')
    .select('*')
    .eq('company_id', company.id)
    .single();

  const lowScoreThreshold = alertSettings?.low_score_threshold || 5.0;
  const longDurationMinutes = alertSettings?.long_duration_threshold_minutes || 30;
  const longDurationThreshold = longDurationMinutes * 60;

  const lowScoreEnabled = alertSettings?.low_score_enabled ?? true;
  const riskWordsEnabled = alertSettings?.risk_words_enabled ?? true;
  const longDurationEnabled = alertSettings?.long_duration_enabled ?? true;
  const noNextStepEnabled = alertSettings?.no_next_step_enabled ?? true;

  console.log('Configurações:');
  console.log(`  - Low score threshold: ${lowScoreThreshold}`);
  console.log(`  - Long duration: ${longDurationMinutes} min`);
  console.log(`  - Low score enabled: ${lowScoreEnabled}`);
  console.log(`  - Risk words enabled: ${riskWordsEnabled}`);
  console.log(`  - Long duration enabled: ${longDurationEnabled}`);
  console.log(`  - No next step enabled: ${noNextStepEnabled}\n`);

  // Buscar todas as chamadas
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('id, agent_id, final_score, duration_seconds, next_step_recommendation, risk_words_detected')
    .eq('company_id', company.id);

  if (callsError) {
    console.error('Erro ao buscar chamadas:', callsError);
    process.exit(1);
  }

  if (!calls || calls.length === 0) {
    console.log('Nenhuma chamada encontrada.');
    process.exit(0);
  }

  console.log(`Encontradas ${calls.length} chamadas para analisar.\n`);

  // Apagar alertas existentes para esta empresa
  const { error: deleteError } = await supabase
    .from('alerts')
    .delete()
    .eq('company_id', company.id);

  if (deleteError) {
    console.error('Erro ao apagar alertas existentes:', deleteError);
  } else {
    console.log('Alertas existentes apagados.\n');
  }

  const alertsToInsert: any[] = [];

  // Buscar um agente da empresa para usar como fallback
  const { data: fallbackAgent } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', company.id)
    .eq('role', 'agent')
    .limit(1)
    .single();

  const fallbackAgentId = fallbackAgent?.id || null;
  console.log(`Agente fallback: ${fallbackAgentId || 'nenhum'}\n`);

  for (const call of calls) {
    const agentId = call.agent_id || fallbackAgentId;

    // Skip if no agent available
    if (!agentId) {
      console.log(`  Chamada ${call.id}: sem agente, ignorada`);
      continue;
    }

    // Low score
    if (lowScoreEnabled && call.final_score !== null && call.final_score < lowScoreThreshold) {
      alertsToInsert.push({
        company_id: company.id,
        call_id: call.id,
        agent_id: agentId,
        type: 'low_score',
        message: `Chamada com pontuação baixa: ${call.final_score.toFixed(1)}/10. Necessita revisão.`,
        is_read: false
      });
    }

    // Risk words
    if (riskWordsEnabled) {
      let riskWords: string[] = [];
      if (call.risk_words_detected) {
        try {
          riskWords = typeof call.risk_words_detected === 'string'
            ? JSON.parse(call.risk_words_detected)
            : call.risk_words_detected;
        } catch {
          riskWords = [];
        }
      }

      if (riskWords.length > 0) {
        alertsToInsert.push({
          company_id: company.id,
          call_id: call.id,
          agent_id: agentId,
          type: 'risk_words',
          message: `Palavras de risco detetadas: ${riskWords.slice(0, 5).join(', ')}`,
          is_read: false
        });
      }
    }

    // Long duration
    if (longDurationEnabled && call.duration_seconds && call.duration_seconds > longDurationThreshold) {
      const minutes = Math.floor(call.duration_seconds / 60);
      alertsToInsert.push({
        company_id: company.id,
        call_id: call.id,
        agent_id: agentId,
        type: 'long_duration',
        message: `Chamada com duração excessiva: ${minutes} minutos.`,
        is_read: false
      });
    }

    // No next step
    if (noNextStepEnabled && (!call.next_step_recommendation || call.next_step_recommendation.trim() === '')) {
      alertsToInsert.push({
        company_id: company.id,
        call_id: call.id,
        agent_id: agentId,
        type: 'no_next_step',
        message: 'Próximo passo não definido na chamada.',
        is_read: false
      });
    }
  }

  if (alertsToInsert.length === 0) {
    console.log('Nenhum alerta a criar com os critérios atuais.');
    process.exit(0);
  }

  // Inserir alertas
  const { error: insertError } = await supabase.from('alerts').insert(alertsToInsert);

  if (insertError) {
    console.error('Erro ao inserir alertas:', insertError);
    process.exit(1);
  }

  // Resumo
  const summary: Record<string, number> = {};
  alertsToInsert.forEach(alert => {
    summary[alert.type] = (summary[alert.type] || 0) + 1;
  });

  console.log(`✅ Criados ${alertsToInsert.length} alertas!\n`);
  console.log('Por tipo:');
  Object.entries(summary).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });

  process.exit(0);
}

generateAlertsForMaster().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
