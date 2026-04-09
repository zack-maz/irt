import type { Request, Response, NextFunction } from 'express';

/**
 * Typed application error with HTTP status code and machine-readable error code.
 * Throw from routes/middleware to produce consistent error responses.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Centralized Express error handler.
 *
 * Produces a consistent JSON envelope:
 *   { error, code, statusCode, requestId, stack? }
 *
 * - AppError instances carry their own statusCode + code.
 * - Generic Errors default to 500 / INTERNAL_ERROR.
 * - Stack traces are included in non-production environments.
 * - Uses pino-http's request-scoped logger (req.log) when available.
 */
/**
 * pino-http injects a request-scoped child logger as `req.log`. The base Express
 * Request type doesn't declare it, so we narrow at the call site instead of
 * mutating the global Request type.
 */
type PinoLogger = { error: (obj: unknown, msg?: string) => void };

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  // pino-http sets req.id to a string; the Express type widens it to ReqId.
  const requestId = (req.id as string | undefined) ?? 'unknown';

  const body: Record<string, unknown> = {
    error: err.message || 'Internal server error',
    code,
    statusCode,
    requestId,
  };

  if (process.env.NODE_ENV !== 'production') {
    body.stack = err.stack;
  }

  // Use pino-http's request-scoped logger when available (carries request ID),
  // fall back silently if pino-http is not wired (e.g. in tests without it).
  const reqWithLog = req as Request & { log?: PinoLogger };
  if (typeof reqWithLog.log?.error === 'function') {
    reqWithLog.log.error({ err, statusCode, code }, 'request error');
  }

  res.status(statusCode).json(body);
}
