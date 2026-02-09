import { Router, Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { supabase } from '../db/supabase';
import { getRedisClient, isRedisAvailable } from '../db/redis';
import { AuthenticatedRequest, authenticateToken, generateToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { User, LoginRequest, JWTPayload } from '../types';

// SECURITY: Generate cryptographically secure tokens
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// SECURITY: Hash tokens before storing in database
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const router = Router();

// Initialize Resend for email sending (optional - works without API key in dev mode)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ============================================
// RATE LIMITING: 8 attempts per 15 minutes
// Uses Redis if available, falls back to in-memory
// ============================================
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// In-memory fallback (used when Redis is not available)
const loginAttempts = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX_ATTEMPTS = 8;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block
const REDIS_RATE_LIMIT_PREFIX = 'ratelimit:';

// ============================================
// PASSWORD VALIDATION: Strong password requirements
// ============================================
interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Get client IP from request (handles proxies)
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Check and update rate limit - uses Redis if available, falls back to in-memory
async function checkRateLimitRedis(identifier: string): Promise<{ allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number }> {
  const redis = getRedisClient();

  if (!redis || !isRedisAvailable()) {
    // Fallback to in-memory
    return checkRateLimitMemory(identifier);
  }

  try {
    const key = `${REDIS_RATE_LIMIT_PREFIX}${identifier}`;
    const blockKey = `${REDIS_RATE_LIMIT_PREFIX}block:${identifier}`;

    // Check if blocked
    const blockedTTL = await redis.ttl(blockKey);
    if (blockedTTL > 0) {
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds: blockedTTL };
    }

    // Increment attempts
    const attempts = await redis.incr(key);

    // Set expiry on first attempt
    if (attempts === 1) {
      await redis.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    }

    if (attempts > RATE_LIMIT_MAX_ATTEMPTS) {
      // Block the user
      const blockSeconds = Math.ceil(RATE_LIMIT_BLOCK_DURATION_MS / 1000);
      await redis.setex(blockKey, blockSeconds, '1');
      console.log(`[Auth] Rate limit exceeded for: ${identifier} (Redis)`);
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds: blockSeconds };
    }

    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - attempts };
  } catch (error) {
    console.warn('[Auth] Redis rate limit error, falling back to memory:', error);
    return checkRateLimitMemory(identifier);
  }
}

