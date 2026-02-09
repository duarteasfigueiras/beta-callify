import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { JWTPayload, UserRole } from '../types';

// SECURITY: JWT_SECRET must be set in environment variables
const JWT_SECRET: Secret = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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
    // SECURITY: Use explicit algorithm verification
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
    req.user = decoded;
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

// SECURITY: Verify with explicit algorithm to prevent algorithm confusion attacks
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
}

// Verify refresh token and return payload
export function verifyRefreshToken(token: string): JWTPayload & { type?: string } {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload & { type?: string };
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }
  return decoded;
}
