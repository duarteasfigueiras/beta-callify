import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// SECURITY: Attach a unique request ID to every request for tracing in logs
// Preserve existing x-request-id from upstream proxies/load balancers if present
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers['x-request-id'] as string | undefined;
  // SECURITY: Only accept UUIDs or alphanumeric+dash strings up to 64 chars to prevent header injection
  const isValid = existing && /^[a-zA-Z0-9\-]{1,64}$/.test(existing);
  const requestId = isValid ? existing : crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