// In-memory rate limit check (fallback)
function checkRateLimitMemory(identifier: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  // Clean up old entries periodically
  if (loginAttempts.size > 10000) {
    for (const [key, value] of loginAttempts.entries()) {
      if (now - value.firstAttempt > RATE_LIMIT_WINDOW_MS * 2) {
        loginAttempts.delete(key);
      }
    }
  }

  if (!entry) {
    // First attempt
    loginAttempts.set(identifier, { attempts: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Check if window has expired - reset counter
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(identifier, { attempts: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }

  // Increment attempts
  entry.attempts++;

  if (entry.attempts > RATE_LIMIT_MAX_ATTEMPTS) {
    // Block the user
    entry.blockedUntil = now + RATE_LIMIT_BLOCK_DURATION_MS;
    const retryAfterSeconds = Math.ceil(RATE_LIMIT_BLOCK_DURATION_MS / 1000);
    console.log(`[Auth] Rate limit exceeded for: ${identifier} (Memory)`);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - entry.attempts };
}

// Reset rate limit on successful login
async function resetRateLimitRedis(identifier: string): Promise<void> {
  const redis = getRedisClient();

  if (redis && isRedisAvailable()) {
    try {
      const key = `${REDIS_RATE_LIMIT_PREFIX}${identifier}`;
      const blockKey = `${REDIS_RATE_LIMIT_PREFIX}block:${identifier}`;
      await redis.del(key, blockKey);
    } catch (error) {
      console.warn('[Auth] Redis reset error:', error);
    }
  }

  // Always also clear memory
  loginAttempts.delete(identifier);
}

// Sync version for backwards compatibility
function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
  // Also try to clear Redis asynchronously
  resetRateLimitRedis(identifier).catch(() => {});
}

// Login - supports both email and username for backwards compatibility
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, username, password, rememberMe } = req.body;

    // Support both email (new) and username (legacy)
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // SECURITY: Rate limiting - 8 attempts per 15 minutes (uses Redis if available)
    const clientIP = getClientIP(req);
    const rateLimitKey = `${clientIP}:${loginIdentifier.toLowerCase()}`;
    const rateLimit = await checkRateLimitRedis(rateLimitKey);

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', rateLimit.retryAfterSeconds?.toString() || '900');
      return res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        retryAfterSeconds: rateLimit.retryAfterSeconds
      });
    }

    // Find user by email first, then fallback to username
    let user = null;
    let error = null;

    // Try email first
    const emailResult = await supabase
      .from('users')
      .select('*')
      .eq('email', loginIdentifier)
      .single();

    if (emailResult.data) {
      user = emailResult.data;
    } else {
      // Fallback to username for backwards compatibility
      const usernameResult = await supabase
        .from('users')
        .select('*')
        .eq('username', loginIdentifier)
        .single();

      user = usernameResult.data;
      error = usernameResult.error;
    }

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        remainingAttempts: rateLimit.remainingAttempts
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
        remainingAttempts: rateLimit.remainingAttempts
      });
    }

    // Reset rate limit on successful login
    resetRateLimit(rateLimitKey);

    // Generate JWT token
    const payload: JWTPayload = {
      userId: user.id,
      companyId: user.company_id,
      role: user.role,
    };
    const token = generateToken(payload);

    // Generate refresh token if rememberMe is true
    const refreshToken = rememberMe ? generateRefreshToken(payload) : undefined;

    // SECURITY: Only log minimal info, no sensitive data
    console.log(`[Auth] Login successful: userId=${user.id}, role=${user.role}, rememberMe=${!!rememberMe}`);

    const isProduction = process.env.NODE_ENV === 'production';

    // SECURITY: Set tokens as httpOnly cookies (not accessible via JavaScript)
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      path: '/',
    });

    if (refreshToken) {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/api/auth', // Only sent to auth endpoints
      });
    }

    // Return user data (without password) - tokens no longer in body
    const { password_hash, ...userWithoutPassword } = user;
    return res.json({
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token - get new access token using refresh token (reads from httpOnly cookie)
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // SECURITY: Read refresh token from httpOnly cookie (fallback to body for backwards compat)
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Check if user still exists and is active
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new access token with current user data
    const payload: JWTPayload = {
      userId: user.id,
      companyId: user.company_id,
      role: user.role,
    };
    const newToken = generateToken(payload);

    const isProduction = process.env.NODE_ENV === 'production';

    // SECURITY: Set new access token as httpOnly cookie
    res.cookie('accessToken', newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      path: '/',
    });

    console.log(`[Auth] Token refreshed: userId=${user.id}`);

    return res.json({ success: true });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Register with invitation token
router.post('/register', async (req, res: Response) => {
  try {
    const { token, email, password, display_name, phone_number } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({ error: 'Token, email, and password are required' });
    }

    if (!display_name?.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (!phone_number?.trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // SECURITY: Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
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

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Validate phone number format if provided
    let normalizedPhone: string | null = null;
    if (phone_number) {
      const phoneRegex = /^\+?[0-9]{9,15}$/;
      const cleanPhone = phone_number.replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ error: 'Invalid phone number format. Use format: +351912345678' });
      }

      // Check if phone number already exists in the company
      const { data: existingPhone } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', invitation.company_id)
        .eq('phone_number', cleanPhone)
        .single();

      if (existingPhone) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }

      normalizedPhone = cleanPhone;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with email and other fields
    await supabase.from('users').insert({
      company_id: invitation.company_id,
      email,
      username: email,  // Use email as username for backwards compatibility
      password_hash: passwordHash,
      role: invitation.role,
      custom_role_name: invitation.custom_role_name || null,
      display_name: display_name?.trim() || null,
      phone_number: normalizedPhone,
      language_preference: 'pt',
      theme_preference: 'light'
    });

    // Mark invitation as used
    await supabase
      .from('invitations')
      .update({ used: true })
      .eq('id', invitation.id);

    // Get company name for welcome email
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', invitation.company_id)
      .single();

    const companyName = company?.name || 'AI CoachCall';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendUrl}/login`;

    // Send welcome email
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'AI CoachCall <noreply@aicoachcall.com>',
          to: email,
          subject: `Bem-vindo ao AI CoachCall - ${companyName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .header p { margin: 10px 0 0 0; opacity: 0.9; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .welcome-box { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .feature { display: flex; align-items: flex-start; margin-bottom: 15px; }
                .feature-icon { background: #dcfce7; color: #16a34a; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 16px; flex-shrink: 0; }
                .feature-text { flex: 1; }
                .feature-text strong { color: #15803d; }
                .button { display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                .button:hover { background: #15803d; }
                .info-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Bem-vindo ao AI CoachCall!</h1>
                  <p>A sua conta foi criada com sucesso</p>
                </div>
                <div class="content">
                  <div class="welcome-box">
                    <p>Olá <strong>${display_name?.trim() || 'Utilizador'}</strong>,</p>
                    <p>A sua conta no <strong>AI CoachCall</strong> foi criada com sucesso para a empresa <strong>${companyName}</strong>.</p>
                    <p>Agora pode começar a utilizar o sistema de avaliação de chamadas para melhorar o desempenho da sua equipa.</p>
                  </div>

                  <h3 style="color: #15803d; margin-bottom: 15px;">O que pode fazer no AI CoachCall:</h3>

                  <div class="feature">
                    <div class="feature-icon">📞</div>
                    <div class="feature-text">
                      <strong>Análise de Chamadas</strong><br>
                      Avaliação automática das suas chamadas com IA
                    </div>
                  </div>

                  <div class="feature">
                    <div class="feature-icon">📊</div>
                    <div class="feature-text">
                      <strong>Dashboard Personalizado</strong><br>
                      Acompanhe o seu desempenho e evolução
                    </div>
                  </div>

                  <div class="feature">
                    <div class="feature-icon">💡</div>
                    <div class="feature-text">
                      <strong>Feedback Inteligente</strong><br>
                      Receba sugestões para melhorar as suas chamadas
                    </div>
                  </div>

                  <div class="feature">
                    <div class="feature-icon">🎯</div>
                    <div class="feature-text">
                      <strong>Critérios Personalizados</strong><br>
                      Avaliação baseada nos critérios da sua empresa
                    </div>
                  </div>

                  <div class="info-box">
                    <strong>📧 O seu email de acesso:</strong> ${email}
                  </div>

                  <p style="text-align: center;">
                    <a href="${loginUrl}" class="button">Aceder ao AI CoachCall</a>
                  </p>

                  <p style="text-align: center; color: #6b7280; font-size: 14px;">
                    Se tiver alguma dúvida, contacte o administrador da sua empresa.
                  </p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} AI CoachCall - Sistema de Avaliação de Chamadas</p>
                  <p>Este email foi enviado automaticamente. Por favor não responda.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        console.log(`[Auth] Welcome email sent to: ${email}`);
      } catch (emailError) {
        // Don't fail registration if email fails
        console.error('[Auth] Failed to send welcome email:', emailError);
      }
    } else {
      console.log(`[Auth] Welcome email skipped (no Resend API key configured) for: ${email}`);
    }

    return res.json({ message: 'Registration successful. You can now login.' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout - clear httpOnly cookies
router.post('/logout', (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/auth',
  });

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

// Password recovery request - accepts email, sends reset link
router.post('/recover-password', async (req, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*, companies(name)')
      .eq('email', email)
      .single();

    if (!user) {
      // Don't reveal if user exists or not - always return success message
      return res.json({ message: 'If the email exists, password reset instructions will be sent' });
    }

    // SECURITY: Generate cryptographically secure reset token
    const resetToken = generateSecureToken();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 3600000).toISOString();  // 1 hour

    // Store hashed token in database
    await supabase.from('password_reset_tokens').upsert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used: false
    }, { onConflict: 'user_id' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Try to send email via Resend, fallback to console log in dev mode
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'AI CoachCall <noreply@aicoachcall.com>',
          to: email,
          subject: 'Recuperação de Password - AI CoachCall',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .header p { margin: 10px 0 0 0; opacity: 0.9; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                .button:hover { background: #15803d; }
                .info-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0; }
                .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Recuperação de Password</h1>
                  <p>Pedido de redefinição de password</p>
                </div>
                <div class="content">
                  <p>Olá <strong>${user.display_name || user.username}</strong>,</p>
                  <p>Recebemos um pedido para recuperar a password da sua conta no AI CoachCall${user.companies?.name ? ` (${user.companies.name})` : ''}.</p>
                  <p>Clique no botão abaixo para definir uma nova password:</p>
                  <p style="text-align: center;">
                    <a href="${resetUrl}" class="button">Redefinir Password</a>
                  </p>
                  <div class="info-box">
                    <p style="margin: 0; font-size: 14px;">Ou copie e cole este link no seu navegador:</p>
                    <p style="word-break: break-all; margin: 10px 0 0 0; font-size: 13px; color: #15803d;">${resetUrl}</p>
                  </div>
                  <div class="warning-box">
                    <p style="margin: 0; color: #92400e;"><strong>⏱️ Este link é válido apenas por 1 hora.</strong></p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">Se não pediu esta recuperação, pode ignorar este email. A sua password permanecerá inalterada.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} AI CoachCall - Sistema de Avaliação de Chamadas</p>
                  <p>Este email foi enviado automaticamente. Por favor não responda.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        console.log(`[Auth] Password reset email sent to: ${email}`);
      } catch (emailError) {
        console.error('[Auth] Failed to send email via Resend:', emailError);
        // Fall back to console log
        console.log('\n========================================');
        console.log('PASSWORD RESET LINK (Email failed, showing in console)');
        console.log('========================================');
        console.log(`Email: ${email}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('========================================\n');
      }
    } else {
      // No Resend API key configured - log to console (development mode)
      console.log('\n========================================');
      console.log('PASSWORD RESET LINK (Development Mode)');
      console.log('========================================');
      console.log(`Email: ${email}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('========================================\n');
    }

    return res.json({ message: 'If the email exists, password reset instructions will be sent' });
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

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: 'Password too weak', details: passwordValidation.errors });
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

    // Update password and record timestamp (for token invalidation)
    const now = new Date().toISOString();
    await supabase
      .from('users')
      .update({ password_hash: passwordHash, password_changed_at: now, updated_at: now })
      .eq('id', req.user.userId);

    // Client should discard current tokens and re-login
    return res.json({ message: 'Password changed successfully', requireRelogin: true });
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

    // SECURITY: Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // SECURITY: Hash the provided token and look it up
    const tokenHash = hashToken(token);

    const { data: resetRecord, error: findError } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at, used')
      .eq('token_hash', tokenHash)
      .single();

    if (findError || !resetRecord) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    if (resetRecord.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', resetRecord.user_id);

    if (updateError) {
      throw updateError;
    }

    // SECURITY: Mark token as used (one-time use)
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token_hash', tokenHash);

    console.log(`[Auth] Password reset successful for userId=${resetRecord.user_id}`);
    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
