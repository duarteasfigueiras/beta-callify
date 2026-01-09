import { Router, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db/database';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all criteria
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const criteria = await dbAll(
      `SELECT * FROM criteria
       WHERE company_id = ?
       ORDER BY weight DESC, name ASC`,
      [req.user!.companyId]
    );
    res.json(criteria);
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({ error: 'Failed to fetch criteria' });
  }
});

// Get single criterion
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const criterion = await dbGet(
      `SELECT * FROM criteria WHERE id = ? AND company_id = ?`,
      [req.params.id, req.user!.companyId]
    );
    if (!criterion) {
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

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const result = await dbRun(
      `INSERT INTO criteria (company_id, name, description, weight, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [req.user!.companyId, name, description, weight || 1]
    );

    res.status(201).json({
      id: result.lastID,
      company_id: req.user!.companyId,
      name,
      description,
      weight: weight || 1,
      is_active: true
    });
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
    const criterion = await dbGet(
      'SELECT id FROM criteria WHERE id = ? AND company_id = ?',
      [criterionId, req.user!.companyId]
    );
    if (!criterion) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    await dbRun(
      `UPDATE criteria SET
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         weight = COALESCE(?, weight),
         is_active = COALESCE(?, is_active),
         updated_at = datetime('now')
       WHERE id = ?`,
      [name, description, weight, is_active, criterionId]
    );

    const updated = await dbGet('SELECT * FROM criteria WHERE id = ?', [criterionId]);
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
    const criterion = await dbGet(
      'SELECT id FROM criteria WHERE id = ? AND company_id = ?',
      [criterionId, req.user!.companyId]
    );
    if (!criterion) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    await dbRun('DELETE FROM criteria WHERE id = ?', [criterionId]);
    res.json({ message: 'Criterion deleted successfully' });
  } catch (error) {
    console.error('Error deleting criterion:', error);
    res.status(500).json({ error: 'Failed to delete criterion' });
  }
});

export default router;
