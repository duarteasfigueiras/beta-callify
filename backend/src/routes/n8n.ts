import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase';

const router = Router();

// Risk words list (system-level)
const RISK_WORDS = [
  'cancelar', 'cancelamento',
  'reclamacao', 'reclamar',
  'advogado', 'processo', 'tribunal',
  'insatisfeito', 'insatisfacao',
  'devolver', 'devolucao',
  'reembolso',
  'nunca mais', 'pessimo'
];

// Alert thresholds
const LOW_SCORE_THRESHOLD = parseFloat(process.env.LOW_SCORE_THRESHOLD || '5.0');
const LONG_CALL_THRESHOLD_SECONDS = parseInt(process.env.LONG_CALL_THRESHOLD_SECONDS || '1800');

/**
 * Step 1: Create a new call record
 */
router.post('/calls', async (req: Request, res: Response) => {
  try {
    console.log('[n8n] Received new call:', JSON.stringify(req.body, null, 2));

    const {
      phoneNumber,
      direction = 'inbound',
      durationSeconds = 0,
      audioUrl,
      agentId,
      companyId,
      callDate
    } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'phoneNumber is required',
        example: { phoneNumber: '+351912345678', direction: 'inbound', durationSeconds: 180 }
      });
    }

    // Get company
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: company } = await supabase.from('companies').select('id').limit(1).single();
      if (!company) {
        return res.status(500).json({ error: 'No company configured' });
      }
      targetCompanyId = company.id;
    }

    // Get agent
    let targetAgentId = agentId;
    if (!targetAgentId) {
      const { data: agent } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', targetCompanyId)
        .eq('role', 'agent')
        .limit(1)
        .single();

      if (agent) {
        targetAgentId = agent.id;
      } else {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('company_id', targetCompanyId)
          .limit(1)
          .single();

        if (!user) {
          return res.status(500).json({ error: 'No agent found' });
        }
        targetAgentId = user.id;
      }
    }

    // Create call record
    const { data: newCall, error } = await supabase
      .from('calls')
      .insert({
        company_id: targetCompanyId,
        agent_id: targetAgentId,
        phone_number: phoneNumber,
        direction: direction === 'outbound' ? 'outbound' : 'inbound',
        duration_seconds: durationSeconds,
        audio_file_path: audioUrl || null,
        call_date: callDate || new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    const callId = newCall.id;
    console.log('[n8n] Created call record:', callId);

    res.status(201).json({
      success: true,
      callId,
      status: 'pending_transcription',
      audioUrl: audioUrl || null,
      nextStep: `/api/n8n/calls/${callId}/transcription`,
      endpoints: {
        transcription: `POST /api/n8n/calls/${callId}/transcription`,
        analysis: `POST /api/n8n/calls/${callId}/analysis`,
        status: `GET /api/n8n/calls/${callId}/status`
      }
    });

  } catch (error) {
    console.error('[n8n] Error creating call:', error);
    res.status(500).json({ error: 'Failed to create call record' });
  }
});

/**
 * Step 2: Submit transcription for a call
 */
router.post('/calls/:id/transcription', async (req: Request, res: Response) => {
  try {
    const callId = parseInt(req.params.id);
    console.log('[n8n] Received transcription for call:', callId);

    const { transcription, timestamps } = req.body;

    if (!transcription) {
      return res.status(400).json({
        error: 'transcription is required',
        example: {
          transcription: '[Agent]: Hello...\n[Client]: Hi...',
          timestamps: [{ speaker: 'Agent', text: 'Hello', timestamp: '00:00' }]
        }
      });
    }

    // Verify call exists
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, company_id')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Update call with transcription
    await supabase
      .from('calls')
      .update({
        transcription,
        transcription_timestamps: JSON.stringify(timestamps || [])
      })
      .eq('id', callId);

    // Get criteria for analysis
    const { data: criteria } = await supabase
      .from('criteria')
      .select('id, name, description, weight')
      .eq('company_id', call.company_id)
      .eq('is_active', true);

    console.log('[n8n] Transcription saved, criteria count:', criteria?.length || 0);

    res.json({
      success: true,
      callId,
      status: 'pending_analysis',
      transcriptionLength: transcription.length,
      nextStep: `/api/n8n/calls/${callId}/analysis`,
      criteria: (criteria || []).map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        weight: c.weight
      })),
      analysisPrompt: generateAnalysisPrompt(transcription, criteria || [])
    });

  } catch (error) {
    console.error('[n8n] Error saving transcription:', error);
    res.status(500).json({ error: 'Failed to save transcription' });
  }
});

