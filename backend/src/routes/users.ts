import { Router, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db/database';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await dbAll(
      `SELECT id, company_id, username, role, language_preference, theme_preference, created_at, updated_at
       FROM users
       WHERE company_id = ?
       ORDER BY created_at DESC`,
      [req.user!.companyId]
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await dbGet(
      `SELECT id, company_id, username, role, language_preference, theme_preference, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [req.user!.userId]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update current user preferences
router.patch('/me/preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { language_preference, theme_preference } = req.body;

    // Validate inputs
    if (language_preference && !['pt', 'en'].includes(language_preference)) {
      return res.status(400).json({ error: 'Invalid language preference. Must be "pt" or "en"' });
    }
    if (theme_preference && !['light', 'dark'].includes(theme_preference)) {
      return res.status(400).json({ error: 'Invalid theme preference. Must be "light" or "dark"' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (language_preference) {
      updates.push('language_preference = ?');
      params.push(language_preference);
    }
    if (theme_preference) {
      updates.push('theme_preference = ?');
      params.push(theme_preference);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No preferences to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.user!.userId);

    await dbRun(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Fetch and return updated user
    const user = await dbGet(
      `SELECT id, company_id, username, role, language_preference, theme_preference, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [req.user!.userId]
    );

    res.json(user);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user by ID (admin only)
router.get('/:id', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await dbGet(
      `SELECT id, company_id, username, role, language_preference, theme_preference, created_at, updated_at
       FROM users
       WHERE id = ? AND company_id = ?`,
      [req.params.id, req.user!.companyId]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Invite user (admin only)
router.post('/invite', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = req.body;

    if (!role || !['admin_manager', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin_manager or agent)' });
    }

    // Generate invite token
    const token = Buffer.from(`${req.user!.companyId}:${Date.now()}`).toString('base64');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await dbRun(
      `INSERT INTO invitations (company_id, invited_by, token, role, used, expires_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [req.user!.companyId, req.user!.userId, token, role, expiresAt]
    );

    res.json({
      token,
      inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?token=${token}`,
      expiresAt
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// Update user role (admin only)
router.patch('/:id/role', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!role || !['admin_manager', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin_manager or agent)' });
    }

    // Cannot change your own role
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Check user exists and belongs to same company
    const user = await dbGet<{ id: number; role: string }>(
      'SELECT id, role FROM users WHERE id = ? AND company_id = ?',
      [userId, req.user!.companyId]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await dbRun(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [role, userId]
    );

    res.json({ message: 'User role updated successfully', role });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Cannot delete yourself
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check user exists and belongs to same company
    const user = await dbGet(
      'SELECT id FROM users WHERE id = ? AND company_id = ?',
      [userId, req.user!.companyId]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await dbRun('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
