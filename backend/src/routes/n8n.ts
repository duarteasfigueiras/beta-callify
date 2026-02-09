import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../db/supabase';

const router = Router();

// SECURITY: API Key authentication for n8n endpoints
const N8N_API_KEY = process.env.N8N_API_KEY;

function validateApiKey(req: Request, res: Response, next: Function) {
  // Skip validation if no API key is configured (development mode)
  if (!N8N_API_KEY) {
    console.warn('[n8n] WARNING: N8N_API_KEY not set - endpoints are unprotected!');
    return next();
  }

  const providedKey = req.headers['x-api-key'] || req.query.api_key;

  if (!providedKey || typeof providedKey !== 'string') {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  // Use timing-safe comparison to prevent timing attacks
  const keyBuffer = Buffer.from(N8N_API_KEY);
  const providedBuffer = Buffer.from(providedKey);
  if (keyBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(keyBuffer, providedBuffer)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
}

// Apply API key validation to all n8n routes (except health check)
router.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  return validateApiKey(req, res, next);
});

/**
 * Helper to get agent's category/categories
 * Returns both single category (for backwards compat) and array of categories
 */
async function getAgentCategories(agentId: number): Promise<{ category: string | null; categories: string[] }> {
  const { data: agent } = await supabase
    .from('users')
    .select('custom_role_name, categories')
    .eq('id', agentId)
    .single();

  if (!agent) {
    return { category: null, categories: [] };
  }

  // If agent has categories array, use it
  const categories = agent.categories && Array.isArray(agent.categories) && agent.categories.length > 0
    ? agent.categories
    : agent.custom_role_name ? [agent.custom_role_name] : [];

  return {
    category: agent.custom_role_name || (categories.length > 0 ? categories[0] : null),
    categories
  };
}

// Backwards compatibility wrapper
async function getAgentCategory(agentId: number): Promise<string | null> {
  const { category } = await getAgentCategories(agentId);
  return category;
}

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

