import { dbRun, dbGet, dbAll } from '../db/database';
import path from 'path';
import fs from 'fs';

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
 * Helper to get agent's category from custom_role_name
 */
async function getAgentCategory(agentId: number): Promise<string | null> {
  const agent = await dbGet('SELECT custom_role_name FROM users WHERE id = ?', [agentId]);
  return agent?.custom_role_name || null;
}

interface CallData {
  companyId: number;
  agentId: number;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  durationSeconds: number;
  audioUrl?: string;
  audioFilePath?: string;
  callSid?: string; // Twilio call SID
  callId?: string;  // Generic external call ID
}

interface ProcessedCall {
  callId: number;
  transcription: string;
  transcriptionTimestamps: any[];
  summary: string;
  nextStepRecommendation: string;
  finalScore: number;
  scoreJustification: string;
  whatWentWell: any[];
  whatWentWrong: any[];
  riskWordsDetected: string[];
  criteriaResults: any[];
  alertsGenerated: any[];
}

/**
 * Download audio file from URL and store locally
 */
async function downloadAudio(audioUrl: string, callId: number): Promise<string | null> {
  try {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const audioDir = path.join(uploadDir, 'audio');

    // Ensure directory exists
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const filename = `call_${callId}_${Date.now()}.mp3`;
    const filePath = path.join(audioDir, filename);

    // In a real implementation, we would download from the URL
    // For now, we'll create a placeholder file
    // In production, use axios/fetch to download:
    // const response = await axios.get(audioUrl, { responseType: 'stream' });
    // response.data.pipe(fs.createWriteStream(filePath));

    console.log(`[CallProcessor] Would download audio from: ${audioUrl} to ${filePath}`);

    return `/uploads/audio/${filename}`;
  } catch (error) {
    console.error('[CallProcessor] Error downloading audio:', error);
    return null;
  }
}

/**
 * Transcribe audio using OpenAI Whisper API
 * Falls back to simulated transcription if API is not configured
 */
async function transcribeAudio(audioFilePath: string | null, durationSeconds: number): Promise<{ text: string; timestamps: any[] }> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (openaiApiKey && audioFilePath) {
    try {
      // In production, call Whisper API:
      // const formData = new FormData();
      // formData.append('file', fs.createReadStream(audioFilePath));
      // formData.append('model', 'whisper-1');
      // formData.append('response_format', 'verbose_json');
      // const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      //   headers: { 'Authorization': `Bearer ${openaiApiKey}`, ...formData.getHeaders() }
      // });
      console.log('[CallProcessor] Would transcribe audio with Whisper API');
    } catch (error) {
      console.error('[CallProcessor] Error calling Whisper API:', error);
    }
  }

  // Simulated transcription for demo/testing
  const simulatedTranscript = generateSimulatedTranscription(durationSeconds);
  return simulatedTranscript;
}

/**
 * Generate simulated transcription for demo purposes
 */
