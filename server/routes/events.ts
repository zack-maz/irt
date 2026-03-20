import { Router } from 'express';
import { cacheGet, cacheSet } from '../cache/redis.js';
import { fetchEvents } from '../adapters/gdelt.js';
import { WAR_START, CACHE_TTL } from '../constants.js';
import type { ConflictEventEntity } from '../types.js';

/** Redis key for accumulated GDELT events */
const EVENTS_KEY = 'events:gdelt';

/** Logical TTL in ms -- used to compute staleness (15 minutes) */
const LOGICAL_TTL_MS = CACHE_TTL.events;

/** Hard Redis TTL in seconds -- 10x logical TTL (2.5 hours) for stale-but-servable data */
const REDIS_TTL_SEC = 9000;

export const eventsRouter = Router();

eventsRouter.get('/', async (_req, res) => {
  // Check cache first
  const cached = await cacheGet<ConflictEventEntity[]>(EVENTS_KEY, LOGICAL_TTL_MS);

  if (cached && !cached.stale) {
    return res.json(cached);
  }

  try {
    const fresh = await fetchEvents();

    // Merge: seed with cached data (if any), then overwrite with fresh events
    const eventMap = new Map<string, ConflictEventEntity>();
    if (cached) {
      for (const event of cached.data) {
        eventMap.set(event.id, event);
      }
    }
    for (const event of fresh) {
      eventMap.set(event.id, event);
    }

    // Prune events with timestamp before WAR_START
    for (const [id, event] of eventMap) {
      if (event.timestamp < WAR_START) {
        eventMap.delete(id);
      }
    }

    const merged = Array.from(eventMap.values());
    await cacheSet(EVENTS_KEY, merged, REDIS_TTL_SEC);
    res.json({ data: merged, stale: false, lastFresh: Date.now() });
  } catch (err) {
    console.error('[events] upstream error:', (err as Error).message);

    if (cached) {
      // Prune stale entries even on error
      const pruned = cached.data.filter((e) => e.timestamp >= WAR_START);
      res.json({ data: pruned, stale: true, lastFresh: cached.lastFresh });
    } else {
      throw err; // Express 5 catches and forwards to errorHandler
    }
  }
});
