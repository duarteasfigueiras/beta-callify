import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { isDeveloper, UserCategory } from '../types';

const router = Router();

// Valid user categories
const VALID_CATEGORIES: UserCategory[] = ['comercial', 'suporte', 'tecnico', 'supervisor', 'all'];

// All routes require authentication
router.use(authenticateToken);

// ============================================
// ALERT SETTINGS ROUTES (must be before /:id)
// ============================================

// Default alert settings
const DEFAULT_ALERT_SETTINGS = {
  low_score_enabled: true,
  low_score_threshold: 5.0,
  risk_words_enabled: true,
  risk_words_list: 'cancelar,cancelamento,reclamacao,reclamar,advogado,processo,tribunal,insatisfeito,insatisfacao,devolver,devolucao,reembolso,nunca mais,pessimo',
  long_duration_enabled: true,
  long_duration_threshold_minutes: 30,
  no_next_step_enabled: true
};

// Get alert settings for company
router.get('/alert-settings', requireRole('admin_manager', 'developer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('company_id', req.user!.companyId)
      .single();

    // Handle table not existing or no rows - return defaults
    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return res.json({
          company_id: req.user!.companyId,
          ...DEFAULT_ALERT_SETTINGS
        });
      }
      throw error;
    }

    // If no settings exist, return defaults
    if (!settings) {
      return res.json({
        company_id: req.user!.companyId,
        ...DEFAULT_ALERT_SETTINGS
      });
    }

    res.json(settings);
  } catch (error: any) {
    console.error('Error fetching alert settings:', error);
    // If table doesn't exist, return defaults instead of error
    if (error?.code === '42P01') {
      return res.json({
        company_id: req.user!.companyId,
        ...DEFAULT_ALERT_SETTINGS
      });
    }
    res.status(500).json({ error: 'Failed to fetch alert settings' });
  }
});

// Update alert settings for company
router.put('/alert-settings', requireRole('admin_manager', 'developer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      low_score_enabled,
      low_score_threshold,
      risk_words_enabled,
      risk_words_list,
      long_duration_enabled,
      long_duration_threshold_minutes,
      no_next_step_enabled
    } = req.body;

    // Validate inputs
    if (low_score_threshold !== undefined && (low_score_threshold < 0 || low_score_threshold > 10)) {
      return res.status(400).json({ error: 'Low score threshold must be between 0 and 10' });
    }
    if (long_duration_threshold_minutes !== undefined && (long_duration_threshold_minutes < 1 || long_duration_threshold_minutes > 120)) {
      return res.status(400).json({ error: 'Long duration threshold must be between 1 and 120 minutes' });
    }

    // Build update object
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (low_score_enabled !== undefined) updateData.low_score_enabled = low_score_enabled;
    if (low_score_threshold !== undefined) updateData.low_score_threshold = low_score_threshold;
    if (risk_words_enabled !== undefined) updateData.risk_words_enabled = risk_words_enabled;
    if (risk_words_list !== undefined) updateData.risk_words_list = risk_words_list;
    if (long_duration_enabled !== undefined) updateData.long_duration_enabled = long_duration_enabled;
    if (long_duration_threshold_minutes !== undefined) updateData.long_duration_threshold_minutes = long_duration_threshold_minutes;
    if (no_next_step_enabled !== undefined) updateData.no_next_step_enabled = no_next_step_enabled;

    // Try to update existing settings
    const { data: existing } = await supabase
      .from('alert_settings')
      .select('id')
      .eq('company_id', req.user!.companyId)
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('alert_settings')
        .update(updateData)
        .eq('company_id', req.user!.companyId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('alert_settings')
        .insert({
          company_id: req.user!.companyId,
          ...updateData
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating alert settings:', error);
    res.status(500).json({ error: 'Failed to update alert settings' });
  }
});

// ============================================
// CRITERIA ROUTES
// ============================================

// Get all criteria
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { company_id, category } = req.query;

    let query = supabase
      .from('criteria')
      .select('*, companies(name)')
      .order('category', { ascending: true })
      .order('weight', { ascending: false })
      .order('name', { ascending: true });

    // Developer sees all, others see only their company
    if (isDeveloper(req.user!.role)) {
      if (company_id) {
        query = query.eq('company_id', Number(company_id));
      }
    } else {
      query = query.eq('company_id', req.user!.companyId);
    }

    // Filter by category if specified
    if (category && VALID_CATEGORIES.includes(category as UserCategory)) {
      // Return criteria for specific category + 'all' category
      query = query.or(`category.eq.${category},category.eq.all`);
    }

    const { data: criteria, error } = await query;

    if (error) throw error;

    // Transform data to include company_name
    const transformedCriteria = (criteria || []).map((c: any) => ({
      ...c,
      company_name: c.companies?.name || null,
      companies: undefined
    }));

    res.json(transformedCriteria);
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({ error: 'Failed to fetch criteria' });
  }
});

