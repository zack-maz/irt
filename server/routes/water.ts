import { Router } from 'express';
import { z } from 'zod';
import { cacheGetSafe, cacheSetSafe } from '../cache/redis.js';
import { logger } from '../lib/logger.js';

const log = logger.child({ module: 'water' });
import { fetchWaterFacilities } from '../adapters/overpass-water.js';
import { saveDevWaterCache, loadDevWaterCache } from '../cache/devFileCache.js';
import { fetchPrecipitation } from '../adapters/open-meteo-precip.js';
import { labelUnnamedFacilities } from '../lib/waterLabeling.js';
import { loadWaterSnapshot } from '../lib/waterSnapshot.js';
import {
  WATER_CACHE_TTL,
  WATER_REDIS_TTL_SEC,
  WATER_PRECIP_CACHE_TTL,
  WATER_PRECIP_REDIS_TTL_SEC,
} from '../config.js';
import { validateQuery } from '../middleware/validate.js';
import { sendValidated } from '../middleware/validateResponse.js';
import { waterResponseSchema } from '../schemas/cacheResponse.js';
import type { WaterFacility } from '../types.js';
import type { PrecipitationData } from '../adapters/open-meteo-precip.js';

/**
 * Phase 27.3.1 R-08 D-30 — minimal filterStats stub for response paths that
 * don't have a fresh fetchWaterFacilities() result to attach (cached hits,
 * dev file cache fallback, error-with-cache fallback, error-without-cache).
 *
 * Schema requires every R-08 field to be present once filterStats is set
 * (waterFilterStatsSchema is .strict()), so all five tally surfaces are
 * zero-initialized here. Provenance fields (source, generatedAt) carry the
 * real value.
 */
function buildEmptyFilterStats(
  source: 'snapshot' | 'redis' | 'overpass',
  generatedAt: string,
): {
  rawCounts: Record<string, number>;
  filteredCounts: Record<string, number>;
  rejections: {
    excluded_location: number;
    not_notable: number;
    no_name: number;
    duplicate: number;
    low_score: number;
    no_city: number;
  };
  byTypeRejections: Record<
    string,
    {
      excluded_location: number;
      not_notable: number;
      no_name: number;
      duplicate: number;
      low_score: number;
      no_city: number;
    }
  >;
  byCountry: Record<string, Record<string, number>>;
  overpass: {
    facilityType: string;
    mirror: string;
    status: number;
    durationMs: number;
    attempts: number;
    ok: boolean;
  }[];
  source: 'snapshot' | 'redis' | 'overpass';
  generatedAt: string;
  enrichment: { withCapacity: number; withCity: number; withRiver: number };
  scoreHistogram: { bucket: string; count: number }[];
} {
  return {
    rawCounts: {},
    filteredCounts: {},
    rejections: {
      excluded_location: 0,
      not_notable: 0,
      no_name: 0,
      duplicate: 0,
      low_score: 0,
      no_city: 0,
    },
    byTypeRejections: {},
    byCountry: {},
    overpass: [],
    source,
    generatedAt,
    enrichment: { withCapacity: 0, withCity: 0, withRiver: 0 },
    scoreHistogram: [],
  };
}