function generateSimulatedTranscription(durationSeconds: number): { text: string; timestamps: any[] } {
  const segments = [
    { speaker: 'Agent', text: 'Bom dia, obrigado por ligar para a Callify. O meu nome e Maria, em que posso ajudar?', time: '00:00' },
    { speaker: 'Client', text: 'Bom dia Maria. Estou a ligar porque tenho algumas duvidas sobre o vosso servico.', time: '00:08' },
    { speaker: 'Agent', text: 'Claro, terei todo o gosto em ajudar. Pode dizer-me o seu nome e qual e a sua duvida principal?', time: '00:15' },
    { speaker: 'Client', text: 'O meu nome e Joao Silva. Gostava de saber mais sobre os planos disponiveis e os precos.', time: '00:23' },
    { speaker: 'Agent', text: 'Muito bem Sr. Joao. Temos tres planos principais. O plano basico, o plano profissional e o plano empresarial.', time: '00:32' },
    { speaker: 'Client', text: 'E qual seria o mais indicado para uma pequena empresa com cerca de 10 funcionarios?', time: '00:45' },
    { speaker: 'Agent', text: 'Para uma empresa desse tamanho, recomendo o plano profissional. Inclui todas as funcionalidades essenciais e suporte prioritario.', time: '00:55' },
    { speaker: 'Client', text: 'Qual e o preco mensal?', time: '01:10' },
    { speaker: 'Agent', text: 'O plano profissional custa 49 euros por mes para ate 15 utilizadores. Incluindo todas as funcionalidades de analise e relatorios.', time: '01:15' },
    { speaker: 'Client', text: 'Parece interessante. Posso experimentar antes de decidir?', time: '01:30' },
    { speaker: 'Agent', text: 'Claro que sim! Oferecemos um periodo de teste gratuito de 14 dias com acesso completo a todas as funcionalidades.', time: '01:38' },
    { speaker: 'Client', text: 'Otimo, vou pensar e depois entro em contacto.', time: '01:50' },
    { speaker: 'Agent', text: 'Perfeito Sr. Joao. Posso enviar-lhe um email com mais informacoes e um link para comecar o teste gratuito?', time: '01:55' },
    { speaker: 'Client', text: 'Sim, pode enviar para joao.silva@exemplo.pt', time: '02:08' },
    { speaker: 'Agent', text: 'Anotado. Enviarei ainda hoje. Ha mais alguma questao em que possa ajudar?', time: '02:15' },
    { speaker: 'Client', text: 'Nao, por agora e tudo. Obrigado pela ajuda.', time: '02:25' },
    { speaker: 'Agent', text: 'Obrigada pela sua chamada Sr. Joao. Fico a aguardar o seu contacto. Tenha um otimo dia!', time: '02:30' },
    { speaker: 'Client', text: 'Igualmente, ate breve.', time: '02:40' },
  ];

  // Use only segments that fit within the call duration
  const usedSegments = segments.filter(s => {
    const [min, sec] = s.time.split(':').map(Number);
    return (min * 60 + sec) < durationSeconds;
  });

  const text = usedSegments.map(s => `[${s.speaker}]: ${s.text}`).join('\n');
  const timestamps = usedSegments.map(s => ({
    speaker: s.speaker,
    text: s.text,
    timestamp: s.time
  }));

  return { text, timestamps };
}

/**
 * Analyze call with GPT-4
 * Falls back to simulated analysis if API is not configured
 */
async function analyzeCall(
  transcription: string,
  criteria: any[],
  companyId: number
): Promise<{
  summary: string;
  nextStep: string;
  score: number;
  scoreJustification: string;
  whatWentWell: any[];
  whatWentWrong: any[];
  riskWords: string[];
  criteriaResults: any[];
}> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (openaiApiKey && transcription) {
    try {
      // In production, call GPT-4 API:
      // const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      //   model: 'gpt-4',
      //   messages: [
      //     { role: 'system', content: 'You are an expert call analyst...' },
      //     { role: 'user', content: `Analyze this call transcription: ${transcription}` }
      //   ]
      // }, { headers: { 'Authorization': `Bearer ${openaiApiKey}` } });
      console.log('[CallProcessor] Would analyze with GPT-4 API');
    } catch (error) {
      console.error('[CallProcessor] Error calling GPT-4 API:', error);
    }
  }

  // Simulated analysis for demo/testing
  return generateSimulatedAnalysis(transcription, criteria);
}

/**
 * Generate simulated analysis for demo purposes
 */
function generateSimulatedAnalysis(
  transcription: string,
  criteria: any[]
): {
  summary: string;
  nextStep: string;
  score: number;
  scoreJustification: string;
  whatWentWell: any[];
  whatWentWrong: any[];
  riskWords: string[];
  criteriaResults: any[];
} {
  // Detect risk words in transcription
  const textLower = transcription.toLowerCase();
  const detectedRiskWords = RISK_WORDS.filter(word => textLower.includes(word.toLowerCase()));

  // Generate criteria results based on transcription content
  const criteriaResults = criteria.map(criterion => {
    // Simulated evaluation - in production this would come from GPT-4
    const passed = Math.random() > 0.3; // 70% pass rate for demo
    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      passed,
      justification: passed
        ? `O agente demonstrou ${criterion.name.toLowerCase()} de forma adequada.`
        : `O agente poderia melhorar em ${criterion.name.toLowerCase()}.`,
      timestampReference: passed ? null : formatTimestamp(Math.floor(Math.random() * 180))
    };
  });

  // Calculate weighted score
  let totalWeight = 0;
  let weightedScore = 0;
  criteriaResults.forEach((result, index) => {
    const weight = criteria[index]?.weight || 1;
    totalWeight += weight;
    if (result.passed) {
      weightedScore += weight * 10; // 10 points for passing
    }
  });

  // Adjust score based on risk words
  let score = totalWeight > 0 ? (weightedScore / totalWeight) : 7.5;
  if (detectedRiskWords.length > 0) {
    score = Math.max(score - (detectedRiskWords.length * 0.5), 3.0);
  }
  score = Math.round(score * 10) / 10; // Round to 1 decimal

  // Generate what went well/wrong
  const whatWentWell = criteriaResults
    .filter(r => r.passed)
    .slice(0, 3)
    .map((r, i) => ({
      text: r.justification,
      timestamp: formatTimestamp(30 + i * 40)
    }));

  const whatWentWrong = criteriaResults
    .filter(r => !r.passed)
    .slice(0, 2)
    .map(r => ({
      text: r.justification,
      timestamp: r.timestampReference || formatTimestamp(90)
    }));

  return {
    summary: 'Chamada de informacao sobre servicos. Cliente mostrou interesse no plano profissional e foi oferecido periodo de teste gratuito.',
    nextStep: 'Enviar email com informacoes detalhadas e link para teste gratuito',
    score,
    scoreJustification: `Pontuacao baseada em ${criteriaResults.filter(r => r.passed).length}/${criteriaResults.length} criterios cumpridos.${detectedRiskWords.length > 0 ? ` Penalizacao por palavras de risco detetadas.` : ''}`,
    whatWentWell,
    whatWentWrong,
    riskWords: detectedRiskWords,
    criteriaResults
  };
}

