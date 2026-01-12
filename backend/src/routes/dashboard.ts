import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard overview stats
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date_from, date_to } = req.query;
    const isAdmin = req.user!.role === 'admin_manager';

    // Build calls query
    let callsQuery = supabase
      .from('calls')
      .select('final_score, next_step_recommendation', { count: 'exact' })
      .eq('company_id', req.user!.companyId);

    if (!isAdmin) {
      callsQuery = callsQuery.eq('agent_id', req.user!.userId);
    }

    if (date_from) {
      callsQuery = callsQuery.gte('call_date', String(date_from));
    }
    if (date_to) {
      callsQuery = callsQuery.lte('call_date', String(date_to));
    }

    const { data: calls, count: totalCalls } = await callsQuery;

    // Calculate average score
    const scoresArray = (calls || []).filter(c => c.final_score !== null).map(c => c.final_score);
    const averageScore = scoresArray.length > 0
      ? scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length
      : 0;

    // Calculate next step percentage
    const withNextStep = (calls || []).filter(c => c.next_step_recommendation && c.next_step_recommendation.length > 0).length;
    const callsWithNextStepPercentage = totalCalls && totalCalls > 0
      ? Math.round((withNextStep / totalCalls) * 100)
      : 0;

    // Get unread alerts count
    let alertsQuery = supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', req.user!.companyId)
      .eq('is_read', false);

    if (!isAdmin) {
      alertsQuery = alertsQuery.eq('agent_id', req.user!.userId);
    }

    const { count: alertsCount } = await alertsQuery;

    res.json({
      total_calls: totalCalls || 0,
      average_score: Math.round(averageScore * 10) / 10,
      alerts_count: alertsCount || 0,
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

    let query = supabase
      .from('calls')
      .select('id, phone_number, call_date, final_score, duration_seconds, users!calls_agent_id_fkey(username)')
      .eq('company_id', req.user!.companyId);

    if (!isAdmin) {
      query = query.eq('agent_id', req.user!.userId);
    }

    query = query.order('call_date', { ascending: false }).limit(limit);

    const { data: calls, error } = await query;

    if (error) throw error;

    // Transform the data
    const transformedCalls = (calls || []).map((call: any) => ({
      ...call,
      agent_username: call.users?.username || null,
      users: undefined
    }));

    res.json(transformedCalls);
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

    let query = supabase
      .from('alerts')
      .select('*, users!alerts_agent_id_fkey(username)')
      .eq('company_id', req.user!.companyId);

    if (!isAdmin) {
      query = query.eq('agent_id', req.user!.userId);
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data: alerts, error } = await query;

    if (error) throw error;

    // Transform the data
    const transformedAlerts = (alerts || []).map((alert: any) => ({
      ...alert,
      agent_username: alert.users?.username || null,
      users: undefined
    }));

    res.json(transformedAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get score evolution for dashboard charts
router.get('/score-evolution', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { days = 30, agent_id } = req.query;
    const isAdmin = req.user!.role === 'admin_manager';
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    let query = supabase
      .from('calls')
      .select('call_date, final_score')
      .eq('company_id', req.user!.companyId)
      .not('final_score', 'is', null)
      .gte('call_date', daysAgo.toISOString());

    if (!isAdmin) {
      query = query.eq('agent_id', req.user!.userId);
    } else if (agent_id) {
      query = query.eq('agent_id', Number(agent_id));
    }

    const { data: calls, error } = await query;

    if (error) throw error;

    // Group by date
    const groupedByDate: Record<string, { scores: number[]; count: number }> = {};
    (calls || []).forEach((call: any) => {
      const date = call.call_date.split('T')[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = { scores: [], count: 0 };
      }
      groupedByDate[date].scores.push(call.final_score);
      groupedByDate[date].count++;
    });

    const evolution = Object.entries(groupedByDate)
      .map(([date, data]) => ({
        date,
        average_score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        total_calls: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(evolution);
  } catch (error) {
    console.error('Error fetching score evolution:', error);
    res.status(500).json({ error: 'Failed to fetch score evolution' });
  }
});

// Get score by agent for reports (admin only)
router.get('/score-by-agent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin_manager') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { date_from, date_to } = req.query;

    let query = supabase
      .from('calls')
      .select('agent_id, final_score, users!calls_agent_id_fkey(id, username)')
      .eq('company_id', req.user!.companyId)
      .not('final_score', 'is', null);

    if (date_from) {
      query = query.gte('call_date', String(date_from));
    }
    if (date_to) {
      query = query.lte('call_date', String(date_to));
    }

    const { data: calls, error } = await query;

    if (error) throw error;

    // Group by agent
    const agentStats: Record<number, { username: string; scores: number[] }> = {};
    (calls || []).forEach((call: any) => {
      const agentId = call.agent_id;
      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          username: call.users?.username || 'Unknown',
          scores: []
        };
      }
      agentStats[agentId].scores.push(call.final_score);
    });

    const results = Object.entries(agentStats)
      .map(([agentId, data]) => ({
        agent_id: parseInt(agentId),
        agent_username: data.username,
        average_score: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10,
        total_calls: data.scores.length
      }))
      .sort((a, b) => b.average_score - a.average_score);

    res.json(results);
  } catch (error) {
    console.error('Error fetching score by agent:', error);
    res.status(500).json({ error: 'Failed to fetch score by agent' });
  }
});

// Get calls by period for reports (admin only)
router.get('/calls-by-period', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin_manager') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { days = 30, agent_id } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    let query = supabase
      .from('calls')
      .select('call_date')
      .eq('company_id', req.user!.companyId)
      .gte('call_date', daysAgo.toISOString());

    if (agent_id) {
      query = query.eq('agent_id', Number(agent_id));
    }

    const { data: calls, error } = await query;

    if (error) throw error;

    // Group by date
    const groupedByDate: Record<string, number> = {};
    (calls || []).forEach((call: any) => {
      const date = call.call_date.split('T')[0];
      groupedByDate[date] = (groupedByDate[date] || 0) + 1;
    });

    const results = Object.entries(groupedByDate)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));

    res.json(results);
  } catch (error) {
    console.error('Error fetching calls by period:', error);
    res.status(500).json({ error: 'Failed to fetch calls by period' });
  }
});

// Get top contact reasons for reports (admin only)
router.get('/top-reasons', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin_manager') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Simulated data - in a real app this would come from call categorization
    const reasons = [
      { reason: 'Informação de produto', count: 4 },
      { reason: 'Suporte técnico', count: 3 },
      { reason: 'Reclamação', count: 2 },
      { reason: 'Faturação', count: 1 }
    ];

    res.json(reasons);
  } catch (error) {
    console.error('Error fetching top reasons:', error);
    res.status(500).json({ error: 'Failed to fetch top reasons' });
  }
});

// Get top objections for reports (admin only)
router.get('/top-objections', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin_manager') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Simulated objection data
    const objections = [
      { objection: 'Preço muito alto', count: 5 },
      { objection: 'Já tenho fornecedor', count: 3 },
      { objection: 'Não tenho tempo', count: 2 },
      { objection: 'Preciso pensar', count: 2 }
    ];

    res.json(objections);
  } catch (error) {
    console.error('Error fetching top objections:', error);
    res.status(500).json({ error: 'Failed to fetch top objections' });
  }
});

export default router;
