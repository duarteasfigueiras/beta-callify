import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// SECURITY: Attach a unique request ID to every request for tracing in logs
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
