import { supabase } from '../db/supabase';

// Script to generate alerts based on existing calls
async function generateAlerts() {
  console.log('Starting to generate alerts from existing calls...');

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

  // Get alert settings for the company (or use defaults)
  const { data: alertSettings } = await supabase
    .from('alert_settings')
    .select('*')
    .eq('company_id', company.id)
    .single();

  // Get thresholds from settings (convert minutes to seconds for duration)
  const lowScoreThreshold = alertSettings?.low_score_threshold || 5.0;
  const longDurationMinutes = alertSettings?.long_duration_threshold_minutes || 30;
  const longDurationThreshold = longDurationMinutes * 60; // Convert to seconds

  // Get enabled flags
  const lowScoreEnabled = alertSettings?.low_score_enabled ?? true;
  const riskWordsEnabled = alertSettings?.risk_words_enabled ?? true;
  const longDurationEnabled = alertSettings?.long_duration_enabled ?? true;
  const noNextStepEnabled = alertSettings?.no_next_step_enabled ?? true;

  console.log(`Settings: lowScore=${lowScoreThreshold}, longDuration=${longDurationMinutes}min (${longDurationThreshold}s)`);

  // Get all calls from the company
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('id, agent_id, final_score, duration_seconds, next_step_recommendation, risk_words_detected, phone_number')
    .eq('company_id', company.id);

  if (callsError) {
    console.error('Error fetching calls:', callsError);
    process.exit(1);
  }

  if (!calls || calls.length === 0) {
    console.log('No calls found to analyze');
    process.exit(0);
  }

  console.log(`Found ${calls.length} calls to analyze`);

  // Delete existing alerts for this company to avoid duplicates
  const { error: deleteError } = await supabase
    .from('alerts')
    .delete()
    .eq('company_id', company.id);

  if (deleteError) {
    console.error('Error deleting existing alerts:', deleteError);
  }

  const alertsToInsert = [];

  for (const call of calls) {
    // Check for low score (only if enabled)
    if (lowScoreEnabled && call.final_score !== null && call.final_score < lowScoreThreshold) {
      alertsToInsert.push({
        company_id: company.id,
        call_id: call.id,
        agent_id: call.agent_id,
        type: 'low_score',
        message: `Chamada com pontuação baixa: ${call.final_score}/10. Necessita revisão.`,
        is_read: false
      });
    }

    // Check for risk words (only if enabled)
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
          agent_id: call.agent_id,
          type: 'risk_words',
          message: `Palavras de risco detetadas: ${riskWords.join(', ')}`,
          is_read: false
        });
      }
    }

    // Check for long duration (only if enabled)
    if (longDurationEnabled && call.duration_seconds && call.duration_seconds > longDurationThreshold) {
      const minutes = Math.floor(call.duration_seconds / 60);
      alertsToInsert.push({
        company_id: company.id,
        call_id: call.id,
        agent_id: call.agent_id,
        type: 'long_duration',
        message: `Chamada com duração excessiva: ${minutes} minutos.`,
        is_read: false
      });
    }

    // Check for no next step (only if enabled)
    if (noNextStepEnabled && (!call.next_step_recommendation || call.next_step_recommendation.trim() === '')) {
      alertsToInsert.push({
        company_id: company.id,
        call_id: call.id,
        agent_id: call.agent_id,
        type: 'no_next_step',
        message: 'Próximo passo não definido na chamada.',
        is_read: false
      });
    }
  }

  if (alertsToInsert.length === 0) {
    console.log('No alerts to create based on current criteria');
    process.exit(0);
  }

  // Insert alerts
  const { error: insertError } = await supabase.from('alerts').insert(alertsToInsert);

  if (insertError) {
    console.error('Error inserting alerts:', insertError);
    process.exit(1);
  }

  console.log(`\nSuccessfully created ${alertsToInsert.length} alerts!`);

  // Show summary
  const summary: Record<string, number> = {};
  alertsToInsert.forEach(alert => {
    summary[alert.type] = (summary[alert.type] || 0) + 1;
  });

  console.log('\nAlerts by type:');
  Object.entries(summary).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  process.exit(0);
}

generateAlerts().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
