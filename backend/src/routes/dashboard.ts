import { Router, Response } from 'express';
import { dbAll, dbGet } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard overview stats
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date_from, date_to } = req.query;
    const isAdmin = req.user!.role === 'admin_manager';

    let dateFilter = '';
    const params: (string | number)[] = [req.user!.company_id];

    if (date_from) {
      dateFilter += ' AND c.call_date >= ?';
      params.push(String(date_from));
    }
    if (date_to) {
      dateFilter += ' AND c.call_date <= ?';
      params.push(String(date_to));
    }

    // For agents, only show their own stats
    let agentFilter = '';
    if (!isAdmin) {
      agentFilter = ' AND c.agent_id = ?';
      params.push(req.user!.id);
    }

    // Total calls
    const totalCallsResult = await dbGet(
      `SELECT COUNT(*) as total FROM calls c
       WHERE c.company_id = ?${agentFilter}${dateFilter}`,
      params
    );
    const totalCalls = (totalCallsResult as { total: number })?.total || 0;

    // Average score
    const avgScoreResult = await dbGet(
      `SELECT AVG(c.final_score) as avg FROM calls c
       WHERE c.company_id = ? AND c.final_score IS NOT NULL${agentFilter}${dateFilter}`,
      params
    );
    const averageScore = (avgScoreResult as { avg: number })?.avg || 0;

    // Alerts count (unread)
    const alertsParams = [req.user!.company_id];
    let alertAgentFilter = '';
    if (!isAdmin) {
      alertAgentFilter = ' AND a.agent_id = ?';
      alertsParams.push(req.user!.id);
    }
    const alertsResult = await dbGet(
      `SELECT COUNT(*) as total FROM alerts a
       WHERE a.company_id = ? AND a.is_read = 0${alertAgentFilter}`,
      alertsParams
    );
    const alertsCount = (alertsResult as { total: number })?.total || 0;

    // Calls with next step recommendation
    const nextStepResult = await dbGet(
      `SELECT
         COUNT(CASE WHEN c.next_step_recommendation IS NOT NULL AND c.next_step_recommendation != '' THEN 1 END) as with_next_step,
         COUNT(*) as total
       FROM calls c
       WHERE c.company_id = ?${agentFilter}${dateFilter}`,
      params
    );
    const withNextStep = (nextStepResult as { with_next_step: number })?.with_next_step || 0;
    const totalForPercentage = (nextStepResult as { total: number })?.total || 1;
    const callsWithNextStepPercentage = totalForPercentage > 0
      ? Math.round((withNextStep / totalForPercentage) * 100)
      : 0;

    res.json({
      total_calls: totalCalls,
      average_score: Math.round(averageScore * 10) / 10, // Round to 1 decimal
      alerts_count: alertsCount,
      calls_with_next_step_percentage: callsWithNextStepPercentage
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// Get recent calls for dashboard
router.get('/recent-calls', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin_manager';
    const limit = Math.min(Number(req.query.limit) || 5, 10);

    let agentFilter = '';
    const params: (string | number)[] = [req.user!.company_id];

    if (!isAdmin) {
      agentFilter = ' AND c.agent_id = ?';
      params.push(req.user!.id);
    }

    const calls = await dbAll(
      `SELECT c.id, c.phone_number, c.call_date, c.final_score, c.duration_seconds,
              u.username as agent_username
       FROM calls c
       LEFT JOIN users u ON c.agent_id = u.id
       WHERE c.company_id = ?${agentFilter}
       ORDER BY c.call_date DESC
       LIMIT ?`,
      [...params, limit]
    );

    res.json(calls);
  } catch (error) {
    console.error('Error fetching recent calls:', error);
    res.status(500).json({ error: 'Failed to fetch recent calls' });
  }
});

// Get recent alerts for dashboard
router.get('/alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin_manager';
    const limit = Math.min(Number(req.query.limit) || 5, 10);

    let agentFilter = '';
    const params: (string | number)[] = [req.user!.company_id];

    if (!isAdmin) {
      agentFilter = ' AND a.agent_id = ?';
      params.push(req.user!.id);
    }

    const alerts = await dbAll(
      `SELECT a.*, u.username as agent_username
       FROM alerts a
       LEFT JOIN users u ON a.agent_id = u.id
       WHERE a.company_id = ?${agentFilter}
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get score evolution for dashboard charts
router.get('/score-evolution', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const isAdmin = req.user!.role === 'admin_manager';

    let agentFilter = '';
    const params: (string | number)[] = [req.user!.company_id, Number(days)];

    if (!isAdmin) {
      agentFilter = ' AND c.agent_id = ?';
      params.splice(1, 0, req.user!.id);
    }

    const evolution = await dbAll(
      `SELECT
         DATE(c.call_date) as date,
         AVG(c.final_score) as average_score,
         COUNT(*) as total_calls
       FROM calls c
       WHERE c.company_id = ?
         AND c.final_score IS NOT NULL
         AND c.call_date >= DATE('now', '-' || ? || ' days')
         ${agentFilter}
       GROUP BY DATE(c.call_date)
       ORDER BY date ASC`,
      params
    );

    res.json(evolution);
  } catch (error) {
    console.error('Error fetching score evolution:', error);
    res.status(500).json({ error: 'Failed to fetch score evolution' });
  }
});

export default router;
