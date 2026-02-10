import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { isDeveloper, isAdminOrDeveloper } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Seed sample calls (admin only) - for testing
router.post('/seed', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if calls already exist
    const { count } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', req.user!.companyId);

    if (count && count > 0) {
      return res.json({ message: 'Calls already exist', count });
    }

    // Get an agent from the company
    const { data: agent } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', req.user!.companyId)
      .eq('role', 'agent')
      .single();

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

      await supabase.from('calls').insert({
        company_id: req.user!.companyId,
        agent_id: agent.id,
        phone_number: call.phone,
        duration_seconds: call.duration,
        final_score: call.score,
        call_date: callDate.toISOString(),
        summary: `Sample call from ${call.days_ago} days ago with score ${call.score}`,
        direction: 'inbound'
      });
    }

    res.json({ message: 'Sample calls created', count: sampleCalls.length });
  } catch (error) {
    console.error('Error seeding calls:', error);
    res.status(500).json({ error: 'Failed to seed calls' });
  }
});

// Get all calls (developer sees all, admin sees company, agent sees only own)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, agent_id, date_from, date_to, score_min, score_max, sort_by = 'call_date', sort_order = 'desc', company_id, direction, contact_reason, objection } = req.query;

    // Validate and sanitize page and limit parameters
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = supabase
      .from('calls')
      .select('*, users!calls_agent_id_fkey(username, display_name), companies(name)', { count: 'exact' });

    // Developer sees all, admin sees company, agent sees own
    if (isDeveloper(req.user!.role)) {
      // Developer can optionally filter by company
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      // Non-developers are restricted to their company
      query = query.eq('company_id', req.user!.companyId);
    }

    // Agents can only see their own calls
    if (req.user!.role === 'agent') {
      query = query.eq('agent_id', req.user!.userId);
    } else if (agent_id) {
      query = query.eq('agent_id', Number(agent_id));
    }

    // SECURITY: Validate date format before using in query (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (date_from) {
      const df = String(date_from);
      if (dateRegex.test(df) && !isNaN(Date.parse(df))) {
        query = query.gte('call_date', df + 'T00:00:00.000Z');
      }
    }
    if (date_to) {
      const dt = String(date_to);
      if (dateRegex.test(dt) && !isNaN(Date.parse(dt))) {
        query = query.lte('call_date', dt + 'T23:59:59.999Z');
      }
    }
    if (score_min) {
      query = query.gte('final_score', Number(score_min));
    }
    if (score_max) {
      query = query.lte('final_score', Number(score_max));
    }
    if (direction && ['inbound', 'outbound', 'meeting'].includes(String(direction))) {
      query = query.eq('direction', String(direction));
    }

    // Filter by contact reason (searches within JSON field)
    // SECURITY: Escape LIKE wildcards to prevent pattern injection
    if (contact_reason) {
      const safeReason = String(contact_reason).replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.ilike('contact_reasons', `%${safeReason}%`);
    }

    // Filter by objection (searches within JSON field)
    if (objection) {
      const safeObjection = String(objection).replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.ilike('objections', `%${safeObjection}%`);
    }

    // Sort
    const allowedSortColumns = ['call_date', 'duration_seconds', 'final_score', 'phone_number'];
    const sortColumn = allowedSortColumns.includes(String(sort_by)) ? String(sort_by) : 'call_date';
    const ascending = String(sort_order).toLowerCase() === 'asc';
    query = query.order(sortColumn, { ascending });

    // Pagination
    query = query.range(offset, offset + limitNum - 1);

    const { data: calls, count: total, error } = await query;

    if (error) throw error;

    // Transform the data to match expected format
    const transformedCalls = (calls || []).map((call: any) => ({
      ...call,
      agent_name: call.users?.display_name || call.users?.username || null,
      company_name: call.companies?.name || null,
      users: undefined,
      companies: undefined
    }));

    res.json({
      data: transformedCalls,
      total: total || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((total || 0) / limitNum)
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Get calls by risk word
router.get('/by-risk-word/:word', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const riskWord = req.params.word.toLowerCase();
    const { page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = supabase
      .from('calls')
      .select('*, users!calls_agent_id_fkey(username, display_name)', { count: 'exact' })
      .not('risk_words_detected', 'is', null);

    // Developer sees all, admin sees company, agent sees own
    if (isDeveloper(req.user!.role)) {
      // Developer can see all
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    // Agents can only see their own calls
    if (req.user!.role === 'agent') {
      query = query.eq('agent_id', req.user!.userId);
    }

    // Order by date descending
    query = query.order('call_date', { ascending: false });

    // SECURITY: Limit results to prevent unbounded memory usage
    query = query.limit(1000);

    const { data: allCalls, error } = await query;

    if (error) throw error;

    // Filter calls that contain the specific risk word
    const filteredCalls = (allCalls || []).filter((call: any) => {
      try {
        const riskWords = typeof call.risk_words_detected === 'string'
          ? JSON.parse(call.risk_words_detected)
          : call.risk_words_detected;

        if (Array.isArray(riskWords)) {
          return riskWords.some((w: string) => w.toLowerCase() === riskWord);
        }
        return false;
      } catch {
        return false;
      }
    });

    // Apply pagination to filtered results
    const total = filteredCalls.length;
    const paginatedCalls = filteredCalls.slice(offset, offset + limitNum);

    // Transform the data
    const transformedCalls = paginatedCalls.map((call: any) => ({
      ...call,
      agent_name: call.users?.display_name || call.users?.username || null,
      users: undefined
    }));

    res.json({
      data: transformedCalls,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Error fetching calls by risk word:', error);
    res.status(500).json({ error: 'Failed to fetch calls by risk word' });
  }
});

// Get single call
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const callId = parseInt(req.params.id);

    let query = supabase
      .from('calls')
      .select('*, users!calls_agent_id_fkey(username, display_name), companies(name)')
      .eq('id', callId);

    // Developer sees all, others restricted to their company
    if (!isDeveloper(req.user!.role)) {
      query = query.eq('company_id', req.user!.companyId);
    }

    // Agents can only see their own calls
    if (req.user!.role === 'agent') {
      query = query.eq('agent_id', req.user!.userId);
    }

    const { data: call, error } = await query.single();

    if (error || !call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Get criterion results
    const { data: criteriaResults } = await supabase
      .from('call_criteria_results')
      .select('*, criteria(name)')
      .eq('call_id', callId);

    // Get feedback
    const { data: feedback } = await supabase
      .from('call_feedback')
      .select('*, users(username)')
      .eq('call_id', callId)
      .order('created_at', { ascending: true });

    // Transform the data
    const transformedCriteriaResults = (criteriaResults || []).map((cr: any) => ({
      ...cr,
      criterion_name: cr.criteria?.name || null,
      criteria: undefined
    }));

    const transformedFeedback = (feedback || []).map((f: any) => ({
      ...f,
      author_username: f.users?.username || null,
      users: undefined
    }));

    res.json({
      ...call,
      agent_name: call.users?.display_name || call.users?.username || null,
      company_name: call.companies?.name || null,
      users: undefined,
      companies: undefined,
      criteria_results: transformedCriteriaResults,
      feedback: transformedFeedback
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

// Add feedback to a call (admin or developer)
router.post('/:id/feedback', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const callId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Feedback content is required' });
    }

    // Verify the call exists (and belongs to the company if not developer)
    let callQuery = supabase
      .from('calls')
      .select('id')
      .eq('id', callId);

    if (!isDeveloper(req.user!.role)) {
      callQuery = callQuery.eq('company_id', req.user!.companyId);
    }

    const { data: call } = await callQuery.single();

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Insert the feedback
    const { data: feedback, error } = await supabase
      .from('call_feedback')
      .insert({
        call_id: callId,
        author_id: req.user!.userId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(feedback);
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
    if (targetAgentId) {
      // SECURITY: Verify agent belongs to this company (prevent IDOR)
      const { data: agentRecord } = await supabase
        .from('users')
        .select('id')
        .eq('id', targetAgentId)
        .eq('company_id', req.user!.companyId)
        .single();

      if (!agentRecord) {
        return res.status(403).json({ error: 'Agent not found or does not belong to your company' });
      }
    } else {
      const { data: agent } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', req.user!.companyId)
        .eq('role', 'agent')
        .single();

      if (agent) {
        targetAgentId = agent.id;
      } else {
        // Use current user if no agent found
        targetAgentId = req.user!.userId;
      }
    }

    const { data: newCall, error } = await supabase
      .from('calls')
      .insert({
        company_id: req.user!.companyId,
        agent_id: targetAgentId,
        phone_number,
        duration_seconds: duration_seconds || 120,
        final_score: final_score || 7.0,
        summary: summary || 'Test call created via API',
        direction,
        next_step_recommendation: 'Follow up with client'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(newCall);
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({ error: 'Failed to create call' });
  }
});

// Debug endpoint to check coaching fields for a call (admin or developer)
router.get('/:id/debug-coaching', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const callId = parseInt(req.params.id);

    let query = supabase
      .from('calls')
      .select('id, skill_scores, phrases_to_avoid, recommended_phrases, contact_reasons, objections, response_improvement_example, history_comparison, top_performer_comparison')
      .eq('id', callId);

    // SECURITY: Non-developers can only see their own company's calls
    if (!isDeveloper(req.user!.role)) {
      query = query.eq('company_id', req.user!.companyId);
    }

    const { data: call, error } = await query.single();

    if (error || !call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({
      callId: call.id,
      hasSkillScores: !!call.skill_scores && call.skill_scores !== '[]' && call.skill_scores !== 'null',
      hasPhrasesToAvoid: !!call.phrases_to_avoid && call.phrases_to_avoid !== '[]' && call.phrases_to_avoid !== 'null',
      hasRecommendedPhrases: !!call.recommended_phrases && call.recommended_phrases !== '[]' && call.recommended_phrases !== 'null',
      hasContactReasons: !!call.contact_reasons && call.contact_reasons !== '[]' && call.contact_reasons !== 'null',
      hasObjections: !!call.objections && call.objections !== '[]' && call.objections !== 'null',
      hasResponseExample: !!call.response_improvement_example && call.response_improvement_example !== 'null',
      hasHistoryComparison: !!call.history_comparison && call.history_comparison !== 'null',
      hasTopPerformerComparison: !!call.top_performer_comparison && call.top_performer_comparison !== 'null',
      rawData: {
        skill_scores: call.skill_scores,
        phrases_to_avoid: call.phrases_to_avoid,
        recommended_phrases: call.recommended_phrases,
        contact_reasons: call.contact_reasons,
        objections: call.objections,
        response_improvement_example: call.response_improvement_example,
        history_comparison: call.history_comparison,
        top_performer_comparison: call.top_performer_comparison
      }
    });
  } catch (error: any) {
    console.error('Error debugging call:', error);
    res.status(500).json({ error: 'Failed to debug call' });
  }
});

// Delete call (developer or admin_manager)
router.delete('/:id', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const callId = parseInt(req.params.id);

    // SECURITY: Verify the call exists AND belongs to user's company (developer sees all)
    let callQuery = supabase
      .from('calls')
      .select('id, company_id')
      .eq('id', callId);

    if (!isDeveloper(req.user!.role)) {
      callQuery = callQuery.eq('company_id', req.user!.companyId);
    }

    const { data: call } = await callQuery.single();

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Delete related data first (cascade should handle this, but being explicit)
    await supabase.from('call_criteria_results').delete().eq('call_id', callId);
    await supabase.from('call_feedback').delete().eq('call_id', callId);
    await supabase.from('alerts').delete().eq('call_id', callId);

    // Delete the call
    const { error } = await supabase.from('calls').delete().eq('id', callId);

    if (error) throw error;

    res.json({ message: 'Call deleted successfully' });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({ error: 'Failed to delete call' });
  }
});

export default router;
