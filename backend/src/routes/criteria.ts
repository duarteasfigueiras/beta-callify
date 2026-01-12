import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all criteria
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: criteria, error } = await supabase
      .from('criteria')
      .select('*')
      .eq('company_id', req.user!.companyId)
      .order('weight', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(criteria || []);
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({ error: 'Failed to fetch criteria' });
  }
});

// Get single criterion
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: criterion, error } = await supabase
      .from('criteria')
      .select('*')
      .eq('id', req.params.id)
      .eq('company_id', req.user!.companyId)
      .single();

    if (error || !criterion) {
      return res.status(404).json({ error: 'Criterion not found' });
    }
    res.json(criterion);
  } catch (error) {
    console.error('Error fetching criterion:', error);
    res.status(500).json({ error: 'Failed to fetch criterion' });
  }
});

// Create criterion (admin only)
router.post('/', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, weight } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data: criterion, error } = await supabase
      .from('criteria')
      .insert({
        company_id: req.user!.companyId,
        name,
        description: description || '',
        weight: weight || 1,
        is_active: true
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
    const { name, description, weight, is_active } = req.body;
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
