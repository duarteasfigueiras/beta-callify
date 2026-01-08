import { Router, Response } from 'express';
import { dbAll, dbGet } from '../db/database';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all calls (admin sees all, agent sees only own)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, agent_id, date_from, date_to, score_min, score_max } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE c.company_id = ?';
    const params: (string | number)[] = [req.user!.company_id];

    // Agents can only see their own calls
    if (req.user!.role === 'agent') {
      whereClause += ' AND c.agent_id = ?';
      params.push(req.user!.id);
    } else if (agent_id) {
      whereClause += ' AND c.agent_id = ?';
      params.push(Number(agent_id));
    }

    if (date_from) {
      whereClause += ' AND c.call_date >= ?';
      params.push(String(date_from));
    }
    if (date_to) {
      whereClause += ' AND c.call_date <= ?';
      params.push(String(date_to));
    }
    if (score_min) {
      whereClause += ' AND c.final_score >= ?';
      params.push(Number(score_min));
    }
    if (score_max) {
      whereClause += ' AND c.final_score <= ?';
      params.push(Number(score_max));
    }

    // Get total count
    const countResult = await dbGet(
      `SELECT COUNT(*) as total FROM calls c ${whereClause}`,
      params
    );
    const total = (countResult as { total: number }).total;

    // Get paginated calls
    const calls = await dbAll(
      `SELECT c.*, u.username as agent_username
       FROM calls c
       LEFT JOIN users u ON c.agent_id = u.id
       ${whereClause}
       ORDER BY c.call_date DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      data: calls,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Get single call
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const callId = parseInt(req.params.id);

    let query = `
      SELECT c.*, u.username as agent_username
      FROM calls c
      LEFT JOIN users u ON c.agent_id = u.id
      WHERE c.id = ? AND c.company_id = ?
    `;
    const params: (string | number)[] = [callId, req.user!.company_id];

    // Agents can only see their own calls
    if (req.user!.role === 'agent') {
      query += ' AND c.agent_id = ?';
      params.push(req.user!.id);
    }

    const call = await dbGet(query, params);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Get criterion results
    const criteriaResults = await dbAll(
      `SELECT ccr.*, cr.name as criterion_name
       FROM call_criteria_results ccr
       JOIN criteria cr ON ccr.criterion_id = cr.id
       WHERE ccr.call_id = ?`,
      [callId]
    );

    // Get feedback
    const feedback = await dbAll(
      `SELECT cf.*, u.username as author_username
       FROM call_feedback cf
       LEFT JOIN users u ON cf.author_id = u.id
       WHERE cf.call_id = ?
       ORDER BY cf.created_at ASC`,
      [callId]
    );

    res.json({
      ...call,
      criteria_results: criteriaResults,
      feedback
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

export default router;