/**
 * Step 3: Submit AI analysis for a call
 */
router.post('/calls/:id/analysis', async (req: Request, res: Response) => {
  try {
    const callId = parseInt(req.params.id);
    console.log('[n8n] Received analysis for call:', callId);

    const {
      summary,
      nextStepRecommendation,
      finalScore,
      scoreJustification,
      whatWentWell = [],
      whatWentWrong = [],
      criteriaResults = []
    } = req.body;

    if (finalScore === undefined || !summary) {
      return res.status(400).json({
        error: 'summary and finalScore are required',
        example: {
          summary: 'Customer inquiry about pricing...',
          finalScore: 7.5,
          nextStepRecommendation: 'Send follow-up email',
          criteriaResults: [{ criterionId: 1, passed: true, justification: 'Good' }]
        }
      });
    }

    // Verify call exists and get details
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, company_id, agent_id, duration_seconds, transcription')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Detect risk words from transcription
    const transcription = call.transcription || '';
    const textLower = transcription.toLowerCase();
    const detectedRiskWords = RISK_WORDS.filter(word => textLower.includes(word.toLowerCase()));

    // Update call with analysis
    await supabase
      .from('calls')
      .update({
        summary,
        next_step_recommendation: nextStepRecommendation || '',
        final_score: finalScore,
        score_justification: scoreJustification || '',
        what_went_well: JSON.stringify(whatWentWell),
        what_went_wrong: JSON.stringify(whatWentWrong),
        risk_words_detected: JSON.stringify(detectedRiskWords)
      })
      .eq('id', callId);

    // Save criteria results
    for (const result of criteriaResults) {
      if (result.criterionId) {
        // Delete existing result if any
        await supabase
          .from('call_criteria_results')
          .delete()
          .eq('call_id', callId)
          .eq('criterion_id', result.criterionId);

        // Insert new result
        await supabase.from('call_criteria_results').insert({
          call_id: callId,
          criterion_id: result.criterionId,
          passed: result.passed || false,
          justification: result.justification || '',
          timestamp_reference: result.timestampReference || null
        });
      }
    }

    // Generate alerts
    const alerts = await generateAlerts(
      callId,
      call.company_id,
      call.agent_id,
      finalScore,
      call.duration_seconds,
      detectedRiskWords,
      nextStepRecommendation || ''
    );

    console.log('[n8n] Analysis saved, alerts generated:', alerts.length);

    res.json({
      success: true,
      callId,
      status: 'completed',
      finalScore,
      riskWordsDetected: detectedRiskWords,
      alertsGenerated: alerts,
      criteriaEvaluated: criteriaResults.length
    });

  } catch (error) {
    console.error('[n8n] Error saving analysis:', error);
    res.status(500).json({ error: 'Failed to save analysis' });
  }
});

/**
 * Get call status and data
 */