/**
 * Format seconds to MM:SS
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate alerts based on call analysis
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
    const result = await dbRun(
      `INSERT INTO alerts (company_id, call_id, agent_id, type, message)
       VALUES (?, ?, ?, ?, ?)`,
      [companyId, callId, agentId, 'low_score', `Chamada com pontuacao baixa: ${score}. Requer atencao.`]
    );
    alerts.push({ id: result.lastID, type: 'low_score', message: `Pontuacao baixa: ${score}` });
  }

  // Risk words alert
  if (riskWords.length > 0) {
    const result = await dbRun(
      `INSERT INTO alerts (company_id, call_id, agent_id, type, message)
       VALUES (?, ?, ?, ?, ?)`,
      [companyId, callId, agentId, 'risk_words', `Palavras de risco detetadas: ${riskWords.join(', ')}`]
    );
    alerts.push({ id: result.lastID, type: 'risk_words', message: `Palavras: ${riskWords.join(', ')}` });
  }

  // Long duration alert
  if (durationSeconds > LONG_CALL_THRESHOLD_SECONDS) {
    const minutes = Math.round(durationSeconds / 60);
    const result = await dbRun(
      `INSERT INTO alerts (company_id, call_id, agent_id, type, message)
       VALUES (?, ?, ?, ?, ?)`,
      [companyId, callId, agentId, 'long_duration', `Chamada com duracao excessiva: ${minutes} minutos`]
    );
    alerts.push({ id: result.lastID, type: 'long_duration', message: `Duracao: ${minutes} minutos` });
  }

  // No next step alert
  if (!nextStep || nextStep.trim().length < 10) {
    const result = await dbRun(
      `INSERT INTO alerts (company_id, call_id, agent_id, type, message)
       VALUES (?, ?, ?, ?, ?)`,
      [companyId, callId, agentId, 'no_next_step', 'Proximo passo nao definido claramente na chamada']
    );
    alerts.push({ id: result.lastID, type: 'no_next_step', message: 'Proximo passo nao definido' });
  }

  return alerts;
}

/**
 * Main call processing function
 * Processes a call through the full pipeline:
 * 1. Download audio (if URL provided)
 * 2. Transcribe audio
 * 3. Analyze with AI
 * 4. Calculate score
 * 5. Evaluate criteria
 * 6. Generate alerts
 */
