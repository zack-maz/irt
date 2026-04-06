import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  // Use pino-http's request-scoped logger when available (carries request ID),
  // fall back to module logger if pino-http is not wired (e.g. in tests).
  const log = req.log ?? logger;
  log.error({ err, statusCode, method: req.method, path: req.path }, 'request error');

  res.status(statusCode).json({ error: 'Internal server error' });
}