// Minimum call duration to process (skip unanswered/very short calls)
const MIN_CALL_DURATION_SECONDS = parseInt(process.env.MIN_CALL_DURATION_SECONDS || '10');

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
        example: { phoneNumber: '+351912345678', direction: 'inbound | outbound | meeting', durationSeconds: 180 }
      });
    }

    // Skip very short calls (unanswered, missed, etc.)
    if (durationSeconds > 0 && durationSeconds < MIN_CALL_DURATION_SECONDS) {
      console.log(`[n8n] Skipping short call (${durationSeconds}s < ${MIN_CALL_DURATION_SECONDS}s minimum)`);
      return res.status(200).json({
        skipped: true,
        reason: `Call duration (${durationSeconds}s) below minimum threshold (${MIN_CALL_DURATION_SECONDS}s)`,
        message: 'Call not recorded - too short (likely unanswered)'
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

    // Validate direction (inbound, outbound, or meeting)
    const validDirections = ['inbound', 'outbound', 'meeting'];
    const callDirection = validDirections.includes(direction) ? direction : 'inbound';

    // Create call record
    const { data: newCall, error } = await supabase
      .from('calls')
      .insert({
        company_id: targetCompanyId,
        agent_id: targetAgentId,
        phone_number: phoneNumber,
        direction: callDirection,
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

    // Verify call exists and get agent_id
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, company_id, agent_id')
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

    // Get agent's categories (supports multiple categories)
    const agentData = call.agent_id ? await getAgentCategories(call.agent_id) : { category: null, categories: [] };
    const agentCategories = agentData.categories;
    const hasMultipleCategories = agentCategories.length > 1;

    // Normalize categories to lowercase for DB queries
    const normalizedCategories = agentCategories.map(c => c.toLowerCase());

    // Get criteria for analysis - include 'all' criteria + category-specific criteria
    let criteria: any[] = [];
    if (normalizedCategories.length > 0) {
      // Get criteria that are either 'all' (global) or match any of the agent's categories
      const { data } = await supabase
        .from('criteria')
        .select('id, name, description, weight, category')
        .eq('company_id', call.company_id)
        .eq('is_active', true)
        .in('category', ['all', ...normalizedCategories]);
      criteria = data || [];
    } else {
      // No category - get all company criteria
      const { data } = await supabase
        .from('criteria')
        .select('id, name, description, weight, category')
        .eq('company_id', call.company_id)
        .eq('is_active', true);
      criteria = data || [];
    }

    console.log(`[n8n] Transcription saved, agent categories: ${agentCategories.join(', ') || 'none'}, hasMultiple: ${hasMultipleCategories}, criteria count:`, criteria?.length || 0);

    // Build response with category detection instructions if agent has multiple categories
    const response: any = {
      success: true,
      callId,
      status: 'pending_analysis',
      transcriptionLength: transcription.length,
      agentCategory: agentData.category?.toLowerCase() || null,
      agentCategories: agentCategories,
      hasMultipleCategories,
      nextStep: `/api/n8n/calls/${callId}/analysis`,
      criteria: (criteria || []).map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        weight: c.weight,
        category: c.category
      })),
      analysisPrompt: generateAnalysisPrompt(transcription, criteria || [], hasMultipleCategories ? agentCategories : undefined)
    };

    // If multiple categories, add instructions for AI to detect which one
    if (hasMultipleCategories) {
      response.categoryDetectionRequired = true;
      response.possibleCategories = agentCategories;
      response.categoryDetectionInstructions = `Este agente trabalha em múltiplas categorias: ${agentCategories.join(', ')}. Analisa a transcrição e determina qual categoria está a ser exercida nesta chamada específica. Devolve o campo "detected_category" com o nome exato da categoria detectada.`;
    }

    res.json(response);

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
      contactReasons = [],  // AI-generated contact reasons
      objections = [],      // AI-generated objections
      whatWentWell = [],
      whatWentWrong = [],
      criteriaResults = [],
      detected_category      // AI-detected category (when agent has multiple categories)
    } = req.body;

    if (finalScore === undefined || !summary) {
      return res.status(400).json({ error: 'summary and finalScore are required' });
    }

    // Validate AI analysis data
    const score = Number(finalScore);
    if (isNaN(score) || score < 0 || score > 10) {
      return res.status(400).json({ error: 'finalScore must be a number between 0 and 10' });
    }

    if (typeof summary !== 'string' || summary.length > 10000) {
      return res.status(400).json({ error: 'summary must be a string under 10000 characters' });
    }

    if (!Array.isArray(criteriaResults) || criteriaResults.length > 100) {
      return res.status(400).json({ error: 'criteriaResults must be an array with max 100 items' });
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

    // Use contactReasons for what_went_well if provided, otherwise use whatWentWell
    // Use objections for what_went_wrong if provided, otherwise use whatWentWrong
    const finalContactReasons = contactReasons.length > 0 ? contactReasons : whatWentWell;
    const finalObjections = objections.length > 0 ? objections : whatWentWrong;

    // Build update object
    const updateData: any = {
      summary,
      next_step_recommendation: nextStepRecommendation || '',
      final_score: finalScore,
      score_justification: scoreJustification || '',
      what_went_well: JSON.stringify(finalContactReasons),
      what_went_wrong: JSON.stringify(finalObjections),
      risk_words_detected: JSON.stringify(detectedRiskWords)
    };

    // Add detected_category if provided (for agents with multiple categories)
    if (detected_category) {
      updateData.detected_category = detected_category;
      console.log(`[n8n] AI detected category: ${detected_category}`);
    }

    // Update call with analysis
    await supabase
      .from('calls')
      .update(updateData)
      .eq('id', callId);

    // Save criteria results
    for (const result of criteriaResults) {
      if (result.criterionId) {
        // Get criterion name for historical reference
        const { data: criterion } = await supabase
          .from('criteria')
          .select('name')
          .eq('id', result.criterionId)
          .single();

        // Delete existing result if any
        await supabase
          .from('call_criteria_results')
          .delete()
          .eq('call_id', callId)
          .eq('criterion_id', result.criterionId);

        // Insert new result with criterion name for historical reference
        await supabase.from('call_criteria_results').insert({
          call_id: callId,
          criterion_id: result.criterionId,
          criterion_name: criterion?.name || result.criterionName || null,
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

    // Check duration early to skip short calls
    const callDuration = req.body.durationSeconds || 0;
    if (callDuration > 0 && callDuration < MIN_CALL_DURATION_SECONDS) {
      console.log(`[n8n] Skipping short call (${callDuration}s < ${MIN_CALL_DURATION_SECONDS}s minimum)`);
      return res.status(200).json({
        skipped: true,
        reason: `Call duration (${callDuration}s) below minimum threshold (${MIN_CALL_DURATION_SECONDS}s)`,
        message: 'Call not recorded - too short (likely unanswered)'
      });
    }

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
      contactReasons = [],  // AI-generated contact reasons
      objections = [],      // AI-generated objections
      whatWentWell = [],
      whatWentWrong = [],
      criteriaResults = [],
      // New AI coaching fields
      phrasesToAvoid = [],
      recommendedPhrases = [],
      responseImprovementExample,
      topPerformerComparison,
      skillScores = []
    } = req.body;

    if (!phoneNumber || !transcription || finalScore === undefined) {
      return res.status(400).json({
        error: 'phoneNumber, transcription, and finalScore are required',
        example: {
          phoneNumber: '+351912345678',
          transcription: '[Agent]: Hello...',
          finalScore: 7.5,
          summary: 'Customer inquiry...',
          contactReasons: [{ text: 'Pedido de informação', timestamp: '00:30' }],
          objections: [{ text: 'Preço elevado', timestamp: '02:15' }]
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

    // Validate direction (inbound, outbound, or meeting)
    const validDirections = ['inbound', 'outbound', 'meeting'];
    const callDirection = validDirections.includes(direction) ? direction : 'inbound';

    // Create complete call record
    const { data: newCall, error } = await supabase
      .from('calls')
      .insert({
        company_id: targetCompanyId,
        agent_id: targetAgentId,
        phone_number: phoneNumber,
        direction: callDirection,
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
        risk_words_detected: JSON.stringify(detectedRiskWords),
        // New AI coaching fields
        phrases_to_avoid: JSON.stringify(phrasesToAvoid),
        recommended_phrases: JSON.stringify(recommendedPhrases),
        response_improvement_example: responseImprovementExample ? JSON.stringify(responseImprovementExample) : null,
        top_performer_comparison: topPerformerComparison ? JSON.stringify(topPerformerComparison) : null,
        skill_scores: JSON.stringify(skillScores),
        // Contact reasons and objections
        contact_reasons: JSON.stringify(contactReasons),
        objections: JSON.stringify(objections)
      })
      .select('id')
      .single();

    if (error) throw error;

    const callId = newCall.id;

    // Save criteria results
    for (const cr of criteriaResults) {
      if (cr.criterionId) {
        // Get criterion name for historical reference
        const { data: criterion } = await supabase
          .from('criteria')
          .select('name')
          .eq('id', cr.criterionId)
          .single();

        await supabase.from('call_criteria_results').insert({
          call_id: callId,
          criterion_id: cr.criterionId,
          criterion_name: criterion?.name || cr.criterionName || null,
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
 * Accepts optional agentId to filter by agent's category
 */
// Default risk words (used if company has no custom settings)
const DEFAULT_RISK_WORDS = 'cancelar,cancelamento,reclamacao,reclamar,advogado,processo,tribunal,insatisfeito,insatisfacao,devolver,devolucao,reembolso,nunca mais,pessimo';

router.get('/criteria', async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
    const agentId = req.query.agentId ? parseInt(req.query.agentId as string) : null;

    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: company } = await supabase.from('companies').select('id').limit(1).single();
      targetCompanyId = company?.id;
    }

    // Get agent's category if agentId provided (normalize to lowercase)
    const rawAgentCategory = agentId ? await getAgentCategory(agentId) : null;
    const agentCategory = rawAgentCategory ? rawAgentCategory.toLowerCase() : null;

    let criteria: any[] = [];
    if (targetCompanyId) {
      if (agentCategory) {
        // Get criteria that are either 'all' (global) or match the agent's category
        const { data } = await supabase
          .from('criteria')
          .select('id, name, description, weight, category')
          .eq('company_id', targetCompanyId)
          .eq('is_active', true)
          .in('category', ['all', agentCategory]);
        criteria = data || [];
      } else {
        // No category - get all company criteria
        const { data } = await supabase
          .from('criteria')
          .select('id, name, description, weight, category')
          .eq('company_id', targetCompanyId)
          .eq('is_active', true);
        criteria = data || [];
      }
    }

    // Get company's alert settings (includes risk words)
    let riskWords: string[] = DEFAULT_RISK_WORDS.split(',').map(w => w.trim());
    if (targetCompanyId) {
      const { data: alertSettings } = await supabase
        .from('alert_settings')
        .select('risk_words_list, risk_words_enabled')
        .eq('company_id', targetCompanyId)
        .single();

      if (alertSettings?.risk_words_list && alertSettings?.risk_words_enabled !== false) {
        riskWords = alertSettings.risk_words_list.split(',').map((w: string) => w.trim()).filter((w: string) => w.length > 0);
      }
    }

    // Generate a prompt that can be used directly by the AI agent
    // Hardcoded limits for token control
    const MAX_CRITERIA_FOR_AI = 8;
    const MAX_DESCRIPTION_CHARS = 150;

    // Sort by weight (descending) and limit to max criteria
    const limitedCriteria = [...criteria]
      .sort((a, b) => (b.weight || 1) - (a.weight || 1))
      .slice(0, MAX_CRITERIA_FOR_AI);

    const criteriaList = limitedCriteria.map((c, i) => {
      const desc = c.description || 'Sem descrição';
      const truncatedDesc = desc.length > MAX_DESCRIPTION_CHARS
        ? desc.substring(0, MAX_DESCRIPTION_CHARS) + '...'
        : desc;
      return `${i + 1}. **${c.name}** (ID: ${c.id}, Peso: ${c.weight})\n   ${truncatedDesc}`;
    }).join('\n');

    // Calculate total weight for scoring guidance (based on limited criteria)
    const totalWeight = limitedCriteria.reduce((sum, c) => sum + (c.weight || 1), 0);

    // Format risk words for the prompt
    const riskWordsList = riskWords.map(w => `"${w}"`).join(', ');

    const aiPrompt = `
# SISTEMA DE AVALIAÇÃO DE CHAMADAS - CALLIFY

## QUEM ÉS

És o avaliador oficial de qualidade de chamadas do sistema Callify. O teu trabalho é analisar transcrições de chamadas telefónicas e fornecer avaliações **objetivas, consistentes e reproduzíveis**.

**IMPORTANTE:** A mesma chamada deve SEMPRE receber a mesma pontuação, independentemente de quantas vezes seja avaliada. Segue a metodologia abaixo de forma rigorosa.

---

## METODOLOGIA DE AVALIAÇÃO (OBRIGATÓRIA)

### Passo 1: Ler a transcrição completa
Antes de avaliar qualquer coisa, lê toda a transcrição do início ao fim.

### Passo 2: Avaliar cada critério individualmente
Para CADA critério listado abaixo, determina:
- **Passou (true)**: O critério foi claramente cumprido
- **Não passou (false)**: O critério não foi cumprido ou foi parcialmente cumprido
- **Justificação**: Cita evidência CONCRETA da transcrição

### Passo 3: Calcular a pontuação final
A pontuação é calculada com base nos critérios e seus pesos:
- Soma os pesos dos critérios que PASSARAM
- Divide pelo peso total (${totalWeight})
- Multiplica por 10 para obter a nota final

**Fórmula:** score = (soma_pesos_passou / ${totalWeight}) × 10

---

## CRITÉRIOS DE AVALIAÇÃO (PESO TOTAL: ${totalWeight})

${criteriaList || 'Nenhum critério definido - usa os critérios padrão: Saudação (peso 1), Identificação de necessidades (peso 2), Escuta ativa (peso 1), Apresentação de solução (peso 3), Fecho profissional (peso 1).'}

---

## PALAVRAS DE RISCO

Identifica se QUALQUER destas palavras/expressões aparece na transcrição (ditas pelo cliente OU pelo agente):

${riskWordsList}

Lista TODAS as que encontrares no campo "palavras_risco_detectadas".

---

## ESCALA DE PONTUAÇÃO (REFERÊNCIA)

| Pontuação | Classificação | Descrição |
|-----------|---------------|-----------|
| 9.0 - 10.0 | Excelente | Todos ou quase todos os critérios cumpridos exemplarmente |
| 7.0 - 8.9 | Bom | Maioria dos critérios cumpridos, falhas menores |
| 5.0 - 6.9 | Satisfatório | Critérios básicos cumpridos, várias áreas a melhorar |
| 3.0 - 4.9 | Abaixo da média | Vários critérios não cumpridos |
| 0.0 - 2.9 | Insatisfatório | Falhas graves, maioria dos critérios não cumpridos |

---

## INSTRUÇÕES PARA MOTIVOS DE CONTACTO

Para o campo "motivos_contacto", deves:
1. Identificar TODOS os motivos específicos pelos quais o cliente contactou
2. Analisar os motivos e encontrar TEMAS COMUNS entre eles
3. CRIAR categorias apropriadas que agrupem motivos semelhantes
4. Usar nomes de categoria CURTOS e DESCRITIVOS (2-3 palavras máximo)
5. Exemplos de categorias: "Dúvidas Comerciais", "Problemas Técnicos", "Gestão de Conta", "Reclamações", "Agendamento", "Faturação"
6. Se um motivo não se encaixa em nenhuma categoria com outros, usa "Outros"

Exemplo: Se o cliente perguntou sobre preços E sobre prazos de entrega, agrupa ambos em "Dúvidas Comerciais".

---

## INSTRUÇÕES PARA OBJEÇÕES

Para o campo "objecoes", deves:
1. Identificar TODAS as objeções ou preocupações expressas pelo cliente
2. Analisar as objeções e encontrar TEMAS COMUNS entre elas
3. CRIAR categorias apropriadas que agrupem objeções semelhantes
4. Usar nomes de categoria CURTOS e DESCRITIVOS (2-3 palavras máximo)
5. Exemplos de categorias: "Preço/Custo", "Tempo de Espera", "Funcionalidades", "Concorrência", "Confiança", "Processo"
6. Se uma objeção não se encaixa em nenhuma categoria com outras, usa "Outros"

Exemplo: Se o cliente disse "é muito caro" E "o preço é alto demais", agrupa ambos em "Preço/Custo".

---

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO)

Responde APENAS com JSON válido. Sem texto antes ou depois. Sem markdown code blocks.

{
  "score": 0.0,
  "resumo": "Resumo factual da chamada em 2-3 frases: quem ligou, porquê, e qual foi o resultado.",

  "pontos_fortes": [
    "O que o agente FEZ BEM - critérios que cumpriu, frases eficazes que usou, comportamentos a MANTER. Cita exemplos concretos da transcrição."
  ],

  "melhorias": [
    "O que o agente DEVE MELHORAR - critérios que NÃO cumpriu, frases que usou e NÃO deveria ter usado (cita a frase exata), comportamentos a CORRIGIR."
  ],

  "frases_a_evitar": [
    "Frases EXATAS que o agente disse e que são problemáticas. Ex: 'Não sei se isso é possível', 'Talvez consigamos'"
  ],

  "frases_recomendadas": [
    "Frases alternativas que o agente DEVERIA ter usado em vez das problemáticas. Ex: 'Vou verificar isso para si', 'Consigo ajudá-lo com isso'"
  ],

  "proximo_passo": "O que ficou PENDENTE/ACORDADO na chamada. Ex: 'Enviar email com proposta até sexta-feira', 'Cliente vai testar e liga na próxima semana', 'Agendar reunião para dia 25'",

  "motivos_contacto": [
    {
      "categoria": "Categoria criada por ti (ex: Dúvidas Comerciais, Suporte Técnico, Gestão de Conta)",
      "motivo": "Motivo específico extraído da chamada"
    }
  ],

  "objecoes": [
    {
      "categoria": "Categoria criada por ti (ex: Preço/Custo, Tempo de Espera, Funcionalidades)",
      "objecao": "Objeção específica expressa pelo cliente"
    }
  ],

  "palavras_risco_detectadas": [
    "palavra de risco encontrada na transcrição"
  ],

  "criteriaResults": [
    {
      "criterionId": 0,
      "passed": true,
      "justification": "Evidência concreta da transcrição que suporta esta avaliação",
      "timestampReference": "MM:SS"
    }
  ]
}

---

## REGRAS ABSOLUTAS

1. **CONSISTÊNCIA**: Usa APENAS os factos da transcrição. Não inventes nem assumes.
2. **OBJETIVIDADE**: Avalia o que FOI dito, não o que deveria ter sido dito.
3. **CRITÉRIOS**: Cada criterionId deve corresponder EXATAMENTE aos IDs listados acima.
4. **EVIDÊNCIA**: Cada justificação deve citar ou parafrasear algo da transcrição.
5. **CÁLCULO**: A pontuação deve refletir matematicamente os critérios cumpridos.
6. **FORMATO**: Responde APENAS com JSON válido, nada mais.

---

## TRATAMENTO DE CASOS ESPECIAIS

- **Chamada muito curta** (< 30 segundos): Avalia o que foi possível observar, nota máxima 5.0
- **Transcrição incompleta**: Avalia apenas o conteúdo disponível, menciona no resumo
- **Sem áudio/só silêncio**: score = 0, resumo explica a situação
- **Chamada de teste**: Avalia normalmente, a menos que seja claramente um teste técnico

---

## INSTRUÇÕES PARA N8N

**IMPORTANTE:** Este prompt deve ser seguido da transcrição da chamada.

No n8n, configura o campo "Prompt (User Message)" assim:

\`\`\`
{{ $json.aiPrompt }}

---

## TRANSCRIÇÃO DA CHAMADA A AVALIAR

{{ $('NomeDoNoTranscricao').item.json.transcription }}
\`\`\`

Substitui 'NomeDoNoTranscricao' pelo nome do nó que contém a transcrição.

---

Agora analisa a transcrição fornecida abaixo seguindo esta metodologia:
    `.trim();

    res.json({
      criteria,
      riskWords,
      companyId: targetCompanyId,
      agentCategory: agentCategory || 'all',
      criteriaCount: criteria.length,
      riskWordsCount: riskWords.length,
      aiPrompt,
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
    // Handle both direct object and array format from n8n
    // n8n sometimes sends [{"output": "..."}] instead of {"output": "..."}
    let requestBody = req.body;
    if (Array.isArray(requestBody) && requestBody.length > 0) {
      console.log('[n8n] Received array format, extracting first element');
      requestBody = requestBody[0];
    }

    console.log('[n8n] Received AI agent output:', JSON.stringify(requestBody, null, 2).substring(0, 2000));
    console.log('[n8n] Request body keys:', Object.keys(requestBody));
    console.log('[n8n] Has agent_output:', !!requestBody.agent_output);
    console.log('[n8n] Has output:', !!requestBody.output);
    console.log('[n8n] agent_output type:', typeof requestBody.agent_output);
    console.log('[n8n] output type:', typeof requestBody.output);

    // Check duration early to skip short calls
    const callDuration = requestBody.durationSeconds || 0;
    if (callDuration > 0 && callDuration < MIN_CALL_DURATION_SECONDS) {
      console.log(`[n8n] Skipping short call (${callDuration}s < ${MIN_CALL_DURATION_SECONDS}s minimum)`);
      return res.status(200).json({
        skipped: true,
        reason: `Call duration (${callDuration}s) below minimum threshold (${MIN_CALL_DURATION_SECONDS}s)`,
        message: 'Call not recorded - too short (likely unanswered)'
      });
    }

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
      // AI Agent output format (accept both 'agent_output' and 'output' field names)
      agent_output,
      output,  // Alternative field name from n8n
      // Or direct fields
      score,
      resumo,
      pontos_fortes,
      melhorias,
      acoes_recomendadas,
      observacoes,
      // New AI-generated fields
      motivos_contacto,  // Contact reasons
      objecoes,          // Objections
      proximo_passo,     // Next step agreed/pending
      // New AI coaching fields
      frases_a_evitar,           // Phrases to avoid
      frases_recomendadas,       // Recommended phrases
      exemplo_resposta_melhorada, // Response improvement example
      comparacao_top_performer,   // Top performer comparison
      pontuacao_skills,          // Skill scores
      palavras_risco_detectadas  // Risk words detected by AI
    } = requestBody;

    // Parse agent_output if it's a string (also accept 'output' field name from n8n)
    let aiOutput = agent_output || output;

    console.log('[n8n] aiOutput type:', typeof aiOutput);
    console.log('[n8n] aiOutput raw value (first 500 chars):', typeof aiOutput === 'string' ? aiOutput.substring(0, 500) : JSON.stringify(aiOutput)?.substring(0, 500));

    // Special handling: if aiOutput is a string that looks like it contains literal \n characters
    // (common when n8n sends the AI Agent output as a string)
    if (typeof aiOutput === 'string' && aiOutput.includes('\\n')) {
      console.log('[n8n] Detected literal \\n in string, attempting to fix and parse...');
      try {
        // Replace literal \n with nothing (remove them for JSON parsing)
        const fixedString = aiOutput.replace(/\\n/g, ' ').replace(/\s+/g, ' ');
        const parsed = JSON.parse(fixedString);
        if (parsed && typeof parsed === 'object') {
          aiOutput = parsed;
          console.log('[n8n] Successfully parsed after removing literal \\n, keys:', Object.keys(aiOutput));
        }
      } catch (e) {
        console.log('[n8n] Could not parse with \\n fix, continuing with other methods');
      }
    }

    // If aiOutput is already a properly parsed object with expected fields, use it directly
    if (aiOutput && typeof aiOutput === 'object' && !Array.isArray(aiOutput) && (aiOutput.score !== undefined || aiOutput.resumo || aiOutput.pontos_fortes)) {
      console.log('[n8n] aiOutput is already a parsed object, using directly');
      console.log('[n8n] aiOutput keys:', Object.keys(aiOutput));
      // aiOutput is ready to use
    } else if (typeof aiOutput === 'string') {
      console.log('[n8n] aiOutput is a string, attempting to parse...');
      let cleanedOutput = aiOutput;

      // Check if it's a double-encoded JSON string (starts and ends with quotes)
      // This happens when n8n uses JSON.stringify($json.output)
      if (cleanedOutput.startsWith('"') && cleanedOutput.endsWith('"')) {
        console.log('[n8n] Detected double-encoded JSON, unwrapping...');
        try {
          cleanedOutput = JSON.parse(cleanedOutput);
          console.log('[n8n] Unwrapped string, now type:', typeof cleanedOutput);
        } catch (e) {
          console.log('[n8n] Failed to unwrap double-encoded string');
        }
      }

      // If after unwrapping it's now an object, use it directly
      if (typeof cleanedOutput === 'object' && cleanedOutput !== null) {
        aiOutput = cleanedOutput;
        console.log('[n8n] After unwrapping, aiOutput is now an object with keys:', Object.keys(aiOutput));
      } else {
        // Continue with string parsing
        cleanedOutput = String(cleanedOutput);

        // Replace literal \n with actual newlines (common issue with some AI outputs)
        cleanedOutput = cleanedOutput.replace(/\\n/g, '\n');

        // Remove markdown code blocks (```json ... ``` or ``` ... ```)
        cleanedOutput = cleanedOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

        // Also try to extract JSON from within the text if it contains ```json blocks
        const jsonBlockMatch = cleanedOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonBlockMatch) {
          cleanedOutput = jsonBlockMatch[1];
        }

        // Trim whitespace
        cleanedOutput = cleanedOutput.trim();

        // If the string starts with { and ends with }, try to parse it directly
        if (cleanedOutput.startsWith('{') && cleanedOutput.endsWith('}')) {
          try {
            aiOutput = JSON.parse(cleanedOutput);
            console.log('[n8n] Successfully parsed agent_output as JSON');
          } catch (parseError) {
            console.log('[n8n] First JSON parse failed, trying with escaped newlines fix');
            // Try replacing escaped quotes and other common issues
            try {
              const fixedOutput = cleanedOutput
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
              aiOutput = JSON.parse(fixedOutput);
              console.log('[n8n] Successfully parsed agent_output after fixing escapes');
            } catch {
              console.log('[n8n] Could not parse JSON even after fixes');
            }
          }
        }

        if (!aiOutput || typeof aiOutput !== 'object') {
          try {
            // Try to parse as JSON first
            aiOutput = JSON.parse(cleanedOutput);
            console.log('[n8n] Successfully parsed agent_output as JSON');
          } catch {
            // If not valid JSON, try to extract data from text
            console.log('[n8n] agent_output is not valid JSON, trying to extract from text...');
            console.log('[n8n] Cleaned output was:', cleanedOutput.substring(0, 200));
            aiOutput = {};

            // Try to extract score from text (look for patterns like "score: 7.5" or "pontuação: 8")
            const scoreMatch = cleanedOutput.match(/(?:"score"|score)[:\s]+(\d+(?:[.,]\d+)?)/i);
            if (scoreMatch) {
              aiOutput.score = parseFloat(scoreMatch[1].replace(',', '.'));
            }

            // Try to extract resumo/summary from JSON-like structure
            const resumoMatch = cleanedOutput.match(/(?:"resumo"|resumo)[:\s]+"([^"]+)"/i);
            if (resumoMatch) {
              aiOutput.resumo = resumoMatch[1].trim();
            }

            // Try to extract pontos_fortes array
            const pontosMatch = cleanedOutput.match(/(?:"pontos_fortes"|pontos_fortes)[:\s]*\[([\s\S]*?)\]/i);
            if (pontosMatch) {
              try {
                aiOutput.pontos_fortes = JSON.parse('[' + pontosMatch[1] + ']');
              } catch {
                // Extract strings manually
                const items = pontosMatch[1].match(/"([^"]+)"/g);
                if (items) {
                  aiOutput.pontos_fortes = items.map(s => s.replace(/"/g, ''));
                }
              }
            }

            // Try to extract melhorias array
            const melhoriasMatch = cleanedOutput.match(/(?:"melhorias"|melhorias)[:\s]*\[([\s\S]*?)\]/i);
            if (melhoriasMatch) {
              try {
                aiOutput.melhorias = JSON.parse('[' + melhoriasMatch[1] + ']');
              } catch {
                const items = melhoriasMatch[1].match(/"([^"]+)"/g);
                if (items) {
                  aiOutput.melhorias = items.map(s => s.replace(/"/g, ''));
                }
              }
            }

            // Try to extract criteriaResults array
            const criteriaMatch = cleanedOutput.match(/(?:"criteriaResults"|criteriaResults)[:\s]*\[([\s\S]*?)\]/i);
            if (criteriaMatch) {
              try {
                aiOutput.criteriaResults = JSON.parse('[' + criteriaMatch[1] + ']');
                console.log('[n8n] Extracted criteriaResults from text:', aiOutput.criteriaResults?.length);
              } catch (e) {
                console.log('[n8n] Could not parse criteriaResults from text');
              }
            }

            // Try to extract frases_a_evitar array
            const frasesEvitarMatch = cleanedOutput.match(/(?:"frases_a_evitar"|frases_a_evitar)[:\s]*\[([\s\S]*?)\]/i);
            if (frasesEvitarMatch) {
              try {
                aiOutput.frases_a_evitar = JSON.parse('[' + frasesEvitarMatch[1] + ']');
                console.log('[n8n] Extracted frases_a_evitar from text:', aiOutput.frases_a_evitar?.length);
              } catch {
                const items = frasesEvitarMatch[1].match(/"([^"]+)"/g);
                if (items) {
                  aiOutput.frases_a_evitar = items.map((s: string) => s.replace(/"/g, ''));
                }
              }
            }

            // Try to extract frases_recomendadas array
            const frasesRecMatch = cleanedOutput.match(/(?:"frases_recomendadas"|frases_recomendadas)[:\s]*\[([\s\S]*?)\]/i);
            if (frasesRecMatch) {
              try {
                aiOutput.frases_recomendadas = JSON.parse('[' + frasesRecMatch[1] + ']');
                console.log('[n8n] Extracted frases_recomendadas from text:', aiOutput.frases_recomendadas?.length);
              } catch {
                const items = frasesRecMatch[1].match(/"([^"]+)"/g);
                if (items) {
                  aiOutput.frases_recomendadas = items.map((s: string) => s.replace(/"/g, ''));
                }
              }
            }

            // Try to extract pontuacao_skills array (complex objects)
            const skillsMatch = cleanedOutput.match(/(?:"pontuacao_skills"|pontuacao_skills)[:\s]*\[([\s\S]*?)\]/i);
            if (skillsMatch) {
              try {
                aiOutput.pontuacao_skills = JSON.parse('[' + skillsMatch[1] + ']');
                console.log('[n8n] Extracted pontuacao_skills from text:', aiOutput.pontuacao_skills?.length);
              } catch (e) {
                console.log('[n8n] Could not parse pontuacao_skills from text');
              }
            }

            // Try to extract motivos_contacto array
            const motivosMatch = cleanedOutput.match(/(?:"motivos_contacto"|motivos_contacto)[:\s]*\[([\s\S]*?)\]/i);
            if (motivosMatch) {
              try {
                aiOutput.motivos_contacto = JSON.parse('[' + motivosMatch[1] + ']');
                console.log('[n8n] Extracted motivos_contacto from text:', aiOutput.motivos_contacto?.length);
              } catch {
                const items = motivosMatch[1].match(/"([^"]+)"/g);
                if (items) {
                  aiOutput.motivos_contacto = items.map((s: string) => s.replace(/"/g, ''));
                }
              }
            }

            // Try to extract objecoes array
            const objecoesMatch = cleanedOutput.match(/(?:"objecoes"|objecoes)[:\s]*\[([\s\S]*?)\]/i);
            if (objecoesMatch) {
              try {
                aiOutput.objecoes = JSON.parse('[' + objecoesMatch[1] + ']');
                console.log('[n8n] Extracted objecoes from text:', aiOutput.objecoes?.length);
              } catch {
                const items = objecoesMatch[1].match(/"([^"]+)"/g);
                if (items) {
                  aiOutput.objecoes = items.map((s: string) => s.replace(/"/g, ''));
                }
              }
            }

            // Store the full text as resumo if nothing else found
            if (!aiOutput.resumo && cleanedOutput.length > 0) {
              aiOutput.resumo = cleanedOutput.substring(0, 500);
            }
          }
        }
      }
    }

    // Log all aiOutput fields for debugging
    console.log('[n8n] Final aiOutput keys:', aiOutput ? Object.keys(aiOutput) : 'null');
    if (aiOutput) {
      console.log('[n8n] aiOutput.frases_a_evitar:', JSON.stringify(aiOutput.frases_a_evitar)?.substring(0, 200));
      console.log('[n8n] aiOutput.frases_recomendadas:', JSON.stringify(aiOutput.frases_recomendadas)?.substring(0, 200));
      console.log('[n8n] aiOutput.pontuacao_skills:', JSON.stringify(aiOutput.pontuacao_skills)?.substring(0, 200));
      console.log('[n8n] aiOutput.motivos_contacto:', JSON.stringify(aiOutput.motivos_contacto)?.substring(0, 200));
      console.log('[n8n] aiOutput.objecoes:', JSON.stringify(aiOutput.objecoes)?.substring(0, 200));
    }

    // Use direct fields or from agent_output object
    // Default score to 5.0 if not found (middle of the scale)
    let finalScore = score ?? aiOutput?.score;
    if (finalScore === undefined || finalScore === null) {
      console.log('[n8n] No score found, using default of 5.0');
      finalScore = 5.0;
    }
    const summary = resumo ?? aiOutput?.resumo ?? '';
    const strengths = pontos_fortes ?? aiOutput?.pontos_fortes ?? [];
    const improvements = melhorias ?? aiOutput?.melhorias ?? [];
    const recommendations = acoes_recomendadas ?? aiOutput?.acoes_recomendadas ?? [];
    const notes = observacoes ?? aiOutput?.observacoes ?? '';
    // AI-generated contact reasons and objections
    const contactReasons = motivos_contacto ?? aiOutput?.motivos_contacto ?? aiOutput?.contactReasons ?? [];
    const objections = objecoes ?? aiOutput?.objecoes ?? aiOutput?.objections ?? [];
    // Next step - what was agreed/pending
    const nextStep = proximo_passo ?? aiOutput?.proximo_passo ?? aiOutput?.nextStep ?? '';
    // AI coaching fields - log intermediate values for debugging
    console.log('[n8n] Direct body frases_a_evitar:', JSON.stringify(frases_a_evitar));
    console.log('[n8n] Direct body frases_recomendadas:', JSON.stringify(frases_recomendadas));
    console.log('[n8n] Direct body pontuacao_skills:', JSON.stringify(pontuacao_skills));

    const phrasesToAvoid = frases_a_evitar ?? aiOutput?.frases_a_evitar ?? aiOutput?.phrasesToAvoid ?? [];
    const recommendedPhrases = frases_recomendadas ?? aiOutput?.frases_recomendadas ?? aiOutput?.recommendedPhrases ?? [];
    const responseExample = exemplo_resposta_melhorada ?? aiOutput?.exemplo_resposta_melhorada ?? aiOutput?.responseImprovementExample ?? null;
    const topPerformerComp = comparacao_top_performer ?? aiOutput?.comparacao_top_performer ?? aiOutput?.topPerformerComparison ?? null;
    const skillScoresData = pontuacao_skills ?? aiOutput?.pontuacao_skills ?? aiOutput?.skillScores ?? [];
    // Risk words detected by AI
    const aiDetectedRiskWords = palavras_risco_detectadas ?? aiOutput?.palavras_risco_detectadas ?? aiOutput?.riskWordsDetected ?? [];

    // Log extracted coaching fields for debugging
    console.log('[n8n] Extracted coaching fields:', {
      phrasesToAvoid: phrasesToAvoid?.length || 0,
      recommendedPhrases: recommendedPhrases?.length || 0,
      skillScores: skillScoresData?.length || 0,
      contactReasons: contactReasons?.length || 0,
      responseExample: responseExample ? 'yes' : 'no'
    });
    console.log('[n8n] skillScoresData:', JSON.stringify(skillScoresData));
    console.log('[n8n] phrasesToAvoid:', JSON.stringify(phrasesToAvoid));

    // Score validation removed - we now use a default of 5.0 if not found

    // Get company
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: company } = await supabase.from('companies').select('id').limit(1).single();
      if (!company) {
        return res.status(500).json({ error: 'No company configured' });
      }
      targetCompanyId = company.id;
    }

    // Get agent - try to match by phone number first
    let targetAgentId: number | null = agentId || null;

    if (!targetAgentId && phoneNumber) {
      // Try to find agent by phone number
      // Normalize phone number for comparison (remove spaces)
      const normalizedPhone = phoneNumber.trim().replace(/\s+/g, '');

      const { data: agentByPhone } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', targetCompanyId)
        .eq('phone_number', normalizedPhone)
        .single();

      if (agentByPhone) {
        targetAgentId = agentByPhone.id;
        console.log('[n8n] Found agent by phone number:', normalizedPhone, '- Agent ID:', targetAgentId);
      } else {
        console.log('[n8n] No agent found with phone number:', normalizedPhone, '- will try null agent_id');
        // Leave targetAgentId as null - will try to insert without agent
      }
    }

    // Detect risk words from transcription or summary
    const textToCheck = (transcription || summary || '').toLowerCase();
    const detectedRiskWords = RISK_WORDS.filter(word => textToCheck.includes(word.toLowerCase()));

    // Combine AI-detected risk words with system-detected ones
    const allRiskWords = [...new Set([...detectedRiskWords, ...aiDetectedRiskWords])];

    // History comparison from AI
    const historyComparison = aiOutput?.comparacao_historico ?? aiOutput?.historyComparison ?? null;

    // Criteria results from AI
    const criteriaResults = aiOutput?.criteriaResults ?? aiOutput?.criteria_results ?? [];

    // Validate direction (inbound, outbound, or meeting)
    const validDirections = ['inbound', 'outbound', 'meeting'];
    const callDirection = validDirections.includes(direction) ? direction : 'inbound';

    // Create call record with AI analysis
    // Try with coaching fields first, fallback to basic fields if columns don't exist
    const baseCallData = {
      company_id: targetCompanyId,
      agent_id: targetAgentId,
      phone_number: phoneNumber || 'AI Analysis',
      direction: callDirection,
      duration_seconds: durationSeconds,
      audio_file_path: audioUrl || null,
      call_date: callDate || new Date().toISOString(),
      transcription: transcription || null,
      summary: summary,
      next_step_recommendation: nextStep || recommendations.join('\n- '),
      final_score: finalScore,
      score_justification: notes,
      what_went_well: JSON.stringify(strengths),
      what_went_wrong: JSON.stringify(improvements),
      risk_words_detected: JSON.stringify(allRiskWords)
    };

    const coachingFields = {
      phrases_to_avoid: JSON.stringify(phrasesToAvoid),
      recommended_phrases: JSON.stringify(recommendedPhrases),
      response_improvement_example: responseExample ? JSON.stringify(responseExample) : null,
      top_performer_comparison: topPerformerComp ? JSON.stringify(topPerformerComp) : null,
      skill_scores: JSON.stringify(skillScoresData),
      // New fields for contact reasons, objections and history comparison
      contact_reasons: JSON.stringify(contactReasons),
      objections: JSON.stringify(objections),
      history_comparison: historyComparison ? JSON.stringify(historyComparison) : null
    };

    // Log coaching fields being saved
    console.log('[n8n] ========== COACHING FIELDS DEBUG ==========');
    console.log('[n8n] phrasesToAvoid value:', JSON.stringify(phrasesToAvoid));
    console.log('[n8n] recommendedPhrases value:', JSON.stringify(recommendedPhrases));
    console.log('[n8n] skillScoresData value:', JSON.stringify(skillScoresData));
    console.log('[n8n] contactReasons value:', JSON.stringify(contactReasons));
    console.log('[n8n] objections value:', JSON.stringify(objections));
    console.log('[n8n] Coaching fields to save:', {
      phrases_to_avoid: coachingFields.phrases_to_avoid?.substring(0, 100),
      recommended_phrases: coachingFields.recommended_phrases?.substring(0, 100),
      skill_scores: coachingFields.skill_scores?.substring(0, 100),
      response_example: coachingFields.response_improvement_example ? 'present' : 'null'
    });
    console.log('[n8n] ============================================');

    // Try with all fields first
    let { data: newCall, error } = await supabase
      .from('calls')
      .insert({ ...baseCallData, ...coachingFields })
      .select('id')
      .single();

    // If error mentions unknown column, retry without coaching fields
    if (error && error.message && error.message.includes('column')) {
      console.log('[n8n] Coaching columns not found, inserting without them');
      const retryResult = await supabase
        .from('calls')
        .insert(baseCallData)
        .select('id')
        .single();
      newCall = retryResult.data;
      error = retryResult.error;
    }

    // If error is about null agent_id, get a fallback agent and mark in summary
    if (error && error.message && error.message.includes('agent_id')) {
      console.log('[n8n] Database requires agent_id, using fallback agent');
      const { data: fallbackAgent } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', targetCompanyId)
        .in('role', ['agent', 'admin_manager'])
        .limit(1)
        .single();

      if (fallbackAgent) {
        // Use fallback agent but keep original summary (agent shown as "Indefinido" in UI)
        // Include coachingFields to preserve AI analysis data
        const retryResult = await supabase
          .from('calls')
          .insert({ ...baseCallData, ...coachingFields, agent_id: fallbackAgent.id })
          .select('id')
          .single();
        newCall = retryResult.data;
        error = retryResult.error;
      }
    }

    if (error || !newCall) {
      console.error('[n8n] Error creating call:', error);
      throw error || new Error('Failed to create call');
    }

    const callId = newCall.id;

    // Save criteria results if provided
    if (criteriaResults && Array.isArray(criteriaResults) && criteriaResults.length > 0) {
      console.log('[n8n] Saving criteria results:', criteriaResults.length);
      console.log('[n8n] Criteria results data:', JSON.stringify(criteriaResults, null, 2));
      let savedCount = 0;
      for (const cr of criteriaResults) {
        const criterionId = cr.criterionId ?? cr.criterion_id;
        console.log('[n8n] Processing criterion:', { criterionId, passed: cr.passed, justification: cr.justification?.substring(0, 50) });
        if (criterionId) {
          // Get criterion name for historical reference
          const { data: criterion } = await supabase
            .from('criteria')
            .select('name')
            .eq('id', criterionId)
            .single();

          const { error: crError } = await supabase.from('call_criteria_results').insert({
            call_id: callId,
            criterion_id: criterionId,
            criterion_name: criterion?.name || (cr.criterionName ?? cr.criterion_name ?? null),
            passed: cr.passed ?? false,
            justification: cr.justification ?? '',
            timestamp_reference: cr.timestampReference ?? cr.timestamp_reference ?? null
          });
          if (crError) {
            console.error('[n8n] Error saving criterion result:', crError.message, 'criterionId:', criterionId);
          } else {
            savedCount++;
            console.log('[n8n] Saved criterion result for criterionId:', criterionId);
          }
        } else {
          console.log('[n8n] Skipping criterion - no ID found:', cr);
        }
      }
      console.log('[n8n] Total criteria results saved:', savedCount, 'of', criteriaResults.length);
    } else {
      console.log('[n8n] No criteria results to save. criteriaResults:', criteriaResults);
    }

    // Generate alerts (only if agent is defined)
    let alerts: any[] = [];
    if (targetAgentId) {
      alerts = await generateAlerts(
        callId,
        targetCompanyId,
        targetAgentId,
        finalScore,
        durationSeconds,
        detectedRiskWords,
        recommendations.join(', ')
      );
    }

    console.log('[n8n] AI agent output processed, call created:', callId, 'criteria:', criteriaResults?.length || 0);

    res.status(201).json({
      success: true,
      callId,
      status: 'completed',
      finalScore,
      summary,
      riskWordsDetected: detectedRiskWords,
      alertsGenerated: alerts.length,
      criteriaEvaluated: criteriaResults?.length || 0,
      viewUrl: `/calls/${callId}`
    });

  } catch (error: any) {
    console.error('[n8n] Error processing AI agent output:', error);
    res.status(500).json({
      error: 'Failed to process AI agent output',
      details: error?.message || String(error),
      code: error?.code
    });
  }
});

/**
 * Debug endpoint - check coaching fields for a specific call
 */
router.get('/debug-call/:id', async (req: Request, res: Response) => {
  try {
    const callId = parseInt(req.params.id);

    const { data: call, error } = await supabase
      .from('calls')
      .select('id, skill_scores, phrases_to_avoid, recommended_phrases, contact_reasons, objections, response_improvement_example, history_comparison')
      .eq('id', callId)
      .single();

    if (error || !call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({
      callId: call.id,
      hasSkillScores: !!call.skill_scores && call.skill_scores !== '[]',
      hasPhrasesToAvoid: !!call.phrases_to_avoid && call.phrases_to_avoid !== '[]',
      hasRecommendedPhrases: !!call.recommended_phrases && call.recommended_phrases !== '[]',
      hasContactReasons: !!call.contact_reasons && call.contact_reasons !== '[]',
      hasObjections: !!call.objections && call.objections !== '[]',
      hasResponseExample: !!call.response_improvement_example,
      hasHistoryComparison: !!call.history_comparison,
      rawData: {
        skill_scores: call.skill_scores,
        phrases_to_avoid: call.phrases_to_avoid,
        contact_reasons: call.contact_reasons
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check and documentation
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * Cleanup call summaries - remove "[Utilizador não identificado pelo telefone]" text
 */
router.post('/cleanup-summaries', async (_req: Request, res: Response) => {
  try {
    // Find calls with the legacy text
    const { data: calls, error: findError } = await supabase
      .from('calls')
      .select('id, summary')
      .like('summary', '%[Utilizador não identificado pelo telefone]%');

    if (findError) {
      throw findError;
    }

    if (!calls || calls.length === 0) {
      return res.json({ message: 'No calls to clean up', updated: 0 });
    }

    let updatedCount = 0;
    for (const call of calls) {
      const cleanedSummary = call.summary
        .replace('[Utilizador não identificado pelo telefone] ', '')
        .replace('[Utilizador não identificado pelo telefone]', '');

      const { error: updateError } = await supabase
        .from('calls')
        .update({ summary: cleanedSummary || null })
        .eq('id', call.id);

      if (!updateError) {
        updatedCount++;
      }
    }

    res.json({
      message: 'Cleanup completed',
      found: calls.length,
      updated: updatedCount
    });
  } catch (error) {
    console.error('[n8n] Error cleaning up summaries:', error);
    res.status(500).json({ error: 'Failed to clean up summaries' });
  }
});

/**
 * Generate a prompt for LLM analysis
 * @param transcription - The call transcription
 * @param criteria - Evaluation criteria
 * @param multipleCategories - If agent has multiple categories, include them for detection
 */
function generateAnalysisPrompt(transcription: string, criteria: any[], multipleCategories?: string[]): string {
  const criteriaList = criteria.map(c =>
    `- ${c.name} (ID: ${c.id}, Weight: ${c.weight}${c.category ? `, Category: ${c.category}` : ''}): ${c.description}`
  ).join('\n');

  // Add category detection section if agent has multiple categories
  const categoryDetectionSection = multipleCategories && multipleCategories.length > 1 ? `
CATEGORY DETECTION:
This agent works in multiple categories: ${multipleCategories.join(', ')}
Based on the call content, determine which category is being exercised in this specific call.
Include "detected_category" in your response with the EXACT name of the detected category.
Only use criteria that match the detected category or are marked as 'all'.
` : '';

  const detectedCategoryField = multipleCategories && multipleCategories.length > 1
    ? `  "detected_category": "${multipleCategories[0]}",  // REQUIRED: Which category is this call? Must be one of: ${multipleCategories.join(', ')}\n`
    : '';

  return `
Analyze the following call transcription and evaluate it based on the criteria below.

TRANSCRIPTION:
${transcription}

EVALUATION CRITERIA:
${criteriaList}
${categoryDetectionSection}
Please provide your analysis in the following JSON format:
{
${detectedCategoryField}  "summary": "Brief summary of the call (2-3 sentences)",
  "nextStepRecommendation": "Recommended next action",
  "finalScore": 7.5,
  "scoreJustification": "Explanation for the score",
  "contactReasons": [
    { "text": "Main reason for customer contact (e.g., 'Pedido de informação sobre preços', 'Suporte técnico', 'Cancelamento de serviço')", "timestamp": "MM:SS" }
  ],
  "objections": [
    { "text": "Customer objection or concern raised (e.g., 'Preço elevado', 'Tempo de espera', 'Falta de funcionalidades')", "timestamp": "MM:SS" }
  ],
  "whatWentWell": [
    { "text": "Positive aspect of agent performance", "timestamp": "MM:SS" }
  ],
  "whatWentWrong": [
    { "text": "Area for improvement in agent performance", "timestamp": "MM:SS" }
  ],
  "criteriaResults": [
    { "criterionId": 1, "passed": true, "justification": "..." },
    { "criterionId": 2, "passed": false, "justification": "...", "timestampReference": "01:30" }
  ]
}

IMPORTANT INSTRUCTIONS:
- "contactReasons": Extract the MAIN REASON(S) why the customer called. Be specific and concise (e.g., "Pedido de orçamento", "Dúvida sobre faturação", "Reclamação de entrega"). Generate these dynamically based on the conversation content.
- "objections": Extract any OBJECTIONS or CONCERNS the customer raised during the call (e.g., "Preço muito alto", "Prazo de entrega longo", "Funcionalidade em falta"). If no objections, return empty array.
- "whatWentWell": Focus on AGENT PERFORMANCE - what the agent did well
- "whatWentWrong": Focus on AGENT PERFORMANCE - what the agent could improve${multipleCategories && multipleCategories.length > 1 ? `
- "detected_category": REQUIRED - Identify which category this call belongs to based on the conversation content` : ''}
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

/**
 * Generate test calls with full AI coaching data
 * POST /api/n8n/generate-test-calls
 */
router.post('/generate-test-calls', async (req: Request, res: Response) => {
  try {
    const { count = 20 } = req.body;

    // Get company
    const { data: company } = await supabase.from('companies').select('id').limit(1).single();
    if (!company) {
      return res.status(500).json({ error: 'No company found' });
    }

    // Get agent
    const { data: agent } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', company.id)
      .eq('role', 'agent')
      .limit(1)
      .single();

    if (!agent) {
      return res.status(500).json({ error: 'No agent found' });
    }

    const directions = ['inbound', 'outbound', 'meeting'];
    const phoneNumbers = [
      '+351912345678', '+351923456789', '+351934567890', '+351945678901',
      '+351956789012', '+351967890123', '+351978901234', '+351989012345',
      '+351990123456', '+351901234567', '+351912111222', '+351923222333',
      '+351934333444', '+351945444555', '+351956555666', '+351967666777',
      '+351978777888', '+351989888999', '+351990999000', '+351901000111'
    ];

    const summaries = [
      'Cliente ligou para pedir informações sobre o novo plano de dados. Demonstrou interesse em mudar de operadora.',
      'Chamada de acompanhamento pós-venda. Cliente satisfeito com o produto adquirido.',
      'Reclamação sobre fatura incorreta. Situação resolvida com crédito na próxima fatura.',
      'Pedido de cancelamento. Cliente retido com oferta de desconto de 30%.',
      'Dúvidas sobre instalação do equipamento. Agendada visita técnica.',
      'Reunião de apresentação de proposta comercial para empresa.',
      'Cliente interessado em upgrade de serviço. Proposta enviada por email.',
      'Suporte técnico - problema de conectividade resolvido remotamente.',
      'Negociação de contrato anual. Fechamento previsto para próxima semana.',
      'Chamada de boas-vindas a novo cliente. Explicação dos serviços incluídos.'
    ];

    const nextSteps = [
      'Enviar proposta comercial por email até amanhã',
      'Agendar visita técnica para instalação',
      'Aguardar confirmação do cliente sobre upgrade',
      'Fazer follow-up em 3 dias úteis',
      'Preparar contrato para assinatura',
      'Enviar documentação adicional solicitada',
      'Confirmar agendamento da reunião presencial',
      'Aguardar pagamento para ativar serviço',
      'Contactar gestor de conta para aprovação',
      'Verificar disponibilidade de stock'
    ];

    const phrasesToAvoidOptions = [
      ['Isso não é possível', 'Não podemos fazer nada', 'Esse é o procedimento'],
      ['Vou ter que transferir', 'Não sei', 'Isso é com outro departamento'],
      ['Infelizmente não', 'É política da empresa', 'Não há nada a fazer'],
      ['Tem que esperar', 'Não é da minha responsabilidade', 'Ligue mais tarde']
    ];

    const recommendedPhrasesOptions = [
      ['Compreendo a sua situação', 'Vou resolver isso agora', 'Posso ajudá-lo com isso'],
      ['Deixe-me verificar as opções disponíveis', 'Tenho uma solução para si', 'Agradeço a sua paciência'],
      ['Vou acompanhar pessoalmente este caso', 'Qual seria a melhor solução para si?', 'Posso fazer isso por si'],
      ['É uma excelente pergunta', 'Vou garantir que fica resolvido', 'Está tudo esclarecido?']
    ];

    const skillNames = ['Escuta Ativa', 'Clareza', 'Objeções', 'Fecho', 'Empatia'];

    const insights = [
      'Melhorar tempo de resposta às objeções do cliente',
      'Excelente capacidade de criar rapport',
      'Reforçar técnicas de fecho de venda',
      'Demonstra boa escuta ativa',
      'Pode melhorar na clareza das explicações técnicas',
      'Boa gestão emocional em situações difíceis',
      'Necessita praticar mais perguntas abertas',
      'Muito bom a identificar necessidades do cliente'
    ];

    const createdCalls: number[] = [];

    for (let i = 0; i < Math.min(count, 20); i++) {
      const score = Math.round((5 + Math.random() * 5) * 10) / 10; // 5.0 to 10.0
      const daysAgo = Math.floor(Math.random() * 30);
      const callDate = new Date();
      callDate.setDate(callDate.getDate() - daysAgo);

      // Generate skill scores
      const skillScores = skillNames.map(name => ({
        name,
        score: Math.round((4 + Math.random() * 6) * 10) / 10,
        description: `Avaliação de ${name.toLowerCase()} nesta chamada`
      }));

      // Generate response example
      const responseExample = {
        before: 'Isso não é possível fazer, é política da empresa.',
        after: 'Compreendo a sua situação. Deixe-me verificar que alternativas temos disponíveis para si.',
        context: 'Quando o cliente pediu uma exceção à política de devolução'
      };

      // Generate top performer comparison
      const topPerformerComparison = {
        agent_score: score,
        top_performer_score: Math.round((8 + Math.random() * 2) * 10) / 10,
        gap: Math.round((score - 9) * 10) / 10,
        insights: [
          insights[Math.floor(Math.random() * insights.length)],
          insights[Math.floor(Math.random() * insights.length)]
        ]
      };

      // Generate contact reasons (what went well)
      const contactReasons = [
        { text: 'Pedido de informação sobre serviços', timestamp: '00:45' },
        { text: 'Interesse em upgrade de plano', timestamp: '02:30' },
        { text: 'Esclarecimento de dúvidas de faturação', timestamp: '04:15' }
      ].slice(0, 2 + Math.floor(Math.random() * 2));

      // Generate objections (what went wrong)
      const objections = [
        { text: 'Preço considerado elevado pelo cliente', timestamp: '03:20' },
        { text: 'Dúvidas sobre qualidade do serviço', timestamp: '05:10' }
      ].slice(0, 1 + Math.floor(Math.random() * 2));

      const transcription = `[Agente]: Bom dia, obrigado por ligar. Em que posso ajudar?
[Cliente]: Olá, gostaria de saber mais sobre os vossos serviços.
[Agente]: Claro, terei todo o gosto em ajudar. Que tipo de serviço procura?
[Cliente]: Estou interessado no plano empresarial.
[Agente]: Excelente escolha. O plano empresarial inclui várias funcionalidades...
[Cliente]: E qual é o preço?
[Agente]: O investimento mensal é de 49,90€, mas temos uma promoção especial...
[Cliente]: Parece interessante. Vou pensar.
[Agente]: Compreendo. Posso enviar-lhe toda a informação por email?
[Cliente]: Sim, por favor.
[Agente]: Perfeito. Há mais alguma questão em que possa ajudar?
[Cliente]: Não, obrigado.
[Agente]: Agradeço o seu contacto. Tenha um excelente dia!`;

      const { data: newCall, error } = await supabase
        .from('calls')
        .insert({
          company_id: company.id,
          agent_id: agent.id,
          phone_number: phoneNumbers[i % phoneNumbers.length],
          direction: directions[Math.floor(Math.random() * directions.length)],
          duration_seconds: 120 + Math.floor(Math.random() * 480),
          call_date: callDate.toISOString(),
          transcription,
          summary: summaries[i % summaries.length],
          next_step_recommendation: nextSteps[i % nextSteps.length],
          final_score: score,
          score_justification: 'Avaliação baseada em critérios de qualidade de atendimento.',
          what_went_well: JSON.stringify(contactReasons),
          what_went_wrong: JSON.stringify(objections),
          risk_words_detected: JSON.stringify(i % 4 === 0 ? ['cancelar'] : []),
          phrases_to_avoid: JSON.stringify(phrasesToAvoidOptions[i % phrasesToAvoidOptions.length]),
          recommended_phrases: JSON.stringify(recommendedPhrasesOptions[i % recommendedPhrasesOptions.length]),
          response_improvement_example: JSON.stringify(responseExample),
          top_performer_comparison: JSON.stringify(topPerformerComparison),
          skill_scores: JSON.stringify(skillScores)
        })
        .select('id')
        .single();

      if (error) {
        console.error('[n8n] Error creating test call:', error);
      } else if (newCall) {
        createdCalls.push(newCall.id);
      }
    }

    res.json({
      success: true,
      message: `Created ${createdCalls.length} test calls with full AI coaching data`,
      callIds: createdCalls
    });
  } catch (error) {
    console.error('[n8n] Error generating test calls:', error);
    res.status(500).json({ error: 'Failed to generate test calls' });
  }
});

/**
 * Generate test users with different categories and calls
 * POST /api/n8n/generate-test-users-and-calls
 */
router.post('/generate-test-users-and-calls', async (req: Request, res: Response) => {
  try {
    const { userCount = 20, callCount = 30 } = req.body;

    // Get company
    const { data: company } = await supabase.from('companies').select('id').limit(1).single();
    if (!company) {
      return res.status(500).json({ error: 'No company found' });
    }

    // Define user names and categories
    const userNames = [
      { name: 'Ana Silva', username: 'ana.silva' },
      { name: 'Bruno Costa', username: 'bruno.costa' },
      { name: 'Carla Ferreira', username: 'carla.ferreira' },
      { name: 'Daniel Santos', username: 'daniel.santos' },
      { name: 'Eva Martins', username: 'eva.martins' },
      { name: 'Fernando Oliveira', username: 'fernando.oliveira' },
      { name: 'Gabriela Pereira', username: 'gabriela.pereira' },
      { name: 'Hugo Rodrigues', username: 'hugo.rodrigues' },
      { name: 'Inês Almeida', username: 'ines.almeida' },
      { name: 'João Sousa', username: 'joao.sousa' },
      { name: 'Katia Lopes', username: 'katia.lopes' },
      { name: 'Luis Fernandes', username: 'luis.fernandes' },
      { name: 'Maria Gomes', username: 'maria.gomes' },
      { name: 'Nuno Ribeiro', username: 'nuno.ribeiro' },
      { name: 'Olga Carvalho', username: 'olga.carvalho' },
      { name: 'Pedro Teixeira', username: 'pedro.teixeira' },
      { name: 'Raquel Mendes', username: 'raquel.mendes' },
      { name: 'Sérgio Nunes', username: 'sergio.nunes' },
      { name: 'Teresa Pinto', username: 'teresa.pinto' },
      { name: 'Vitor Moreira', username: 'vitor.moreira' }
    ];

    const categories = ['Comercial', 'Suporte', 'Técnico', 'Retenção', 'Premium'];
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('test123', 10);

    // Create users
    const createdUsers: { id: number; name: string; category: string }[] = [];

    for (let i = 0; i < Math.min(userCount, userNames.length); i++) {
      const category = categories[i % categories.length];
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          company_id: company.id,
          username: userNames[i].username,
          password_hash: passwordHash,
          role: 'agent',
          custom_role_name: category,
          display_name: userNames[i].name,
          language_preference: 'pt',
          theme_preference: 'light'
        })
        .select('id')
        .single();

      if (error) {
        console.error(`[n8n] Error creating user ${userNames[i].username}:`, error.message);
      } else if (newUser) {
        createdUsers.push({ id: newUser.id, name: userNames[i].name, category });
      }
    }

    if (createdUsers.length === 0) {
      return res.status(500).json({ error: 'No users were created' });
    }

    // Now create calls distributed among users
    const directions = ['inbound', 'outbound', 'meeting'];
    const phoneNumbers = [
      '+351912345678', '+351923456789', '+351934567890', '+351945678901',
      '+351956789012', '+351967890123', '+351978901234', '+351989012345',
      '+351990123456', '+351901234567', '+351912111222', '+351923222333',
      '+351934333444', '+351945444555', '+351956555666', '+351967666777',
      '+351978777888', '+351989888999', '+351990999000', '+351901000111',
      '+351911222333', '+351922333444', '+351933444555', '+351944555666',
      '+351955666777', '+351966777888', '+351977888999', '+351988999000',
      '+351999000111', '+351900111222'
    ];

    const summaries = [
      'Cliente ligou para pedir informações sobre o novo plano de dados. Demonstrou interesse em mudar de operadora.',
      'Chamada de acompanhamento pós-venda. Cliente satisfeito com o produto adquirido.',
      'Reclamação sobre fatura incorreta. Situação resolvida com crédito na próxima fatura.',
      'Pedido de cancelamento. Cliente retido com oferta de desconto de 30%.',
      'Dúvidas sobre instalação do equipamento. Agendada visita técnica.',
      'Reunião de apresentação de proposta comercial para empresa.',
      'Cliente interessado em upgrade de serviço. Proposta enviada por email.',
      'Suporte técnico - problema de conectividade resolvido remotamente.',
      'Negociação de contrato anual. Fechamento previsto para próxima semana.',
      'Chamada de boas-vindas a novo cliente. Explicação dos serviços incluídos.',
      'Pedido de alteração de dados cadastrais. Atualização efetuada com sucesso.',
      'Consulta sobre promoções ativas. Cliente aderiu à oferta especial.',
      'Problema com equipamento. Agendada troca por novo dispositivo.',
      'Pedido de segunda via de fatura. Enviada por email.',
      'Reclamação sobre atendimento anterior. Situação esclarecida e resolvida.'
    ];

    const nextSteps = [
      'Enviar proposta comercial por email até amanhã',
      'Agendar visita técnica para instalação',
      'Aguardar confirmação do cliente sobre upgrade',
      'Fazer follow-up em 3 dias úteis',
      'Preparar contrato para assinatura',
      'Enviar documentação adicional solicitada',
      'Confirmar agendamento da reunião presencial',
      'Aguardar pagamento para ativar serviço',
      'Contactar gestor de conta para aprovação',
      'Verificar disponibilidade de stock',
      'Ligar novamente na próxima semana',
      'Enviar link de pagamento por SMS',
      'Agendar chamada de acompanhamento',
      'Escalar situação para supervisor',
      'Aguardar resposta do departamento técnico'
    ];

    const phrasesToAvoidOptions = [
      ['Isso não é possível', 'Não podemos fazer nada', 'Esse é o procedimento'],
      ['Vou ter que transferir', 'Não sei', 'Isso é com outro departamento'],
      ['Infelizmente não', 'É política da empresa', 'Não há nada a fazer'],
      ['Tem que esperar', 'Não é da minha responsabilidade', 'Ligue mais tarde']
    ];

    const recommendedPhrasesOptions = [
      ['Compreendo a sua situação', 'Vou resolver isso agora', 'Posso ajudá-lo com isso'],
      ['Deixe-me verificar as opções disponíveis', 'Tenho uma solução para si', 'Agradeço a sua paciência'],
      ['Vou acompanhar pessoalmente este caso', 'Qual seria a melhor solução para si?', 'Posso fazer isso por si'],
      ['É uma excelente pergunta', 'Vou garantir que fica resolvido', 'Está tudo esclarecido?']
    ];

    const skillNames = ['Escuta Ativa', 'Clareza', 'Objeções', 'Fecho', 'Empatia'];

    const insights = [
      'Melhorar tempo de resposta às objeções do cliente',
      'Excelente capacidade de criar rapport',
      'Reforçar técnicas de fecho de venda',
      'Demonstra boa escuta ativa',
      'Pode melhorar na clareza das explicações técnicas',
      'Boa gestão emocional em situações difíceis',
      'Necessita praticar mais perguntas abertas',
      'Muito bom a identificar necessidades do cliente'
    ];

    const whatWentWellOptions = [
      [
        { text: 'Saudação profissional e cordial', timestamp: '00:15' },
        { text: 'Identificou corretamente a necessidade do cliente', timestamp: '01:30' },
        { text: 'Ofereceu solução adequada', timestamp: '03:45' }
      ],
      [
        { text: 'Demonstrou empatia com o cliente', timestamp: '00:45' },
        { text: 'Explicação clara dos produtos', timestamp: '02:20' },
        { text: 'Fecho de venda eficaz', timestamp: '05:10' }
      ],
      [
        { text: 'Escuta ativa durante toda a chamada', timestamp: '01:00' },
        { text: 'Tratou objeções com calma', timestamp: '03:30' },
        { text: 'Definiu próximo passo claro', timestamp: '06:00' }
      ]
    ];

    const whatWentWrongOptions = [
      [
        { text: 'Demorou a identificar o problema', timestamp: '02:00' },
        { text: 'Faltou confirmar dados do cliente', timestamp: '04:30' }
      ],
      [
        { text: 'Interrompeu o cliente várias vezes', timestamp: '01:45' },
        { text: 'Não ofereceu alternativas', timestamp: '03:20' }
      ],
      [
        { text: 'Tom de voz pouco entusiástico', timestamp: '00:30' },
        { text: 'Não resumiu os pontos acordados', timestamp: '05:45' }
      ]
    ];

    const createdCalls: number[] = [];

    for (let i = 0; i < callCount; i++) {
      const agent = createdUsers[i % createdUsers.length];
      const score = Math.round((5 + Math.random() * 5) * 10) / 10;
      const daysAgo = Math.floor(Math.random() * 30);
      const callDate = new Date();
      callDate.setDate(callDate.getDate() - daysAgo);

      const skillScores = skillNames.map(name => ({
        name,
        score: Math.round((4 + Math.random() * 6) * 10) / 10,
        description: `Avaliação de ${name.toLowerCase()} nesta chamada`
      }));

      const responseExample = {
        before: 'Isso não é possível fazer, é política da empresa.',
        after: 'Compreendo a sua situação. Deixe-me verificar que alternativas temos disponíveis para si.',
        context: 'Quando o cliente pediu uma exceção à política de devolução'
      };

      const topPerformerComparison = {
        agent_score: score,
        top_performer_score: Math.round((8 + Math.random() * 2) * 10) / 10,
        gap: Math.round((score - 9) * 10) / 10,
        insights: [
          insights[Math.floor(Math.random() * insights.length)],
          insights[Math.floor(Math.random() * insights.length)]
        ]
      };

      const transcription = `[${agent.name}]: Bom dia, obrigado por ligar para a ${agent.category}. Em que posso ajudar?
[Cliente]: Olá, gostaria de saber mais sobre os vossos serviços.
[${agent.name}]: Claro, terei todo o gosto em ajudar. Que tipo de serviço procura?
[Cliente]: Estou interessado no plano empresarial.
[${agent.name}]: Excelente escolha. O plano empresarial inclui várias funcionalidades...
[Cliente]: E qual é o preço?
[${agent.name}]: O investimento mensal é de 49,90€, mas temos uma promoção especial...
[Cliente]: Parece interessante. Vou pensar.
[${agent.name}]: Compreendo. Posso enviar-lhe toda a informação por email?
[Cliente]: Sim, por favor.
[${agent.name}]: Perfeito. Há mais alguma questão em que possa ajudar?
[Cliente]: Não, obrigado.
[${agent.name}]: Agradeço o seu contacto. Tenha um excelente dia!`;

      const { data: newCall, error } = await supabase
        .from('calls')
        .insert({
          company_id: company.id,
          agent_id: agent.id,
          phone_number: phoneNumbers[i % phoneNumbers.length],
          direction: directions[Math.floor(Math.random() * directions.length)],
          duration_seconds: 120 + Math.floor(Math.random() * 480),
          call_date: callDate.toISOString(),
          transcription,
          summary: summaries[i % summaries.length],
          next_step_recommendation: nextSteps[i % nextSteps.length],
          final_score: score,
          score_justification: 'Avaliação baseada em critérios de qualidade de atendimento.',
          what_went_well: JSON.stringify(whatWentWellOptions[i % whatWentWellOptions.length]),
          what_went_wrong: JSON.stringify(whatWentWrongOptions[i % whatWentWrongOptions.length]),
          risk_words_detected: JSON.stringify(i % 5 === 0 ? ['cancelar'] : []),
          phrases_to_avoid: JSON.stringify(phrasesToAvoidOptions[i % phrasesToAvoidOptions.length]),
          recommended_phrases: JSON.stringify(recommendedPhrasesOptions[i % recommendedPhrasesOptions.length]),
          response_improvement_example: JSON.stringify(responseExample),
          top_performer_comparison: JSON.stringify(topPerformerComparison),
          skill_scores: JSON.stringify(skillScores)
        })
        .select('id')
        .single();

      if (error) {
        console.error('[n8n] Error creating test call:', error);
      } else if (newCall) {
        createdCalls.push(newCall.id);
      }
    }

    res.json({
      success: true,
      message: `Created ${createdUsers.length} users and ${createdCalls.length} calls`,
      users: createdUsers.map(u => ({ id: u.id, name: u.name, category: u.category })),
      callIds: createdCalls
    });
  } catch (error) {
    console.error('[n8n] Error generating test users and calls:', error);
    res.status(500).json({ error: 'Failed to generate test users and calls' });
  }
});

/**
 * Fix existing calls - match agent_id by phone number
 * POST /api/n8n/fix-call-agents
 *
 * This will update all calls to match the correct agent based on phone_number
 */
router.post('/fix-call-agents', async (req: Request, res: Response) => {
  try {
    console.log('[n8n] Starting to fix call agents by phone number...');

    // Get all calls
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id, phone_number, company_id, agent_id');

    if (callsError) throw callsError;

    if (!calls || calls.length === 0) {
      return res.json({ message: 'No calls found', updated: 0 });
    }

    // Get all users with phone numbers
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, phone_number, company_id')
      .not('phone_number', 'is', null);

    if (usersError) throw usersError;

    // Create a map of phone_number -> user for quick lookup
    const phoneToUser = new Map<string, { id: number; company_id: number }>();
    if (users) {
      for (const user of users) {
        if (user.phone_number) {
          const normalizedPhone = user.phone_number.trim().replace(/\s+/g, '');
          phoneToUser.set(normalizedPhone, { id: user.id, company_id: user.company_id });
        }
      }
    }

    console.log('[n8n] Found', phoneToUser.size, 'users with phone numbers');

    let updated = 0;
    let notFound = 0;
    const details: { callId: number; phoneNumber: string; newAgentId: number | null; status: string }[] = [];

    for (const call of calls) {
      if (!call.phone_number) continue;

      const normalizedPhone = call.phone_number.trim().replace(/\s+/g, '');
      const matchedUser = phoneToUser.get(normalizedPhone);

      if (matchedUser) {
        // Found a matching user - update if different
        if (call.agent_id !== matchedUser.id) {
          const { error: updateError } = await supabase
            .from('calls')
            .update({ agent_id: matchedUser.id })
            .eq('id', call.id);

          if (!updateError) {
            updated++;
            details.push({
              callId: call.id,
              phoneNumber: call.phone_number,
              newAgentId: matchedUser.id,
              status: 'updated'
            });
            console.log(`[n8n] Updated call ${call.id}: ${call.phone_number} -> agent ${matchedUser.id}`);
          }
        }
      } else {
        // No matching user found - set agent_id to null
        if (call.agent_id !== null) {
          const { error: updateError } = await supabase
            .from('calls')
            .update({ agent_id: null })
            .eq('id', call.id);

          if (!updateError) {
            notFound++;
            details.push({
              callId: call.id,
              phoneNumber: call.phone_number,
              newAgentId: null,
              status: 'no_match'
            });
            console.log(`[n8n] Call ${call.id}: ${call.phone_number} -> no matching user (set to null)`);
          }
        }
      }
    }

    console.log(`[n8n] Fix complete: ${updated} updated, ${notFound} set to null`);

    res.json({
      message: 'Call agents fixed',
      totalCalls: calls.length,
      updated,
      noMatchFound: notFound,
      usersWithPhones: phoneToUser.size,
      details
    });

  } catch (error) {
    console.error('[n8n] Error fixing call agents:', error);
    res.status(500).json({ error: 'Failed to fix call agents' });
  }
});

export default router;