/** Zod schema for /api/water and /api/water/precip query params */
const waterQuerySchema = z.object({
  refresh: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

/** Redis key for cached water facilities */
const FACILITIES_KEY = 'water:facilities';

/** Redis key for cached precipitation data */
const PRECIP_KEY = 'water:precip';

export const waterRouter = Router();

/**
 * GET /api/water
 * Returns water infrastructure facilities with WRI stress indicators.
 *
 * Phase 27.3.1 R-07 multi-user-resilience invariant:
 *   Redis is the canonical source of truth for user requests.
 *   The dev file cache (local dev convenience) and the committed snapshot
 *   (production cold-start floor) sit behind Redis.
 *   The Overpass API is NEVER on a synchronous user-request path in
 *   production — cold-start misses are served from the snapshot, which
 *   populates Redis on the first hit. From that point on, Overpass is
 *   reachable only via `npm run refresh:water` (a manual developer action)
 *   or a legacy `?refresh=true` query param (dev + Vercel cron only; see
 *   forceRefresh gate below).
 *   See Phase 27.3.1 R-04 / R-07 and CONTEXT.md D-13, D-25 through D-27.
 *
 * Tier order on a standard GET (forceRefresh=false):
 *   1. Redis (24h logical TTL)
 *   2. Dev file cache (local-only, NODE_ENV=development — gitignored)
 *   3. Committed snapshot (src/data/water-facilities.json — R-04)
 *   4. Overpass API (only when all three above miss AND forceRefresh-gated
 *      callers are permitted; in production, users cannot trigger this)
 *
 * ?refresh=true triggers a forced cache refresh. In production, only Vercel
 * cron (identified by user-agent) can trigger this. In dev, it always works.
 * The Vercel function timeout (60s maxDuration) provides the hard cap in
 * production; in local dev, the 90s per-query Overpass timeout handles it.
 */
waterRouter.get('/', validateQuery(waterQuerySchema), async (req, res) => {
  log.info('GET /api/water hit');
  const isCron = req.headers['user-agent']?.includes('vercel-cron');
  const { refresh } = res.locals.validatedQuery as z.infer<typeof waterQuerySchema>;
  const forceRefresh = refresh && (isCron || process.env.NODE_ENV !== 'production');
  const cached = await cacheGetSafe<WaterFacility[]>(FACILITIES_KEY, WATER_CACHE_TTL);
  log.info(
    { cacheHit: !!cached, count: cached?.data.length, stale: cached?.stale },
    'cache result',
  );

  if (cached && !cached.stale && !forceRefresh) {
    // Phase 27.3.1 R-08 D-30 — attach a minimal filterStats stub with
    // source='redis' and generatedAt derived from the cache entry's
    // lastFresh, so the DevApiStatus provenance header always renders.
    // Cached payloads don't carry the original byCountry/overpass tallies —
    // those require a fresh fetch; tally fields stay empty here.
    return sendValidated(res, waterResponseSchema, {
      ...cached,
      filterStats: buildEmptyFilterStats('redis', new Date(cached.lastFresh).toISOString()),
    });
  }

  // Tier 2 — Dev file cache fallback before snapshot / Overpass call.
  // Dev-only (gitignored, ephemeral) — shadows the snapshot for local
  // iteration speed. In production NODE_ENV this branch always returns null
  // via loadDevWaterCache's isDev guard, so the snapshot tier below fires.
  if (!forceRefresh) {
    const devCached = loadDevWaterCache<{ facilities: WaterFacility[]; stats: unknown }>();
    if (devCached) {
      const labeled = await labelUnnamedFacilities(devCached.facilities);
      await cacheSetSafe(FACILITIES_KEY, labeled, WATER_REDIS_TTL_SEC);
      // Phase 27.3.1 R-04 D-13 — dev file cache shadows the snapshot; both
      // are the same tier semantically (cold-start floor). Report
      // source='snapshot' so DevApiStatus doesn't mislead the operator into
      // thinking Redis served it when it actually came from disk.
      return sendValidated(res, waterResponseSchema, {
        data: labeled,
        stale: false,
        lastFresh: Date.now(),
        filterStats: buildEmptyFilterStats('snapshot', new Date().toISOString()),
      });
    }
  }

  // Tier 3 — Committed JSON snapshot (R-04 D-11 through D-15).
  //   The snapshot is the production cold-start floor. Reads once per
  //   process lifetime (in-module cache inside loadWaterSnapshot), then
  //   populates Redis so subsequent requests hit Tier 1. This is the
  //   mechanism that takes Overpass off the user-request path entirely
  //   (R-07 invariant).
  //
  //   `labelUnnamedFacilities` still runs here as a safety net: in the
  //   rare case a snapshot facility somehow retained a generic "Dam"
  //   label (non-Latin OSM name that hit the extractLabel sentinel AND
  //   no geocode cache during refresh), this gives it a "Dam near
  //   {city}" label at the moment of serve. Normal operation: the
  //   refresh script already reverse-geocoded everything, so this is
  //   a near-no-op.
  if (!forceRefresh) {
    const snapshot = loadWaterSnapshot();
    if (snapshot) {
      const labeled = await labelUnnamedFacilities(snapshot.facilities);
      await cacheSetSafe(FACILITIES_KEY, labeled, WATER_REDIS_TTL_SEC);
      log.info(
        { count: labeled.length, generatedAt: snapshot.generatedAt },
        'serving water facilities from committed snapshot; Overpass untouched',
      );
      return sendValidated(res, waterResponseSchema, {
        data: labeled,
        stale: false,
        lastFresh: Date.now(),
        filterStats: snapshot.stats, // source='snapshot' already set inside loadWaterSnapshot
      });
    }
  }

  try {
    const { facilities: raw, stats: filterStats } = await fetchWaterFacilities();
    const facilities = await labelUnnamedFacilities(raw);
    await cacheSetSafe(FACILITIES_KEY, facilities, WATER_REDIS_TTL_SEC);
    saveDevWaterCache({ facilities, stats: filterStats });
    // REV-4 wiring: include filterStats in non-cached response so DevApiStatus can render diagnostics.
    // Phase 27.3.1 R-08: filterStats already carries source='overpass' + generatedAt (set by
    // fetchWaterFacilities), plus byCountry/overpass/byTypeRejections tallies.
    sendValidated(res, waterResponseSchema, {
      data: facilities,
      stale: false,
      lastFresh: Date.now(),
      filterStats,
    });
  } catch (err) {
    log.error({ err }, 'Overpass error');
    if (cached) {
      // Phase 27.3.1 R-08 D-30 — serving stale cache after upstream error;
      // source='redis' to match the cached-hit branch.
      sendValidated(res, waterResponseSchema, {
        data: cached.data,
        stale: true,
        lastFresh: cached.lastFresh,
        filterStats: buildEmptyFilterStats('redis', new Date(cached.lastFresh).toISOString()),
      });
    } else {
      log.warn('Overpass failed, returning empty');
      // Phase 27.3.1 R-08 D-30 — no cache and Overpass failed; report
      // source='overpass' (attempted but failed) with current timestamp.
      // overpass[] telemetry from the partial fetch isn't available here
      // because fetchWaterFacilities throws before stats are returned;
      // accepted gap — the snapshot tier above makes this branch rare.
      sendValidated(res, waterResponseSchema, {
        data: [],
        stale: true,
        lastFresh: 0,
        filterStats: buildEmptyFilterStats('overpass', new Date().toISOString()),
      });
    }
  }
});

/**
 * GET /api/water/precip
 * Returns 30-day precipitation data for cached water facilities.
 * Cache-first with 6h logical TTL.
 */
waterRouter.get('/precip', validateQuery(waterQuerySchema), async (_req, res) => {
  const { refresh: forceRefresh } = res.locals.validatedQuery as z.infer<typeof waterQuerySchema>;
  const cachedPrecip = await cacheGetSafe<PrecipitationData[]>(PRECIP_KEY, WATER_PRECIP_CACHE_TTL);

  if (cachedPrecip && !cachedPrecip.stale && !forceRefresh) {
    return res.json(cachedPrecip);
  }

  try {
    // Load facilities from cache (or fetch if needed)
    let facilities: WaterFacility[] = [];
    const cachedFacilities = await cacheGetSafe<WaterFacility[]>(FACILITIES_KEY, WATER_CACHE_TTL);
    if (cachedFacilities) {
      facilities = cachedFacilities.data;
    } else {
      const { facilities: rawFacilities } = await fetchWaterFacilities();
      facilities = await labelUnnamedFacilities(rawFacilities);
      await cacheSetSafe(FACILITIES_KEY, facilities, WATER_REDIS_TTL_SEC);
    }

    // Extract coordinates and fetch precipitation
    const locations = facilities.map((f) => ({ lat: f.lat, lng: f.lng }));
    const precipData = await fetchPrecipitation(locations);

    // Only cache non-empty results — empty means all batches failed
    if (precipData.length > 0) {
      await cacheSetSafe(PRECIP_KEY, precipData, WATER_PRECIP_REDIS_TTL_SEC);
    }
    res.json({ data: precipData, stale: false, lastFresh: Date.now() });
  } catch (err) {
    log.error({ err }, 'precipitation fetch error');
    if (cachedPrecip) {
      res.json({ data: cachedPrecip.data, stale: true, lastFresh: cachedPrecip.lastFresh });
    } else {
      throw err;
    }
  }
});
