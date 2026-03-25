import type { Request, Response, NextFunction } from 'express';
import { log } from '../lib/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const status = res.statusCode;

    let level: 'info' | 'warn' | 'error' = 'info';
    if (status >= 500) level = 'error';
    else if (status >= 400) level = 'warn';

    log({
      level,
      message: `${req.method} ${req.path} ${status} ${durationMs}ms`,
      method: req.method,
      path: req.path,
      status,
      durationMs,
    });
  });

  next();
}
