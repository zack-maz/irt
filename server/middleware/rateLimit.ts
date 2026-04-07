import type { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '../cache/redis.js';

/**
 * Create a sliding-window rate limiter middleware backed by Upstash Redis.
 *
 * - Skips entirely in non-production / non-Vercel environments to keep the
 *   local dev loop fast and avoid Redis writes during tests.
 * - Identifies callers by `req.ip`, falling back to the `x-forwarded-for`
 *   header when behind a proxy, then `'anonymous'` for sandboxed tools.
 * - Always sets `X-RateLimit-{Limit,Remaining,Reset}` response headers so
 *   clients can implement client-side backoff.
 * - On rejection, returns the canonical error envelope from
 *   `server/middleware/errorHandler.ts`:
 *
 *   ```json
 *   { "error": "Too many requests", "code": "RATE_LIMITED", "statusCode": 429 }
 *   ```
 */
export function createRateLimiter(maxRequests: number, windowSec: number) {
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
    prefix: 'ratelimit:prod',
  });

  return async function rateLimitHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Skip rate limiting in local development
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      next();
      return;
    }

    const identifier = req.ip ?? (req.headers['x-forwarded-for'] as string) ?? 'anonymous';

    const result = await limiter.limit(identifier);

    res.set('X-RateLimit-Limit', String(result.limit));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    res.set('X-RateLimit-Reset', String(result.reset));

    if (!result.success) {
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        statusCode: 429,
      });
      return;
    }

    next();
  };
}

/**
 * Per-endpoint rate limiters with tuned limits.
 *
 * Limits are deliberately differentiated by client polling cadence and
 * upstream cost: routes with aggressive client polling (flights, ships) get
 * the largest budgets, expensive serverless routes (events, news) get the
 * smallest, and routes that fetch once per session (sites, water) sit in
 * between. All limits are per-IP per-minute.
 */
export const rateLimiters = {
  /** 120 req/min — flights poll every 5s in the browser; allow 2x headroom for tab focus bursts. */
  flights: createRateLimiter(120, 60),
  /** 60 req/min — ships poll every 30s; allow burst when AISStream batches arrive. */
  ships: createRateLimiter(60, 60),
  /** 20 req/min — events served from 15-min GDELT cache; clients rarely re-fetch. */
  events: createRateLimiter(20, 60),
  /** 20 req/min — news served from 15-min GDELT DOC cache; matches events cadence. */
  news: createRateLimiter(20, 60),
  /** 30 req/min — markets poll every 60s; allow modest burst on tab focus. */
  markets: createRateLimiter(30, 60),
  /** 10 req/min — weather refreshed at 30-min cache TTL; barely polled. */
  weather: createRateLimiter(10, 60),
  /** 10 req/min — sites are static infrastructure, fetched once on mount. */
  sites: createRateLimiter(10, 60),
  /** 30 req/min — /api/sources is a lightweight config check, can spike on UI mounts. */
  sources: createRateLimiter(30, 60),
  /** 10 req/min — Nominatim downstream caps us at 1 rps; cache aggressively. */
  geocode: createRateLimiter(10, 60),
  /** 10 req/min — water facilities are static, fetched once on mount. */
  water: createRateLimiter(10, 60),
} as const;