// Get single criterion
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabase
      .from('criteria')
      .select('*, companies(name)')
      .eq('id', req.params.id);

    // Developer sees all, others see only their company
    if (!isDeveloper(req.user!.role)) {
      query = query.eq('company_id', req.user!.companyId);
    }

    const { data: criterion, error } = await query.single();

    if (error || !criterion) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    // Transform data
    const transformedCriterion = {
      ...criterion,
      company_name: (criterion as any).companies?.name || null,
      companies: undefined
    };

    res.json(transformedCriterion);
  } catch (error) {
    console.error('Error fetching criterion:', error);
    res.status(500).json({ error: 'Failed to fetch criterion' });
  }
});

// Create criterion (admin only)
router.post('/', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, weight, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate category if provided
    const validCategory = category && VALID_CATEGORIES.includes(category) ? category : 'all';

    const { data: criterion, error } = await supabase
      .from('criteria')
      .insert({
        company_id: req.user!.companyId,
        name,
        description: description || '',
        weight: weight || 1,
        is_active: true,
        category: validCategory
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(criterion);
  } catch (error) {
    console.error('Error creating criterion:', error);
    res.status(500).json({ error: 'Failed to create criterion' });
  }
});

// Update criterion (admin only)
router.put('/:id', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, weight, is_active, category } = req.body;
    const criterionId = parseInt(req.params.id);

    // Check criterion exists and belongs to company
    const { data: existing } = await supabase
      .from('criteria')
      .select('id')
      .eq('id', criterionId)
      .eq('company_id', req.user!.companyId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    // Build update object
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (weight !== undefined) updateData.weight = weight;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (category !== undefined && VALID_CATEGORIES.includes(category)) {
      updateData.category = category;
    }

    const { data: updated, error } = await supabase
      .from('criteria')
      .update(updateData)
      .eq('id', criterionId)
      .select()
      .single();

    if (error) throw error;

    res.json(updated);
  } catch (error) {
    console.error('Error updating criterion:', error);
    res.status(500).json({ error: 'Failed to update criterion' });
  }
});

// Delete criterion (admin only)
router.delete('/:id', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const criterionId = parseInt(req.params.id);

    // Check criterion exists and belongs to company
    const { data: existing } = await supabase
      .from('criteria')
      .select('id')
      .eq('id', criterionId)
      .eq('company_id', req.user!.companyId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    // First, delete all call_criteria_results that reference this criterion
    // This is needed because the foreign key doesn't have ON DELETE CASCADE
    const { error: resultsError } = await supabase
      .from('call_criteria_results')
      .delete()
      .eq('criterion_id', criterionId);

    if (resultsError) {
      console.error('Error deleting criterion results:', resultsError);
      // Continue anyway - the results table might not have any records
    }

    // Now delete the criterion
    const { error } = await supabase
      .from('criteria')
      .delete()
      .eq('id', criterionId);

    if (error) throw error;

    res.json({ message: 'Criterion deleted successfully' });
  } catch (error) {
    console.error('Error deleting criterion:', error);
    res.status(500).json({ error: 'Failed to delete criterion' });
  }
});

export default router;
