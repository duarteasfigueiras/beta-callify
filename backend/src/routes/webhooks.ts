import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { processCall, simulateTwilioWebhook } from '../services/callProcessor';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

/**
 * Determine call direction from Twilio webhook data
 * - 'inbound': Call received on your Twilio number from external caller
 * - 'outbound': Call initiated via Twilio API to external number
 * - 'meeting': Conference call or call between two internal numbers
 */
function determineCallDirection(
  twilioDirection: string,
  from: string,
  to: string,
  isConference?: boolean
): 'inbound' | 'outbound' | 'meeting' {
  // Conference calls are meetings
  if (isConference) {
    return 'meeting';
  }

  // Twilio direction values:
  // - 'inbound': Someone called your Twilio number
  // - 'outbound-api': You initiated a call via API
  // - 'outbound-dial': Call leg created by <Dial>

  if (twilioDirection === 'inbound') {
    return 'inbound';
  }

  if (twilioDirection === 'outbound-api' || twilioDirection === 'outbound-dial') {
    return 'outbound';
  }

  // Fallback: check if it looks like an internal call (both numbers are company numbers)
  // This would need company phone number configuration
  return 'inbound';
}

/**
 * Find agent by phone number
 * Matches the phone number (From for outbound, To for inbound) to an agent
 */
async function findAgentByPhone(
  companyId: number,
  phoneNumber: string,
  direction: 'inbound' | 'outbound' | 'meeting'
): Promise<{ id: number } | null> {
  // Normalize phone number (remove spaces, dashes)
  const normalizedPhone = phoneNumber?.replace(/[\s\-\(\)]/g, '');

  if (!normalizedPhone) {
    return null;
  }

  // Try to find agent by phone number
  const { data: agent } = await supabase
    .from('users')
    .select('id, phone_number')
    .eq('company_id', companyId)
    .eq('role', 'agent')
    .not('phone_number', 'is', null);

  if (agent && agent.length > 0) {
    // Find agent whose phone matches
    const matchedAgent = agent.find(a => {
      const agentPhone = a.phone_number?.replace(/[\s\-\(\)]/g, '');
      // Check various formats
      return agentPhone === normalizedPhone ||
             agentPhone === normalizedPhone.replace('+351', '') ||
             normalizedPhone === agentPhone?.replace('+351', '') ||
             normalizedPhone.endsWith(agentPhone || '') ||
             agentPhone?.endsWith(normalizedPhone);
    });

    if (matchedAgent) {
      return { id: matchedAgent.id };
    }
  }

  return null;
}

/**
 * Twilio webhook endpoint
 * Receives call recording events from Twilio
 *
 * Expected payload:
 * - CallSid: Twilio call SID
 * - From: Caller phone number
 * - To: Called phone number
 * - Direction: inbound, outbound-api, or outbound-dial
 * - CallDuration: Duration in seconds
 * - RecordingUrl: URL to the recording file
 * - StatusCallbackEvent: Type of event (e.g., 'recording-completed')
 * - ConferenceSid: Present if this is a conference call
 */