export async function processCall(callData: CallData): Promise<ProcessedCall> {
  console.log('[CallProcessor] Starting call processing for:', callData.phoneNumber);

  // Step 1: Create initial call record
  const callDate = new Date().toISOString();
  const result = await dbRun(
    `INSERT INTO calls (company_id, agent_id, phone_number, direction, duration_seconds, call_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [callData.companyId, callData.agentId, callData.phoneNumber, callData.direction, callData.durationSeconds, callDate]
  );
  const callId = result.lastID as number;
  if (!callId) {
    throw new Error('Failed to create call record - no ID returned');
  }
  console.log('[CallProcessor] Created call record:', callId);

  // Step 2: Download audio if URL provided
  let audioFilePath = callData.audioFilePath || null;
  if (callData.audioUrl && !audioFilePath) {
    audioFilePath = await downloadAudio(callData.audioUrl, callId);
    if (audioFilePath) {
      await dbRun('UPDATE calls SET audio_file_path = ? WHERE id = ?', [audioFilePath, callId]);
    }
  }
  console.log('[CallProcessor] Audio file path:', audioFilePath);

  // Step 3: Transcribe audio
  const { text: transcription, timestamps: transcriptionTimestamps } = await transcribeAudio(
    audioFilePath,
    callData.durationSeconds
  );
  console.log('[CallProcessor] Transcription completed, length:', transcription.length);

  // Step 4: Get agent's category and filter criteria accordingly (normalize to lowercase)
  const rawAgentCategory = await getAgentCategory(callData.agentId);
  const agentCategory = rawAgentCategory ? rawAgentCategory.toLowerCase() : null;
  console.log('[CallProcessor] Agent category:', agentCategory || 'none');

  let criteria;
  if (agentCategory) {
    // Get criteria that are either 'all' (global) or match the agent's category
    criteria = await dbAll(
      'SELECT * FROM criteria WHERE company_id = ? AND is_active = 1 AND (LOWER(category) = ? OR LOWER(category) = ?)',
      [callData.companyId, agentCategory, 'all']
    );
  } else {
    // No category - get all company criteria
    criteria = await dbAll(
      'SELECT * FROM criteria WHERE company_id = ? AND is_active = 1',
      [callData.companyId]
    );
  }
  console.log('[CallProcessor] Retrieved criteria (all + category):', criteria.length);

  // Step 5: Analyze call with AI
  const analysis = await analyzeCall(transcription, criteria, callData.companyId);
  console.log('[CallProcessor] Analysis completed, score:', analysis.score);

  // Step 6: Update call record with analysis results
  await dbRun(
    `UPDATE calls SET
      transcription = ?,
      transcription_timestamps = ?,
      summary = ?,
      next_step_recommendation = ?,
      final_score = ?,
      score_justification = ?,
      what_went_well = ?,
      what_went_wrong = ?,
      risk_words_detected = ?
     WHERE id = ?`,
    [
      transcription,
      JSON.stringify(transcriptionTimestamps),
      analysis.summary,
      analysis.nextStep,
      analysis.score,
      analysis.scoreJustification,
      JSON.stringify(analysis.whatWentWell),
      JSON.stringify(analysis.whatWentWrong),
      JSON.stringify(analysis.riskWords),
      callId
    ]
  );
  console.log('[CallProcessor] Call record updated with analysis');

  // Step 7: Save criteria evaluation results
  for (const criteriaResult of analysis.criteriaResults) {
    await dbRun(
      `INSERT INTO call_criteria_results (call_id, criterion_id, passed, justification, timestamp_reference)
       VALUES (?, ?, ?, ?, ?)`,
      [callId, criteriaResult.criterionId, criteriaResult.passed ? 1 : 0, criteriaResult.justification, criteriaResult.timestampReference]
    );
  }
  console.log('[CallProcessor] Criteria results saved:', analysis.criteriaResults.length);

  // Step 8: Generate alerts
  const alerts = await generateAlerts(
    callId,
    callData.companyId,
    callData.agentId,
    analysis.score,
    callData.durationSeconds,
    analysis.riskWords,
    analysis.nextStep
  );
  console.log('[CallProcessor] Alerts generated:', alerts.length);

  console.log('[CallProcessor] Call processing completed for call:', callId);

  return {
    callId,
    transcription,
    transcriptionTimestamps,
    summary: analysis.summary,
    nextStepRecommendation: analysis.nextStep,
    finalScore: analysis.score,
    scoreJustification: analysis.scoreJustification,
    whatWentWell: analysis.whatWentWell,
    whatWentWrong: analysis.whatWentWrong,
    riskWordsDetected: analysis.riskWords,
    criteriaResults: analysis.criteriaResults,
    alertsGenerated: alerts
  };
}

/**
 * Simulate a Twilio webhook call
 * Used for testing the full pipeline without actual Twilio integration
 */
export async function simulateTwilioWebhook(
  companyId: number,
  agentId: number,
  phoneNumber: string,
  durationSeconds: number = 180
): Promise<ProcessedCall> {
  return processCall({
    companyId,
    agentId,
    phoneNumber,
    direction: 'inbound',
    durationSeconds,
    callSid: `SIMULATED_${Date.now()}`
  });
}