router.get('/calls/:id/status', async (req: Request, res: Response) => {
  try {
    const callId = parseInt(req.params.id);

    const { data: call, error } = await supabase
      .from('calls')
      .select('id, phone_number, direction, duration_seconds, transcription, summary, final_score, next_step_recommendation, risk_words_detected, created_at')
      .eq('id', callId)
      .single();

    if (error || !call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Determine status
    let status = 'pending_transcription';
    if (call.transcription) {
      status = 'pending_analysis';
    }
    if (call.final_score !== null) {
      status = 'completed';
    }

    res.json({
      callId: call.id,
      status,
      phoneNumber: call.phone_number,
      direction: call.direction,
      durationSeconds: call.duration_seconds,
      hasTranscription: !!call.transcription,
      hasAnalysis: call.final_score !== null,
      finalScore: call.final_score,
      summary: call.summary,
      createdAt: call.created_at
    });

  } catch (error) {
    console.error('[n8n] Error getting status:', error);
    res.status(500).json({ error: 'Failed to get call status' });
  }
});

/**
 * Complete call processing in one request
 */
router.post('/calls/complete', async (req: Request, res: Response) => {
  try {
    console.log('[n8n] Received complete call processing request');

    const {
      phoneNumber,
      direction = 'inbound',
      durationSeconds = 0,
      audioUrl,
      agentId,
      companyId,
      callDate,
      transcription,
      timestamps,
      summary,
      nextStepRecommendation,
      finalScore,
      scoreJustification,
      whatWentWell = [],
      whatWentWrong = [],
      criteriaResults = []
    } = req.body;

    if (!phoneNumber || !transcription || finalScore === undefined) {
      return res.status(400).json({
        error: 'phoneNumber, transcription, and finalScore are required',
        example: {
          phoneNumber: '+351912345678',
          transcription: '[Agent]: Hello...',
          finalScore: 7.5,
          summary: 'Customer inquiry...'
        }
      });
    }

    // Get company
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: company } = await supabase.from('companies').select('id').limit(1).single();
      if (!company) {
        return res.status(500).json({ error: 'No company configured' });
      }
      targetCompanyId = company.id;
    }

    // Get agent
    let targetAgentId = agentId;
    if (!targetAgentId) {
      const { data: agent } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', targetCompanyId)
        .limit(1)
        .single();

      if (!agent) {
        return res.status(500).json({ error: 'No agent found' });
      }
      targetAgentId = agent.id;
    }

    // Detect risk words
    const textLower = transcription.toLowerCase();
    const detectedRiskWords = RISK_WORDS.filter(word => textLower.includes(word.toLowerCase()));

    // Create complete call record
    const { data: newCall, error } = await supabase
      .from('calls')
      .insert({
        company_id: targetCompanyId,
        agent_id: targetAgentId,
        phone_number: phoneNumber,
        direction: direction === 'outbound' ? 'outbound' : 'inbound',
        duration_seconds: durationSeconds,
        audio_file_path: audioUrl || null,
        call_date: callDate || new Date().toISOString(),
        transcription,
        transcription_timestamps: JSON.stringify(timestamps || []),
        summary: summary || '',
        next_step_recommendation: nextStepRecommendation || '',
        final_score: finalScore,
        score_justification: scoreJustification || '',
        what_went_well: JSON.stringify(whatWentWell),
        what_went_wrong: JSON.stringify(whatWentWrong),
        risk_words_detected: JSON.stringify(detectedRiskWords)
      })
      .select('id')
      .single();

    if (error) throw error;

    const callId = newCall.id;

    // Save criteria results
    for (const cr of criteriaResults) {
      if (cr.criterionId) {
        await supabase.from('call_criteria_results').insert({
          call_id: callId,
          criterion_id: cr.criterionId,
          passed: cr.passed || false,
          justification: cr.justification || '',
          timestamp_reference: cr.timestampReference || null
        });
      }
    }

    // Generate alerts
    const alerts = await generateAlerts(
      callId,
      targetCompanyId,
      targetAgentId,
      finalScore,
      durationSeconds,
      detectedRiskWords,
      nextStepRecommendation || ''
    );

    console.log('[n8n] Complete call processed:', callId);

    res.status(201).json({
      success: true,
      callId,
      status: 'completed',
      finalScore,
      riskWordsDetected: detectedRiskWords,
      alertsGenerated: alerts,
      criteriaEvaluated: criteriaResults.length
    });

  } catch (error) {
    console.error('[n8n] Error processing complete call:', error);
    res.status(500).json({ error: 'Failed to process call' });
  }
});

/**
 * Get evaluation criteria
 */
router.get('/criteria', async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;

    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: company } = await supabase.from('companies').select('id').limit(1).single();
      targetCompanyId = company?.id;
    }

    let criteria: any[] = [];
    if (targetCompanyId) {
      const { data } = await supabase
        .from('criteria')
        .select('id, name, description, weight')
        .eq('company_id', targetCompanyId)
        .eq('is_active', true);

      criteria = data || [];
    }

    res.json({
      criteria,
      analysisInstructions: `
When analyzing a call, evaluate each criterion and provide:
- criterionId: The ID of the criterion
- passed: true/false
- justification: Brief explanation
- timestampReference: "MM:SS" format if applicable
      `.trim()
    });

  } catch (error) {
    console.error('[n8n] Error getting criteria:', error);
    res.status(500).json({ error: 'Failed to get criteria' });
  }
});

