import { Router, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db/database';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Seed sample calls (admin only) - for testing
router.post('/seed', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if calls already exist
    const existingCalls = await dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM calls WHERE company_id = ?',
      [req.user!.companyId]
    );

    if (existingCalls && existingCalls.count > 0) {
      return res.json({ message: 'Calls already exist', count: existingCalls.count });
    }

    // Get an agent from the company
    const agent = await dbGet<{ id: number }>(
      'SELECT id FROM users WHERE company_id = ? AND role = ?',
      [req.user!.companyId, 'agent']
    );

    if (!agent) {
      return res.status(400).json({ error: 'No agent found to assign calls to' });
    }

    // Sample calls with different dates
    const sampleCalls = [
      { phone: '+351912345678', score: 8.5, days_ago: 0, duration: 245 },
      { phone: '+351923456789', score: 7.2, days_ago: 1, duration: 180 },
      { phone: '+351934567890', score: 9.1, days_ago: 2, duration: 320 },
      { phone: '+351945678901', score: 6.5, days_ago: 3, duration: 150 },
      { phone: '+351956789012', score: 4.8, days_ago: 5, duration: 420 },
      { phone: '+351967890123', score: 8.0, days_ago: 7, duration: 200 },
      { phone: '+351978901234', score: 7.8, days_ago: 10, duration: 275 },
      { phone: '+351989012345', score: 9.5, days_ago: 14, duration: 190 },
      { phone: '+351990123456', score: 5.2, days_ago: 21, duration: 380 },
      { phone: '+351901234567', score: 8.8, days_ago: 30, duration: 210 },
      { phone: '+351912345111', score: 7.0, days_ago: 45, duration: 165 },
      { phone: '+351923456222', score: 6.0, days_ago: 60, duration: 300 },
    ];

    for (const call of sampleCalls) {
      const callDate = new Date();
      callDate.setDate(callDate.getDate() - call.days_ago);
      const callDateStr = callDate.toISOString();

      await dbRun(
        `INSERT INTO calls (company_id, agent_id, phone_number, duration_seconds, final_score, call_date, summary, direction)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.companyId,
          agent.id,
          call.phone,
          call.duration,
          call.score,
          callDateStr,
          `Sample call from ${call.days_ago} days ago with score ${call.score}`,
          'inbound'
        ]
      );
    }

    res.json({ message: 'Sample calls created', count: sampleCalls.length });
  } catch (error) {
    console.error('Error seeding calls:', error);
    res.status(500).json({ error: 'Failed to seed calls' });
  }
});

// Get all calls (admin sees all, agent sees only own)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, agent_id, date_from, date_to, score_min, score_max, sort_by = 'call_date', sort_order = 'desc' } = req.query;

    // Validate and sanitize page and limit parameters
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    console.log('[DEBUG] GET /calls - user:', req.user?.userId, 'company:', req.user?.companyId, 'role:', req.user?.role, 'sort_by:', sort_by, 'sort_order:', sort_order);

    let whereClause = 'WHERE c.company_id = ?';
    const params: (string | number)[] = [req.user!.companyId];

    // Agents can only see their own calls
    if (req.user!.role === 'agent') {
      whereClause += ' AND c.agent_id = ?';
      params.push(req.user!.userId);
    } else if (agent_id) {
      whereClause += ' AND c.agent_id = ?';
      params.push(Number(agent_id));
    }

    if (date_from) {
      whereClause += ' AND c.call_date >= ?';
      params.push(String(date_from) + 'T00:00:00.000Z');
    }
    if (date_to) {
      whereClause += ' AND c.call_date <= ?';
      params.push(String(date_to) + 'T23:59:59.999Z');
    }
    if (score_min) {
      whereClause += ' AND c.final_score >= ?';
      params.push(Number(score_min));
    }
    if (score_max) {
      whereClause += ' AND c.final_score <= ?';
      params.push(Number(score_max));
    }

    // Validate and sanitize sort parameters
    const allowedSortColumns = ['call_date', 'duration_seconds', 'final_score', 'phone_number'];
    const sortColumn = allowedSortColumns.includes(String(sort_by)) ? String(sort_by) : 'call_date';
    const sortDirection = String(sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await dbGet(
      `SELECT COUNT(*) as total FROM calls c ${whereClause}`,
      params
    );
    const total = (countResult as { total: number }).total;
    console.log('[DEBUG] Query:', `SELECT COUNT(*) as total FROM calls c ${whereClause}`, 'params:', params, 'total:', total);

    // Get paginated calls
    const calls = await dbAll(
      `SELECT c.*, u.username as agent_username
       FROM calls c
       LEFT JOIN users u ON c.agent_id = u.id
       ${whereClause}
       ORDER BY c.${sortColumn} ${sortDirection}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      data: calls,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
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
    const params: (string | number)[] = [callId, req.user!.companyId];

    // Agents can only see their own calls
    if (req.user!.role === 'agent') {
      query += ' AND c.agent_id = ?';
      params.push(req.user!.userId);
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

// Add feedback to a call (admin only)
router.post('/:id/feedback', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const callId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Feedback content is required' });
    }

    // Verify the call exists and belongs to the company
    const call = await dbGet(
      'SELECT id FROM calls WHERE id = ? AND company_id = ?',
      [callId, req.user!.companyId]
    );

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Insert the feedback
    const result = await dbRun(
      `INSERT INTO call_feedback (call_id, author_id, content, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [callId, req.user!.userId, content.trim()]
    );

    res.status(201).json({
      id: result.lastID,
      call_id: callId,
      author_id: req.user!.userId,
      content: content.trim(),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ error: 'Failed to add feedback' });
  }
});

// Create a new call (admin only) - for testing/manual entry
router.post('/', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone_number, agent_id, duration_seconds, final_score, summary, direction = 'inbound' } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Use provided agent_id or find an agent in the company
    let targetAgentId = agent_id;
    if (!targetAgentId) {
      const agent = await dbGet<{ id: number }>(
        'SELECT id FROM users WHERE company_id = ? AND role = ?',
        [req.user!.companyId, 'agent']
      );
      if (agent) {
        targetAgentId = agent.id;
      } else {
        // Use current user if no agent found
        targetAgentId = req.user!.userId;
      }
    }

    const callDate = new Date().toISOString();

    const result = await dbRun(
      `INSERT INTO calls (company_id, agent_id, phone_number, duration_seconds, final_score, call_date, summary, direction, next_step_recommendation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user!.companyId,
        targetAgentId,
        phone_number,
        duration_seconds || 120,
        final_score || 7.0,
        callDate,
        summary || 'Test call created via API',
        direction,
        'Follow up with client'
      ]
    );

    res.status(201).json({
      id: result.lastID,
      phone_number,
      agent_id: targetAgentId,
      duration_seconds: duration_seconds || 120,
      final_score: final_score || 7.0,
      call_date: callDate,
      summary: summary || 'Test call created via API',
      direction
    });
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({ error: 'Failed to create call' });
  }
});

// Delete call (admin only)
router.delete('/:id', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const callId = parseInt(req.params.id);

    // Verify the call exists and belongs to the company
    const call = await dbGet(
      'SELECT id FROM calls WHERE id = ? AND company_id = ?',
      [callId, req.user!.companyId]
    );

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Delete related data first
    await dbRun('DELETE FROM call_criteria_results WHERE call_id = ?', [callId]);
    await dbRun('DELETE FROM call_feedback WHERE call_id = ?', [callId]);
    await dbRun('DELETE FROM alerts WHERE call_id = ?', [callId]);

    // Delete the call
    await dbRun('DELETE FROM calls WHERE id = ?', [callId]);

    res.json({ message: 'Call deleted successfully' });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({ error: 'Failed to delete call' });
  }
});

export default router;
