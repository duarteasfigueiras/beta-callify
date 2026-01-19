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
    const pageNum = Number(page);
    const limitNum = Number(limit);
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

export default router;
