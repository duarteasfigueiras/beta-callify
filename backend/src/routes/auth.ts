import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, authenticateToken, generateToken } from '../middleware/auth';
import { User, LoginRequest, JWTPayload } from '../types';

const router = Router();

// Login
router.post('/login', async (req, res: Response) => {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const payload: JWTPayload = {
      userId: user.id,
      companyId: user.company_id,
      role: user.role,
    };
    const token = generateToken(payload);

    console.log('=== LOGIN SUCCESS ===');
    console.log('Username:', user.username);
    console.log('User ID:', user.id);
    console.log('Company ID:', user.company_id);
    console.log('Role:', user.role);
    console.log('=====================');

    // Return user data (without password)
    const { password_hash, ...userWithoutPassword } = user;
    return res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Register with invitation token
router.post('/register', async (req, res: Response) => {
  try {
    const { token, username, password } = req.body;

    if (!token || !username || !password) {
      return res.status(400).json({ error: 'Token, username, and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find valid invitation
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (!invitation) {
      return res.status(400).json({ error: 'Invalid invitation token' });
    }

    if (invitation.used) {
      return res.status(400).json({ error: 'Invitation has already been used' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await supabase.from('users').insert({
      company_id: invitation.company_id,
      username,
      password_hash: passwordHash,
      role: invitation.role,
      custom_role_name: invitation.custom_role_name || null,
      language_preference: 'pt',
      theme_preference: 'light'
    });

    // Mark invitation as used
    await supabase
      .from('invitations')
      .update({ used: true })
      .eq('id', invitation.id);

    return res.json({ message: 'Registration successful. You can now login.' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (just invalidates the token on client side - no server action needed)
router.post('/logout', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Password recovery request (logs to console in dev mode)
router.post('/recover-password', async (req, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If the username exists, password reset instructions will be sent' });
    }

    // Generate reset token (in production, this would be sent via email)
    const resetToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    console.log('\n========================================');
    console.log('PASSWORD RESET LINK (Development Mode)');
    console.log('========================================');
    console.log(`User: ${username}`);
    console.log(`Reset URL: http://localhost:5173/reset-password?token=${resetToken}`);
    console.log('========================================\n');

    return res.json({ message: 'If the username exists, password reset instructions will be sent' });
  } catch (error) {
    console.error('Password recovery error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (for logged-in users)
router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', req.user.userId);

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Decode token
    let userId: number;
    let tokenTime: number;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [userIdStr, timeStr] = decoded.split(':');
      userId = parseInt(userIdStr, 10);
      tokenTime = parseInt(timeStr, 10);
    } catch {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Check if token is expired (1 hour validity)
    if (Date.now() - tokenTime > 3600000) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
