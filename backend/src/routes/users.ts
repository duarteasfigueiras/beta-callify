import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, company_id, username, role, language_preference, theme_preference, created_at, updated_at')
      .eq('company_id', req.user!.companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(users || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, company_id, username, role, language_preference, theme_preference, created_at, updated_at')
      .eq('id', req.user!.userId)
      .single();

    if (error || !user) {
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

    // Build update object
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (language_preference) updateData.language_preference = language_preference;
    if (theme_preference) updateData.theme_preference = theme_preference;

    if (Object.keys(updateData).length === 1) {
      return res.status(400).json({ error: 'No preferences to update' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user!.userId)
      .select('id, company_id, username, role, language_preference, theme_preference, created_at, updated_at')
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user by ID (admin only)
router.get('/:id', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, company_id, username, role, language_preference, theme_preference, created_at, updated_at')
      .eq('id', req.params.id)
      .eq('company_id', req.user!.companyId)
      .single();

    if (error || !user) {
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

    const { error } = await supabase.from('invitations').insert({
      company_id: req.user!.companyId,
      invited_by: req.user!.userId,
      token,
      role,
      used: false,
      expires_at: expiresAt
    });

    if (error) throw error;

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
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .eq('company_id', req.user!.companyId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

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
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('company_id', req.user!.companyId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
