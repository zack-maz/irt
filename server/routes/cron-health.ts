import { Router } from 'express';
import { redis, cacheGet } from '../cache/redis.js';
import { log } from '../lib/logger.js';

export const cronHealthRouter = Router();

/** Cache keys for per-source freshness checks */
const SOURCE_KEYS: Record<string, string> = {
  flights: 'flights:adsblol',
  ships: 'ships:ais',
  events: 'events:gdelt',
  news: 'news:gdelt',
  markets: 'markets:yahoo:1d',
  weather: 'weather:open-meteo',
  sites: 'sites:v2',
};

/** If a source's lastFresh is older than this, log a warning */
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

cronHealthRouter.get('/', async (_req, res) => {
  const now = Date.now();
  let redisOk = false;

  // Ping Redis
  try {
    await redis.ping();
    redisOk = true;
  } catch {
    log({ level: 'error', message: 'Cron health: Redis ping failed' });
  }

  // Query per-source freshness
  const sources: Record<string, { lastFresh: number | null; stale: boolean }> = {};
  const warnings: string[] = [];

  await Promise.all(
    Object.entries(SOURCE_KEYS).map(async ([name, key]) => {
      try {
        const entry = await cacheGet(key, 999_999_999);
        const lastFresh = entry?.lastFresh ?? null;
        const stale = lastFresh !== null && now - lastFresh > STALE_THRESHOLD_MS;

        sources[name] = { lastFresh, stale };

        if (stale) {
          const ageMin = Math.round((now - lastFresh!) / 60_000);
          warnings.push(`${name}: stale (${ageMin}min old)`);
        } else if (lastFresh === null) {
          warnings.push(`${name}: no data`);
        }
      } catch {
        sources[name] = { lastFresh: null, stale: false };
        warnings.push(`${name}: fetch error`);
      }
    }),
  );

  // Log results
  if (warnings.length > 0) {
    log({
      level: 'warn',
      message: `Cron health: ${warnings.length} warning(s) — ${warnings.join(', ')}`,
    });
  } else {
    log({
      level: 'info',
      message: 'Cron health: all sources healthy',
    });
  }

  res.json({
    status: redisOk ? 'ok' : 'degraded',
    redis: redisOk,
    timestamp: new Date().toISOString(),
    sources,
    warnings,
  });
});
