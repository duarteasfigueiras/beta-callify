import { Router, Request, Response } from 'express';
import { dbGet } from '../db/database';
import { processCall, simulateTwilioWebhook } from '../services/callProcessor';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

/**
 * Twilio webhook endpoint
 * Receives call recording events from Twilio
 *
 * Expected payload:
 * - CallSid: Twilio call SID
 * - From: Caller phone number
 * - To: Called phone number
 * - Direction: inbound or outbound-api
 * - CallDuration: Duration in seconds
 * - RecordingUrl: URL to the recording file
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
      AccountSid
    } = req.body;

    // Validate Twilio signature (in production, verify with Twilio SDK)
    // const twilioSignature = req.headers['x-twilio-signature'];
    // if (!validateTwilioSignature(twilioSignature, req.originalUrl, req.body)) {
    //   return res.status(403).json({ error: 'Invalid signature' });
    // }

    // Find company by Twilio Account SID or use default company
    // In production, map AccountSid to company
    const company = await dbGet<{ id: number }>(
      'SELECT id FROM companies LIMIT 1'
    );

    if (!company) {
      console.error('[Webhook] No company found');
      return res.status(500).json({ error: 'No company configured' });
    }

    // Find an agent to assign the call to
    // In production, map phone number To to specific agent
    const agent = await dbGet<{ id: number }>(
      'SELECT id FROM users WHERE company_id = ? AND role = ? LIMIT 1',
      [company.id, 'agent']
    );

    if (!agent) {
      console.error('[Webhook] No agent found for company:', company.id);
      return res.status(500).json({ error: 'No agent found' });
    }

    // Process the call
    const result = await processCall({
      companyId: company.id,
      agentId: agent.id,
      phoneNumber: From || '+351000000000',
      direction: Direction === 'outbound-api' ? 'outbound' : 'inbound',
      durationSeconds: parseInt(CallDuration) || 120,
      audioUrl: RecordingUrl,
      callSid: CallSid
    });

    console.log('[Webhook] Call processed successfully:', result.callId);

    // Twilio expects TwiML response or empty 200
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    console.error('[Webhook] Error processing Twilio webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * Telnyx webhook endpoint
 * Receives call recording events from Telnyx
 *
 * Expected payload:
 * - data.payload.call_control_id: Telnyx call ID
 * - data.payload.from: Caller phone number
 * - data.payload.to: Called phone number
 * - data.payload.direction: inbound or outgoing
 * - data.payload.call_duration_secs: Duration in seconds
 * - data.payload.recording_urls.mp3: URL to the recording
 */
router.post('/telnyx', async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received Telnyx webhook:', JSON.stringify(req.body, null, 2));

    const payload = req.body.data?.payload || req.body;

    const {
      call_control_id,
      from,
      to,
      direction,
      call_duration_secs,
      recording_urls
    } = payload;

    // Find company (in production, map Telnyx account to company)
    const company = await dbGet<{ id: number }>(
      'SELECT id FROM companies LIMIT 1'
    );

    if (!company) {
      console.error('[Webhook] No company found');
      return res.status(500).json({ error: 'No company configured' });
    }

    // Find an agent
    const agent = await dbGet<{ id: number }>(
      'SELECT id FROM users WHERE company_id = ? AND role = ? LIMIT 1',
      [company.id, 'agent']
    );

    if (!agent) {
      console.error('[Webhook] No agent found for company:', company.id);
      return res.status(500).json({ error: 'No agent found' });
    }

    // Process the call
    const result = await processCall({
      companyId: company.id,
      agentId: agent.id,
      phoneNumber: from || '+351000000000',
      direction: direction === 'outgoing' ? 'outbound' : 'inbound',
      durationSeconds: parseInt(call_duration_secs) || 120,
      audioUrl: recording_urls?.mp3,
      callId: call_control_id
    });

    console.log('[Webhook] Call processed successfully:', result.callId);

    res.status(200).json({ success: true, callId: result.callId });
  } catch (error) {
    console.error('[Webhook] Error processing Telnyx webhook:', error);
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
      const agent = await dbGet<{ id: number }>(
        'SELECT id FROM users WHERE company_id = ? AND role = ? LIMIT 1',
        [req.user!.companyId, 'agent']
      );
      if (agent) {
        targetAgentId = agent.id;
      } else {
        // Use current user if no agent found
        targetAgentId = req.user!.userId;
      }
    }

    // Process the simulated call
    // For developer users without a company, we need to get a company first
    let targetCompanyId = req.user!.companyId;
    if (!targetCompanyId) {
      const company = await dbGet<{ id: number }>('SELECT id FROM companies LIMIT 1');
      if (!company) {
        return res.status(400).json({ error: 'No company available for simulation' });
      }
      targetCompanyId = company.id;
    }

    const result = await simulateTwilioWebhook(
      targetCompanyId,
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
      telnyx: 'POST /api/webhooks/telnyx',
      simulate: 'POST /api/webhooks/simulate (requires auth)'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
