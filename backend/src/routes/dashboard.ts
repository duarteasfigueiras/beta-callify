import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { isDeveloper, isAdminOrDeveloper } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard overview stats
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date_from, date_to, company_id } = req.query;
    const isAdmin = isAdminOrDeveloper(req.user!.role);

    // Dashboard overview request

    // Build calls query
    let callsQuery = supabase
      .from('calls')
      .select('final_score, next_step_recommendation', { count: 'exact' });

    // Developer sees all, admin sees company, agent sees own
    if (isDeveloper(req.user!.role)) {
      // Developer mode - optional company filter
      if (company_id) {
        callsQuery = callsQuery.eq('company_id', Number(company_id));
      }
    } else {
      // Non-developer mode - filter by company
      callsQuery = callsQuery.eq('company_id', req.user!.companyId);
    }

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
      .eq('is_read', false);

    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        alertsQuery = alertsQuery.eq('company_id', Number(company_id));
      }
    } else {
      alertsQuery = alertsQuery.eq('company_id', req.user!.companyId);
    }

    if (!isAdmin) {
      alertsQuery = alertsQuery.eq('agent_id', req.user!.userId);
    }

    const { count: alertsCount } = await alertsQuery;

    // Dashboard overview computed

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
    const isAdmin = isAdminOrDeveloper(req.user!.role);
    const limit = Math.min(Number(req.query.limit) || 5, 10);
    const { company_id } = req.query;

    let query = supabase
      .from('calls')
      .select('id, phone_number, call_date, final_score, duration_seconds, users!calls_agent_id_fkey(username, display_name, custom_role_name), companies(name)');

    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    if (!isAdmin) {
      query = query.eq('agent_id', req.user!.userId);
    }

    query = query.order('call_date', { ascending: false }).limit(limit);

    const { data: calls, error } = await query;

    if (error) throw error;

    // Transform the data
    const transformedCalls = (calls || []).map((call: any) => ({
      ...call,
      agent_name: call.users?.display_name || call.users?.username || null,
      agent_custom_role_name: call.users?.custom_role_name || null,
      company_name: call.companies?.name || null,
      users: undefined,
      companies: undefined
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
    const isAdmin = isAdminOrDeveloper(req.user!.role);
    const limit = Math.min(Number(req.query.limit) || 5, 10);
    const { company_id } = req.query;

    let query = supabase
      .from('alerts')
      .select('*, users!alerts_agent_id_fkey(username, display_name, custom_role_name), companies(name)');

    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    if (!isAdmin) {
      query = query.eq('agent_id', req.user!.userId);
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data: alerts, error } = await query;

    if (error) throw error;

    // Transform the data
    const transformedAlerts = (alerts || []).map((alert: any) => ({
      ...alert,
      agent_name: alert.users?.display_name || alert.users?.username || null,
      agent_custom_role_name: alert.users?.custom_role_name || null,
      company_name: alert.companies?.name || null,
      users: undefined,
      companies: undefined
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
    const { days = 30, agent_id, company_id } = req.query;
    const isAdmin = isAdminOrDeveloper(req.user!.role);
    // SECURITY: Cap days parameter to prevent unbounded queries
    const daysNum = Math.min(Math.max(1, Number(days) || 30), 365);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysNum);

    let query = supabase
      .from('calls')
      .select('call_date, final_score')
      .not('final_score', 'is', null)
      .gte('call_date', daysAgo.toISOString())
      .limit(10000);

    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

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

// Get score by agent for reports (admin or developer)
router.get('/score-by-agent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isAdminOrDeveloper(req.user!.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { date_from, date_to, company_id } = req.query;

    let query = supabase
      .from('calls')
      .select('agent_id, final_score, users!calls_agent_id_fkey(id, username, display_name)')
      .not('final_score', 'is', null);

    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    if (date_from) {
      query = query.gte('call_date', String(date_from));
    }
    if (date_to) {
      query = query.lte('call_date', String(date_to));
    }

    const { data: calls, error } = await query;

    if (error) throw error;

    // Group by agent
    const agentStats: Record<number, { username: string; display_name: string | null; scores: number[] }> = {};
    (calls || []).forEach((call: any) => {
      const agentId = call.agent_id;
      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          username: call.users?.username || 'Unknown',
          display_name: call.users?.display_name || null,
          scores: []
        };
      }
      agentStats[agentId].scores.push(call.final_score);
    });

    const results = Object.entries(agentStats)
      .map(([agentId, data]) => ({
        agent_id: parseInt(agentId),
        agent_username: data.username,
        agent_name: data.display_name || data.username,
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

// Get calls by period for reports (admin or developer)
router.get('/calls-by-period', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isAdminOrDeveloper(req.user!.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { days = 30, agent_id, company_id } = req.query;
    // SECURITY: Cap days parameter to prevent unbounded queries
    const daysNum = Math.min(Math.max(1, Number(days) || 30), 365);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysNum);

    let query = supabase
      .from('calls')
      .select('call_date')
      .gte('call_date', daysAgo.toISOString())
      .limit(10000);

    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
      // Developer without company_id sees all calls
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    if (agent_id) {
      query = query.eq('agent_id', Number(agent_id));
    }

    const { data: calls, error } = await query;

    // Calls by period query completed

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

    console.log('Calls by period - results:', results.length, 'periods');

    res.json(results);
  } catch (error) {
    console.error('Error fetching calls by period:', error);
    res.status(500).json({ error: 'Failed to fetch calls by period' });
  }
});

// Get top contact reasons for reports (admin or developer)
// Returns grouped reasons by category with expandable details
router.get('/top-reasons', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isAdminOrDeveloper(req.user!.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { date_from, date_to, company_id } = req.query;

    let query = supabase
      .from('calls')
      .select('contact_reasons')
      .not('contact_reasons', 'is', null);

    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    if (date_from) {
      query = query.gte('call_date', String(date_from));
    }
    if (date_to) {
      query = query.lte('call_date', String(date_to));
    }

    const { data: calls, error } = await query;

    if (error) throw error;

    // Structure: { category: { reason: count } }
    const groupedCounts: Record<string, Record<string, number>> = {};
    // Fallback for old format (no category)
    const DEFAULT_CATEGORY = 'Outros';

    (calls || []).forEach((call: any) => {
      if (!call.contact_reasons) return;

      try {
        // Parse the contact_reasons JSON array
        const reasons = typeof call.contact_reasons === 'string'
          ? JSON.parse(call.contact_reasons)
          : call.contact_reasons;

        if (Array.isArray(reasons)) {
          reasons.forEach((item: any) => {
            let category = DEFAULT_CATEGORY;
            let reason = '';

            if (typeof item === 'string') {
              // Old format: just a string
              reason = item.trim();
            } else if (item && typeof item === 'object') {
              // New format: { categoria, motivo } or { category, reason } or { text }
              category = (item.categoria || item.category || DEFAULT_CATEGORY).trim();
              reason = (item.motivo || item.reason || item.text || '').trim();
            }

            if (reason) {
              if (!groupedCounts[category]) {
                groupedCounts[category] = {};
              }
              groupedCounts[category][reason] = (groupedCounts[category][reason] || 0) + 1;
            }
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    // Convert to grouped array format
    const results = Object.entries(groupedCounts)
      .map(([category, reasons]) => {
        const reasonsList = Object.entries(reasons)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count);

        const totalCount = reasonsList.reduce((sum, r) => sum + r.count, 0);

        return {
          category,
          count: totalCount,
          reasons: reasonsList
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 categories

    res.json(results);
  } catch (error) {
    console.error('Error fetching top reasons:', error);
    res.status(500).json({ error: 'Failed to fetch top reasons' });
  }
});

// Get top objections for reports (admin or developer)
// Objections are concerns/objections raised BY THE CUSTOMER during the call
// (e.g., "Preço muito alto", "Prazo de entrega longo")
// Returns grouped by category similar to contact reasons
router.get('/top-objections', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isAdminOrDeveloper(req.user!.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { date_from, date_to, company_id } = req.query;
    const DEFAULT_CATEGORY = 'Outros';

    // Get calls with objections data (customer objections, not evaluation critiques)
    let query = supabase
      .from('calls')
      .select('objections')
      .not('objections', 'is', null);

    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    if (date_from) {
      query = query.gte('call_date', String(date_from));
    }
    if (date_to) {
      query = query.lte('call_date', String(date_to));
    }

    const { data: calls, error } = await query;

    if (error) throw error;

    // Group objections by category
    const categoryMap: Record<string, Record<string, number>> = {};

    (calls || []).forEach((call: any) => {
      if (!call.objections) return;

      try {
        // Parse the JSON array of objections
        const items = typeof call.objections === 'string'
          ? JSON.parse(call.objections)
          : call.objections;

        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            let category = DEFAULT_CATEGORY;
            let objection = '';

            // Handle both old format (string or {text}) and new format ({categoria, objecao})
            if (typeof item === 'string') {
              objection = item.trim();
            } else if (item && typeof item === 'object') {
              const rawCategory = (item.categoria || item.category || '').trim();
              category = rawCategory || DEFAULT_CATEGORY;
              objection = (item.objecao || item.objection || item.text || '').trim();
            }

            if (objection) {
              if (!categoryMap[category]) {
                categoryMap[category] = {};
              }
              categoryMap[category][objection] = (categoryMap[category][objection] || 0) + 1;
            }
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    // Convert to grouped format
    const results = Object.entries(categoryMap)
      .map(([category, objections]) => {
        const objectionsList = Object.entries(objections)
          .map(([objection, count]) => ({ objection, count }))
          .sort((a, b) => b.count - a.count);

        const totalCount = objectionsList.reduce((sum, o) => sum + o.count, 0);

        return {
          category,
          count: totalCount,
          objections: objectionsList
        };
      })
      .sort((a, b) => b.count - a.count);

    res.json(results);
  } catch (error) {
    console.error('Error fetching top objections:', error);
    res.status(500).json({ error: 'Failed to fetch top objections' });
  }
});

// Get score evolution by category for reports (admin or developer)
router.get('/score-evolution-by-category', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isAdminOrDeveloper(req.user!.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { days = 30, company_id } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    // Get calls with user category info
    let query = supabase
      .from('calls')
      .select(`
        call_date,
        final_score,
        agent_id,
        users!calls_agent_id_fkey (
          id,
          custom_role_name,
          display_name,
          username
        )
      `)
      .not('final_score', 'is', null)
      .gte('call_date', daysAgo.toISOString());

    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error('Error fetching calls for category evolution:', error);
      throw error;
    }

    // Group by date and category
    const groupedByDateAndCategory: Record<string, Record<string, { scores: number[]; count: number }>> = {};
    const categories = new Set<string>();

    (calls || []).forEach((call: any) => {
      const date = call.call_date.split('T')[0];
      // Use category from user, or "Sem Categoria" if not defined
      const category = call.users?.custom_role_name || 'Sem Categoria';
      categories.add(category);

      if (!groupedByDateAndCategory[date]) {
        groupedByDateAndCategory[date] = {};
      }
      if (!groupedByDateAndCategory[date][category]) {
        groupedByDateAndCategory[date][category] = { scores: [], count: 0 };
      }
      groupedByDateAndCategory[date][category].scores.push(call.final_score);
      groupedByDateAndCategory[date][category].count++;
    });

    // Build result with all categories per date
    const evolution = Object.entries(groupedByDateAndCategory)
      .map(([date, categoriesData]) => {
        const result: Record<string, any> = { date };
        for (const category of categories) {
          if (categoriesData[category]) {
            const scores = categoriesData[category].scores;
            result[category] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
            result[`${category}_calls`] = categoriesData[category].count;
          } else {
            result[category] = null;
            result[`${category}_calls`] = 0;
          }
        }
        return result;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Also return the list of categories found
    res.json({
      evolution,
      categories: Array.from(categories).sort()
    });
  } catch (error) {
    console.error('Error fetching score evolution by category:', error);
    res.status(500).json({ error: 'Failed to fetch score evolution by category' });
  }
});

export default router;
