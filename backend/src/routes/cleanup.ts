import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { isAdminOrDeveloper } from '../types';

const router = Router();
router.use(authenticateToken);

// POST /api/cleanup/old-data — Remove all non-demo data for the admin's company
router.post('/old-data', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !isAdminOrDeveloper(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const companyId = req.user.companyId;
    if (!companyId) return res.status(400).json({ error: 'No company' });

    // Get demo agent IDs (emails ending in @demo.com)
    const { data: demoAgents } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', companyId)
      .like('email', '%@demo.com');

    const demoAgentIds = (demoAgents || []).map((a: any) => a.id);

    // Also keep the admin user
    const keepUserIds = [req.user.userId, ...demoAgentIds];

    console.log(`[Cleanup] Company ${companyId}: keeping users ${keepUserIds.join(', ')}, demo agents: ${demoAgentIds.join(', ')}`);

    // 1. Find calls NOT from demo agents (old calls to delete)
    const { data: oldCalls } = await supabase
      .from('calls')
      .select('id')
      .eq('company_id', companyId)
      .not('agent_id', 'in', `(${demoAgentIds.join(',')})`);

    const oldCallIds = (oldCalls || []).map((c: any) => c.id);
    console.log(`[Cleanup] Found ${oldCallIds.length} old calls to delete`);

    // 2. Delete old alerts (for old calls)
    if (oldCallIds.length > 0) {
      // Delete in chunks of 100
      for (let i = 0; i < oldCallIds.length; i += 100) {
        const chunk = oldCallIds.slice(i, i + 100);
        await supabase.from('alerts').delete().in('call_id', chunk);
        await supabase.from('call_criteria_results').delete().in('call_id', chunk);
        await supabase.from('call_feedback').delete().in('call_id', chunk);
      }
    }

    // 3. Also delete alerts referencing non-demo agents
    const { data: oldAgents } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', companyId)
      .not('id', 'in', `(${keepUserIds.join(',')})`);

    const oldAgentIds = (oldAgents || []).map((a: any) => a.id);
    if (oldAgentIds.length > 0) {
      for (let i = 0; i < oldAgentIds.length; i += 100) {
        const chunk = oldAgentIds.slice(i, i + 100);
        await supabase.from('alerts').delete().in('agent_id', chunk);
      }
    }

    // 4. Delete old calls
    if (oldCallIds.length > 0) {
      for (let i = 0; i < oldCallIds.length; i += 100) {
        const chunk = oldCallIds.slice(i, i + 100);
        await supabase.from('calls').delete().in('id', chunk);
      }
    }

    // 5. Delete old invitations
    await supabase.from('invitations').delete().eq('company_id', companyId);

    // 6. Delete old agents (non-demo, non-admin)
    if (oldAgentIds.length > 0) {
      for (let i = 0; i < oldAgentIds.length; i += 100) {
        const chunk = oldAgentIds.slice(i, i + 100);
        await supabase.from('users').delete().in('id', chunk);
      }
    }

    console.log(`[Cleanup] Done. Deleted ${oldCallIds.length} calls, ${oldAgentIds.length} old users`);

    return res.json({
      success: true,
      deleted_calls: oldCallIds.length,
      deleted_users: oldAgentIds.length,
      kept_users: keepUserIds.length,
    });
  } catch (error: any) {
    console.error('[Cleanup] Error:', error);
    return res.status(500).json({ error: error.message || 'Cleanup failed' });
  }
});

export default router;
