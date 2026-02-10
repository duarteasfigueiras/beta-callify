import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a cryptographically secure CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Set CSRF token as a non-httpOnly cookie (so JavaScript can read it)
export function setCsrfCookie(res: Response): void {
  const token = generateCsrfToken();
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // JS must be able to read this to send as header
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours (match access token)
    path: '/',
  });
}

// Paths excluded from CSRF validation (unauthenticated or external endpoints)
// SECURITY: Use exact paths only — no prefix matching to prevent bypass via subpaths
const CSRF_EXEMPT_EXACT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/recover-password',
  '/api/auth/reset-password',
  '/api/auth/logout',
  '/api/health',
];

// Prefix paths for external service webhooks (server-to-server, no cookies/CSRF possible)
const CSRF_EXEMPT_PREFIXES = [
  '/api/stripe/webhook',
  '/api/webhooks/',
  '/api/n8n/',
];

// Middleware to validate CSRF token on state-changing requests
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Only check state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for exempt paths
  // SECURITY: Exact match for auth paths, prefix match only for external webhooks
  const isExactExempt = CSRF_EXEMPT_EXACT_PATHS.includes(req.path);
  const isPrefixExempt = CSRF_EXEMPT_PREFIXES.some(prefix => req.path.startsWith(prefix));
  if (isExactExempt || isPrefixExempt) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    console.warn(`[CSRF] Token missing: cookie=${!!cookieToken}, header=${!!headerToken}, path=${req.path}`);
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    const cookieBuf = Buffer.from(cookieToken, 'utf8');
    const headerBuf = Buffer.from(headerToken, 'utf8');

    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      console.warn(`[CSRF] Token mismatch: path=${req.path}`);
      res.status(403).json({ error: 'CSRF token invalid' });
      return;
    }
  } catch {
    console.warn(`[CSRF] Validation error: path=${req.path}`);
    res.status(403).json({ error: 'CSRF token invalid' });
    return;
  }

  next();
}
