import { Router } from 'express';
import { cacheGet, cacheSet } from '../cache/redis.js';
import { collectShips } from '../adapters/aisstream.js';
import type { ShipEntity } from '../types.js';

export const shipsRouter = Router();

const SHIPS_KEY = 'ships:ais';
const LOGICAL_TTL_MS = 30_000; // 30s -- same as client polling interval
const REDIS_TTL_SEC = 300; // 5min -- 10x of 30s logical TTL
const STALE_THRESHOLD_MS = 600_000; // 10 min -- prune ships not seen in 10 min

shipsRouter.get('/', async (_req, res) => {
  const cached = await cacheGet<ShipEntity[]>(SHIPS_KEY, LOGICAL_TTL_MS);

  // Fresh cache hit -- return immediately
  if (cached && !cached.stale) {
    res.json(cached);
    return;
  }

  try {
    const fresh = await collectShips();

    // Merge: seed with cached ships (if any), then overwrite with fresh
    const shipMap = new Map<string, ShipEntity>();
    if (cached) {
      for (const ship of cached.data) {
        shipMap.set(ship.id, ship);
      }
    }
    for (const ship of fresh) {
      shipMap.set(ship.id, ship);
    }

    // Prune ships not seen in 10 minutes
    const now = Date.now();
    for (const [id, ship] of shipMap) {
      if (ship.timestamp < now - STALE_THRESHOLD_MS) {
        shipMap.delete(id);
      }
    }

    const merged = Array.from(shipMap.values());
    await cacheSet(SHIPS_KEY, merged, REDIS_TTL_SEC);
    res.json({ data: merged, stale: false, lastFresh: Date.now() });
  } catch (err) {
    console.error('[ships] collectShips error:', (err as Error).message);
    if (cached) {
      res.json({ ...cached, stale: true });
    } else {
      res.status(500).json({ error: 'Ship data unavailable' });
    }
  }
});
