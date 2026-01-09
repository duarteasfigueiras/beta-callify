import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbGet, dbRun } from '../db/database';
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
    const user = await dbGet<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
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
    const invitation = await dbGet<{
      id: number;
      company_id: number;
      role: string;
      used: number;
      expires_at: string;
    }>(
      'SELECT * FROM invitations WHERE token = ?',
      [token]
    );

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
    const existingUser = await dbGet<{ id: number }>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await dbRun(
      `INSERT INTO users (company_id, username, password_hash, role, language_preference, theme_preference)
       VALUES (?, ?, ?, ?, 'pt', 'light')`,
      [invitation.company_id, username, passwordHash, invitation.role]
    );

    // Mark invitation as used
    await dbRun(
      'UPDATE invitations SET used = 1 WHERE id = ?',
      [invitation.id]
    );

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

    const user = await dbGet<User>(
      'SELECT * FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
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

    const user = await dbGet<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

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
    const { dbRun } = require('../db/database');
    await dbRun(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