/**
 * Receive AI Agent output and create call record
 * This endpoint accepts the format from the AI agent (Portuguese fields)
 */
router.post('/agent-output', async (req: Request, res: Response) => {
  try {
    console.log('[n8n] Received AI agent output:', JSON.stringify(req.body, null, 2));

    const {
      // Call metadata (optional)
      phoneNumber,
      direction = 'inbound',
      durationSeconds = 0,
      audioUrl,
      agentId,
      companyId,
      callDate,
      transcription,
      // AI Agent output format
      agent_output,
      // Or direct fields
      score,
      resumo,
      pontos_fortes,
      melhorias,
      acoes_recomendadas,
      observacoes
    } = req.body;

    // Parse agent_output if it's a string
    let aiOutput = agent_output;
    if (typeof agent_output === 'string') {
      try {
        aiOutput = JSON.parse(agent_output);
      } catch {
        aiOutput = {};
      }
    }

    // Use direct fields or from agent_output object
    const finalScore = score ?? aiOutput?.score;
    const summary = resumo ?? aiOutput?.resumo ?? '';
    const strengths = pontos_fortes ?? aiOutput?.pontos_fortes ?? [];
    const improvements = melhorias ?? aiOutput?.melhorias ?? [];
    const recommendations = acoes_recomendadas ?? aiOutput?.acoes_recomendadas ?? [];
    const notes = observacoes ?? aiOutput?.observacoes ?? '';

    if (finalScore === undefined) {
      return res.status(400).json({
        error: 'score is required',
        example: {
          score: 7.5,
          resumo: 'Resumo da chamada...',
          pontos_fortes: ['Ponto 1', 'Ponto 2'],
          melhorias: ['Melhoria 1'],
          acoes_recomendadas: ['Ação 1'],
          observacoes: 'Notas adicionais'
        }
      });
    }

    // Get company
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: company } = await supabase.from('companies').select('id').limit(1).single();
      if (!company) {
        return res.status(500).json({ error: 'No company configured' });
      }
      targetCompanyId = company.id;
    }

    // Get agent
    let targetAgentId = agentId;
    if (!targetAgentId) {
      const { data: agent } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', targetCompanyId)
        .limit(1)
        .single();

      if (!agent) {
        return res.status(500).json({ error: 'No agent found' });
      }
      targetAgentId = agent.id;
    }

    // Detect risk words from transcription or summary
    const textToCheck = (transcription || summary || '').toLowerCase();
    const detectedRiskWords = RISK_WORDS.filter(word => textToCheck.includes(word.toLowerCase()));

    // Create call record with AI analysis
    const { data: newCall, error } = await supabase
      .from('calls')
      .insert({
        company_id: targetCompanyId,
        agent_id: targetAgentId,
        phone_number: phoneNumber || 'AI Analysis',
        direction: direction === 'outbound' ? 'outbound' : 'inbound',
        duration_seconds: durationSeconds,
        audio_file_path: audioUrl || null,
        call_date: callDate || new Date().toISOString(),
        transcription: transcription || null,
        summary: summary,
        next_step_recommendation: recommendations.join('\n- '),
        final_score: finalScore,
        score_justification: notes,
        what_went_well: JSON.stringify(strengths),
        what_went_wrong: JSON.stringify(improvements),
        risk_words_detected: JSON.stringify(detectedRiskWords)
      })
      .select('id')
      .single();

    if (error) {
      console.error('[n8n] Error creating call:', error);
      throw error;
    }

    const callId = newCall.id;

    // Generate alerts
    const alerts = await generateAlerts(
      callId,
      targetCompanyId,
      targetAgentId,
      finalScore,
      durationSeconds,
      detectedRiskWords,
      recommendations.join(', ')
    );

    console.log('[n8n] AI agent output processed, call created:', callId);

    res.status(201).json({
      success: true,
      callId,
      status: 'completed',
      finalScore,
      summary,
      riskWordsDetected: detectedRiskWords,
      alertsGenerated: alerts.length,
      viewUrl: `/calls/${callId}`
    });

  } catch (error) {
    console.error('[n8n] Error processing AI agent output:', error);
    res.status(500).json({ error: 'Failed to process AI agent output' });
  }
});

