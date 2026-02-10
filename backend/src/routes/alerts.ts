import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { isDeveloper, isAdminOrDeveloper } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all alerts for the company
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, unread_only, company_id } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const isAdmin = isAdminOrDeveloper(req.user!.role);

    // Build query - don't join with calls as there may not be a foreign key
    let query = supabase
      .from('alerts')
      .select('*, users!alerts_agent_id_fkey(username, display_name, custom_role_name), companies(name)', { count: 'exact' });

    // Developer sees all, admin sees company, agent sees own
    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    // Agents can only see their own alerts
    if (!isAdmin) {
      query = query.eq('agent_id', req.user!.userId);
    }

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

    const { data: alerts, count: total, error } = await query;

    if (error) throw error;

    // Transform the data
    const transformedAlerts = (alerts || []).map((alert: any) => ({
      ...alert,
      agent_username: alert.users?.username || null,
      agent_name: alert.users?.display_name || alert.users?.username || null,
      agent_custom_role_name: alert.users?.custom_role_name || null,
      company_name: alert.companies?.name || null,
      users: undefined,
      companies: undefined
    }));

    res.json({
      data: transformedAlerts,
      total: total || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((total || 0) / limitNum)
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Mark alert as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);
    const isAdmin = isAdminOrDeveloper(req.user!.role);

    // Build query to verify the alert
    let query = supabase
      .from('alerts')
      .select('id')
      .eq('id', alertId);

    // Developer can mark any alert as read
    if (!isDeveloper(req.user!.role)) {
      query = query.eq('company_id', req.user!.companyId);
    }

    if (!isAdmin) {
      query = query.eq('agent_id', req.user!.userId);
    }

    const { data: alert } = await query.single();

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (error) throw error;

    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

// Seed sample alerts (admin only) - for testing
router.post('/seed', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if alerts already exist
    const { count } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', req.user!.companyId);

    if (count && count > 0) {
      return res.json({ message: 'Alerts already exist', count });
    }

    // Get an agent from the company
    const { data: agent } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', req.user!.companyId)
      .eq('role', 'agent')
      .single();

    if (!agent) {
      return res.status(400).json({ error: 'No agent found to assign alerts to' });
    }

    // Get some calls to create alerts for
    const { data: calls } = await supabase
      .from('calls')
      .select('id, final_score, phone_number')
      .eq('company_id', req.user!.companyId)
      .order('call_date', { ascending: false })
      .limit(5);

    if (!calls || calls.length === 0) {
      return res.status(400).json({ error: 'No calls found to create alerts for' });
    }

    // Create sample alerts
    const alertTypes = [
      { type: 'low_score', message: 'Chamada com pontuação abaixo de 5.0. Requer atenção.' },
      { type: 'risk_words', message: 'Palavras de risco detetadas: cancelar, insatisfeito' },
      { type: 'long_duration', message: 'Chamada com duração excessiva (>5 min)' },
      { type: 'no_next_step', message: 'Próximo passo não definido na chamada' }
    ];

    let createdCount = 0;
    for (let i = 0; i < Math.min(calls.length, alertTypes.length); i++) {
      const call = calls[i];
      const alertType = alertTypes[i];

      await supabase.from('alerts').insert({
        company_id: req.user!.companyId,
        call_id: call.id,
        agent_id: agent.id,
        type: alertType.type,
        message: alertType.message,
        is_read: false
      });
      createdCount++;
    }

    res.json({ message: 'Sample alerts created', count: createdCount });
  } catch (error) {
    console.error('Error seeding alerts:', error);
    res.status(500).json({ error: 'Failed to seed alerts' });
  }
});

// Generate alerts from existing calls based on alert_settings (admin only)
router.post('/generate', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    // Get alert settings for the company (or use defaults)
    const { data: alertSettings } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();

    // Get thresholds from settings
    const lowScoreThreshold = alertSettings?.low_score_threshold || 5.0;
    const longDurationMinutes = alertSettings?.long_duration_threshold_minutes || 30;
    const longDurationThreshold = longDurationMinutes * 60; // Convert to seconds

    // Get enabled flags
    const lowScoreEnabled = alertSettings?.low_score_enabled ?? true;
    const riskWordsEnabled = alertSettings?.risk_words_enabled ?? true;
    const longDurationEnabled = alertSettings?.long_duration_enabled ?? true;
    const noNextStepEnabled = alertSettings?.no_next_step_enabled ?? true;

    // Get all calls from the company
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id, agent_id, final_score, duration_seconds, next_step_recommendation, risk_words_detected')
      .eq('company_id', companyId);

    if (callsError) throw callsError;

    if (!calls || calls.length === 0) {
      return res.json({ message: 'No calls found to analyze', alertsCreated: 0 });
    }

    // Delete existing alerts for this company to avoid duplicates
    await supabase.from('alerts').delete().eq('company_id', companyId);

    const alertsToInsert: any[] = [];

    for (const call of calls) {
      // Check for low score
      if (lowScoreEnabled && call.final_score !== null && call.final_score < lowScoreThreshold) {
        alertsToInsert.push({
          company_id: companyId,
          call_id: call.id,
          agent_id: call.agent_id,
          type: 'low_score',
          message: `Chamada com pontuação baixa: ${call.final_score.toFixed(1)}/10. Necessita revisão.`,
          is_read: false
        });
      }

      // Check for risk words
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
            company_id: companyId,
            call_id: call.id,
            agent_id: call.agent_id,
            type: 'risk_words',
            message: `Palavras de risco detetadas: ${riskWords.slice(0, 5).join(', ')}`,
            is_read: false
          });
        }
      }

      // Check for long duration
      if (longDurationEnabled && call.duration_seconds && call.duration_seconds > longDurationThreshold) {
        const minutes = Math.floor(call.duration_seconds / 60);
        alertsToInsert.push({
          company_id: companyId,
          call_id: call.id,
          agent_id: call.agent_id,
          type: 'long_duration',
          message: `Chamada com duração excessiva: ${minutes} minutos.`,
          is_read: false
        });
      }

      // Check for no next step
      if (noNextStepEnabled && (!call.next_step_recommendation || call.next_step_recommendation.trim() === '')) {
        alertsToInsert.push({
          company_id: companyId,
          call_id: call.id,
          agent_id: call.agent_id,
          type: 'no_next_step',
          message: 'Próximo passo não definido na chamada.',
          is_read: false
        });
      }
    }

    if (alertsToInsert.length === 0) {
      return res.json({
        message: 'No alerts to create based on current criteria',
        alertsCreated: 0,
        callsAnalyzed: calls.length
      });
    }

    // Insert alerts
    const { error: insertError } = await supabase.from('alerts').insert(alertsToInsert);
    if (insertError) throw insertError;

    // Count by type
    const summary: Record<string, number> = {};
    alertsToInsert.forEach(alert => {
      summary[alert.type] = (summary[alert.type] || 0) + 1;
    });

    res.json({
      message: `Generated ${alertsToInsert.length} alerts`,
      alertsCreated: alertsToInsert.length,
      callsAnalyzed: calls.length,
      byType: summary,
      settings: {
        lowScoreThreshold,
        longDurationMinutes,
        lowScoreEnabled,
        riskWordsEnabled,
        longDurationEnabled,
        noNextStepEnabled
      }
    });
  } catch (error) {
    console.error('Error generating alerts:', error);
    res.status(500).json({ error: 'Failed to generate alerts' });
  }
});

export default router;