router.post('/twilio', async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received Twilio webhook:', JSON.stringify(req.body, null, 2));

    const {
      CallSid,
      From,
      To,
      Direction,
      CallDuration,
      RecordingUrl,
      AccountSid,
      ConferenceSid,
      // Recording-specific fields
      RecordingSid,
      RecordingStatus
    } = req.body;

    // Skip if this is just a status update, not a completed recording
    if (RecordingStatus && RecordingStatus !== 'completed') {
      console.log(`[Webhook] Skipping recording status: ${RecordingStatus}`);
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // Determine call direction automatically
    const isConference = !!ConferenceSid;
    const callDirection = determineCallDirection(Direction, From, To, isConference);

    console.log(`[Webhook] Call direction detected: ${callDirection} (Twilio: ${Direction}, Conference: ${isConference})`);

    // Find company by Twilio Account SID or use default company
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    if (!company) {
      console.error('[Webhook] No company found');
      return res.status(500).json({ error: 'No company configured' });
    }

    // Determine which phone number belongs to the agent based on direction
    // For inbound: the 'To' number is the agent's Twilio number, but we need to find agent by their personal phone
    // For outbound: the 'From' might be the agent's number
    // Best approach: check both numbers against agent phone numbers
    let agent = await findAgentByPhone(company.id, To, callDirection);
    if (!agent) {
      agent = await findAgentByPhone(company.id, From, callDirection);
    }

    // Fallback: get first available agent
    if (!agent) {
      const { data: fallbackAgent } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', company.id)
        .eq('role', 'agent')
        .limit(1)
        .single();

      if (fallbackAgent) {
        agent = fallbackAgent;
        console.log(`[Webhook] Using fallback agent: ${agent.id}`);
      }
    }

    if (!agent) {
      console.error('[Webhook] No agent found for company:', company.id);
      return res.status(500).json({ error: 'No agent found' });
    }

    // Determine the customer phone number based on direction
    // Inbound: customer is calling (From), agent receives (To)
    // Outbound: agent is calling (From), customer receives (To)
    const customerPhone = callDirection === 'inbound' ? From : To;

    // Process the call
    const result = await processCall({
      companyId: company.id,
      agentId: agent.id,
      phoneNumber: customerPhone || '+351000000000',
      direction: callDirection,
      durationSeconds: parseInt(CallDuration) || 0,
      audioUrl: RecordingUrl,
      callSid: CallSid
    });

    console.log(`[Webhook] Call processed: ID=${result.callId}, Direction=${callDirection}, Agent=${agent.id}`);

    // Twilio expects TwiML response or empty 200
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    console.error('[Webhook] Error processing Twilio webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * Simulation endpoint for testing
 * Allows testing the full call processing pipeline without external services
 *
 * POST /api/webhooks/simulate
 * Body: {
 *   phoneNumber: string (optional),
 *   durationSeconds: number (optional),
 *   agentId: number (optional)
 * }
 */
router.post('/simulate', authenticateToken, requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[Webhook] Received simulation request');

    const {
      phoneNumber = `+351${Math.floor(900000000 + Math.random() * 99999999)}`,
      durationSeconds = 180,
      agentId
    } = req.body;

    // Use provided agent or find one
    let targetAgentId = agentId;
    if (!targetAgentId) {
      const { data: agent } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', req.user!.companyId)
        .eq('role', 'agent')
        .limit(1)
        .single();

      if (agent) {
        targetAgentId = agent.id;
      } else {
        // Use current user if no agent found
        targetAgentId = req.user!.userId;
      }
    }

    // Process the simulated call
    // For developer users without a company, we need to get a company first
    let targetCompanyId: number | null = req.user!.companyId;
    if (!targetCompanyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      if (!company) {
        return res.status(400).json({ error: 'No company available for simulation' });
      }
      targetCompanyId = company.id;
    }

    const result = await simulateTwilioWebhook(
      targetCompanyId as number,
      targetAgentId,
      phoneNumber,
      durationSeconds
    );

    console.log('[Webhook] Simulation completed, call ID:', result.callId);

    res.status(201).json({
      success: true,
      message: 'Call simulation completed successfully',
      call: {
        id: result.callId,
        phoneNumber,
        durationSeconds,
        finalScore: result.finalScore,
        summary: result.summary,
        nextStep: result.nextStepRecommendation,
        riskWordsDetected: result.riskWordsDetected,
        alertsGenerated: result.alertsGenerated.length,
        criteriaEvaluated: result.criteriaResults.length,
        transcriptionLength: result.transcription.length
      }
    });
  } catch (error) {
    console.error('[Webhook] Error processing simulation:', error);
    res.status(500).json({ error: 'Failed to process simulation' });
  }
});

/**
 * Health check for webhooks
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    endpoints: {
      twilio: 'POST /api/webhooks/twilio',
      simulate: 'POST /api/webhooks/simulate (requires auth)'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