/**
 * Health check and documentation
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    description: 'n8n Integration API for Callify',
    endpoints: {
      'POST /api/n8n/calls': 'Create a new call record (Step 1)',
      'POST /api/n8n/calls/:id/transcription': 'Submit transcription (Step 2)',
      'POST /api/n8n/calls/:id/analysis': 'Submit AI analysis (Step 3)',
      'POST /api/n8n/calls/complete': 'Process complete call in one request',
      'POST /api/n8n/agent-output': 'Receive AI agent output (Portuguese format)',
      'GET /api/n8n/calls/:id/status': 'Get call processing status',
      'GET /api/n8n/criteria': 'Get evaluation criteria for analysis',
      'GET /api/n8n/health': 'This endpoint'
    }
  });
});

/**
 * Generate a prompt for LLM analysis
 */
function generateAnalysisPrompt(transcription: string, criteria: any[]): string {
  const criteriaList = criteria.map(c =>
    `- ${c.name} (ID: ${c.id}, Weight: ${c.weight}): ${c.description}`
  ).join('\n');

  return `
Analyze the following call transcription and evaluate it based on the criteria below.

TRANSCRIPTION:
${transcription}

EVALUATION CRITERIA:
${criteriaList}

Please provide your analysis in the following JSON format:
{
  "summary": "Brief summary of the call (2-3 sentences)",
  "nextStepRecommendation": "Recommended next action",
  "finalScore": 7.5,
  "scoreJustification": "Explanation for the score",
  "whatWentWell": [
    { "text": "Description of positive aspect", "timestamp": "MM:SS" }
  ],
  "whatWentWrong": [
    { "text": "Description of issue", "timestamp": "MM:SS" }
  ],
  "criteriaResults": [
    { "criterionId": 1, "passed": true, "justification": "..." },
    { "criterionId": 2, "passed": false, "justification": "...", "timestampReference": "01:30" }
  ]
}
  `.trim();
}

/**
 * Generate alerts based on analysis
 */
async function generateAlerts(
  callId: number,
  companyId: number,
  agentId: number,
  score: number,
  durationSeconds: number,
  riskWords: string[],
  nextStep: string
): Promise<any[]> {
  const alerts: any[] = [];

  // Low score alert
  if (score < LOW_SCORE_THRESHOLD) {
    const { data } = await supabase
      .from('alerts')
      .insert({
        company_id: companyId,
        call_id: callId,
        agent_id: agentId,
        type: 'low_score',
        message: `Chamada com pontuação baixa: ${score}. Requer atenção.`
      })
      .select('id')
      .single();

    alerts.push({ id: data?.id, type: 'low_score', score });
  }

  // Risk words alert
  if (riskWords.length > 0) {
    const { data } = await supabase
      .from('alerts')
      .insert({
        company_id: companyId,
        call_id: callId,
        agent_id: agentId,
        type: 'risk_words',
        message: `Palavras de risco detetadas: ${riskWords.join(', ')}`
      })
      .select('id')
      .single();

    alerts.push({ id: data?.id, type: 'risk_words', words: riskWords });
  }

  // Long duration alert
  if (durationSeconds > LONG_CALL_THRESHOLD_SECONDS) {
    const minutes = Math.round(durationSeconds / 60);
    const { data } = await supabase
      .from('alerts')
      .insert({
        company_id: companyId,
        call_id: callId,
        agent_id: agentId,
        type: 'long_duration',
        message: `Chamada com duração excessiva: ${minutes} minutos`
      })
      .select('id')
      .single();

    alerts.push({ id: data?.id, type: 'long_duration', minutes });
  }

  // No next step alert
  if (!nextStep || nextStep.trim().length < 10) {
    const { data } = await supabase
      .from('alerts')
      .insert({
        company_id: companyId,
        call_id: callId,
        agent_id: agentId,
        type: 'no_next_step',
        message: 'Próximo passo não definido claramente na chamada'
      })
      .select('id')
      .single();

    alerts.push({ id: data?.id, type: 'no_next_step' });
  }

  return alerts;
}

export default router;
