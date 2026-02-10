import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { JWTPayload, UserRole } from '../types';
import { supabase } from '../db/supabase';

// SECURITY: JWT_SECRET must be set in environment variables with minimum 32 characters
const JWT_SECRET: Secret = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
}
if (typeof JWT_SECRET === 'string' && JWT_SECRET.length < 32) {
  console.error('WARNING: JWT_SECRET should be at least 32 characters for production security. Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}

// SECURITY: Previous secrets for graceful key rotation
// Set JWT_SECRET_PREVIOUS to a comma-separated list of old secrets when rotating.
// These are only used for VERIFICATION (not signing). Remove after max token lifetime (30 days).
const JWT_PREVIOUS_SECRETS: Secret[] = (process.env.JWT_SECRET_PREVIOUS || '')
  .split(',')
  .map(s => s.trim())
  .filter(s => s.length > 0);

if (JWT_PREVIOUS_SECRETS.length > 0) {
  console.log(`[Auth] Key rotation active: ${JWT_PREVIOUS_SECRETS.length} previous secret(s) accepted for verification`);
}

// Try to verify a token against the current secret, then fall back to previous secrets
function verifyWithRotation(token: string): JWTPayload {
  // Try current secret first
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
  } catch (primaryError) {
    // If no previous secrets, throw immediately
    if (JWT_PREVIOUS_SECRETS.length === 0) {
      throw primaryError;
    }

    // Try each previous secret
    for (const secret of JWT_PREVIOUS_SECRETS) {
      try {
        return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
      } catch {
        // Continue to next secret
      }
    }

    // All secrets failed - throw the original error
    throw primaryError;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  // SECURITY: Read token from httpOnly cookie first, fallback to Authorization header (for API clients)
  const cookieToken = req.cookies?.accessToken;
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    // SECURITY: Verify with key rotation support
    const decoded = verifyWithRotation(token) as JWTPayload & { iat?: number };
    req.user = decoded;

    // SECURITY: Check if password was changed after token was issued (invalidates all sessions)
    if (decoded.iat) {
      const { data: user } = await supabase
        .from('users')
        .select('password_changed_at')
        .eq('id', decoded.userId)
        .single();

      if (user?.password_changed_at) {
        const passwordChangedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
        if (decoded.iat < passwordChangedAt) {
          res.status(401).json({ error: 'Session invalidated due to password change' });
          return;
        }
      }
    }

    next();
  } catch (error) {
    // Return 401 for expired/invalid tokens so frontend can redirect to login
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

// Always sign with the CURRENT secret
export function generateToken(payload: JWTPayload): string {
  // SECURITY: Shorter expiration, explicit algorithm
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '8h',
    algorithm: 'HS256'
  });
}

// Generate refresh token with longer expiration (30 days)
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, {
    expiresIn: '30d',
    algorithm: 'HS256'
  });
}

// SECURITY: Verify with key rotation and explicit algorithm
export function verifyToken(token: string): JWTPayload {
  return verifyWithRotation(token);
}

// Verify refresh token with key rotation support
export function verifyRefreshToken(token: string): JWTPayload & { type?: string } {
  // Try current secret first, then previous secrets
  let decoded: JWTPayload & { type?: string };

  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload & { type?: string };
  } catch (primaryError) {
    if (JWT_PREVIOUS_SECRETS.length === 0) {
      throw primaryError;
    }

    let found = false;
    for (const secret of JWT_PREVIOUS_SECRETS) {
      try {
        decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload & { type?: string };
        found = true;
        break;
      } catch {
        // Continue to next secret
      }
    }

    if (!found) {
      throw primaryError;
    }
  }

  if (decoded!.type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }
  return decoded!;
}
