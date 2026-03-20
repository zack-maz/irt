import type { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '../cache/redis.js';

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '60 s'),
});

export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const identifier =
    req.ip ?? (req.headers['x-forwarded-for'] as string) ?? 'anonymous';

  const result = await ratelimit.limit(identifier);

  res.set('X-RateLimit-Limit', String(result.limit));
  res.set('X-RateLimit-Remaining', String(result.remaining));
  res.set('X-RateLimit-Reset', String(result.reset));

  if (!result.success) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}
