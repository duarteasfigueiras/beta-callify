import { Router, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db/database';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all alerts for the company
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, unread_only } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const isAdmin = req.user!.role === 'admin_manager';

    let whereClause = 'WHERE a.company_id = ?';
    const params: (string | number)[] = [req.user!.companyId];

    // Agents can only see their own alerts
    if (!isAdmin) {
      whereClause += ' AND a.agent_id = ?';
      params.push(req.user!.userId);
    }

    if (unread_only === 'true') {
      whereClause += ' AND a.is_read = 0';
    }

    // Get total count
    const countResult = await dbGet(
      `SELECT COUNT(*) as total FROM alerts a ${whereClause}`,
      params
    );
    const total = (countResult as { total: number }).total;

    // Get paginated alerts
    const alerts = await dbAll(
      `SELECT a.*, u.username as agent_username, c.phone_number
       FROM alerts a
       LEFT JOIN users u ON a.agent_id = u.id
       LEFT JOIN calls c ON a.call_id = c.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      data: alerts,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
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
    const isAdmin = req.user!.role === 'admin_manager';

    // Verify the alert exists and belongs to the company
    let query = 'SELECT id FROM alerts WHERE id = ? AND company_id = ?';
    const params: (string | number)[] = [alertId, req.user!.companyId];

    if (!isAdmin) {
      query += ' AND agent_id = ?';
      params.push(req.user!.userId);
    }

    const alert = await dbGet(query, params);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await dbRun('UPDATE alerts SET is_read = 1 WHERE id = ?', [alertId]);

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
    const existingAlerts = await dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM alerts WHERE company_id = ?',
      [req.user!.companyId]
    );

    if (existingAlerts && existingAlerts.count > 0) {
      return res.json({ message: 'Alerts already exist', count: existingAlerts.count });
    }

    // Get an agent from the company
    const agent = await dbGet<{ id: number }>(
      'SELECT id FROM users WHERE company_id = ? AND role = ?',
      [req.user!.companyId, 'agent']
    );

    if (!agent) {
      return res.status(400).json({ error: 'No agent found to assign alerts to' });
    }

    // Get some calls to create alerts for
    const calls = await dbAll<{ id: number; final_score: number; phone_number: string }>(
      `SELECT id, final_score, phone_number FROM calls
       WHERE company_id = ?
       ORDER BY call_date DESC
       LIMIT 5`,
      [req.user!.companyId]
    );

    if (calls.length === 0) {
      return res.status(400).json({ error: 'No calls found to create alerts for' });
    }

    // Create sample alerts
    const alertTypes = [
      { type: 'low_score', message: 'Chamada com pontuacao abaixo de 5.0. Requer atencao.' },
      { type: 'risk_words', message: 'Palavras de risco detetadas: cancelar, insatisfeito' },
      { type: 'long_duration', message: 'Chamada com duracao excessiva (>5 min)' },
      { type: 'no_next_step', message: 'Proximo passo nao definido na chamada' }
    ];

    let createdCount = 0;
    for (let i = 0; i < Math.min(calls.length, alertTypes.length); i++) {
      const call = calls[i];
      const alertType = alertTypes[i];

      await dbRun(
        `INSERT INTO alerts (company_id, call_id, agent_id, type, message, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, datetime('now', '-' || ? || ' days'))`,
        [req.user!.companyId, call.id, agent.id, alertType.type, alertType.message, i]
      );
      createdCount++;
    }

    res.json({ message: 'Sample alerts created', count: createdCount });
  } catch (error) {
    console.error('Error seeding alerts:', error);
    res.status(500).json({ error: 'Failed to seed alerts' });
  }
});

export default router;
