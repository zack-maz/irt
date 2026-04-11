import { Router } from 'express';
import { z } from 'zod';
import { cacheGetSafe, cacheSetSafe } from '../cache/redis.js';
import { logger } from '../lib/logger.js';

const log = logger.child({ module: 'water' });
import { fetchWaterFacilities, FACILITY_TYPE_LABELS } from '../adapters/overpass-water.js';
import { reverseGeocode } from '../adapters/nominatim.js';
import { fetchPrecipitation } from '../adapters/open-meteo-precip.js';
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

/** Redis cache key prefix for reverse geocode results (shared with geocode route) */
const GEOCODE_CACHE_PREFIX = 'geocode:';
/** 30-day logical TTL for geocode cache */
const GEOCODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 90-day hard Redis TTL for geocode cache */
const GEOCODE_REDIS_TTL_SEC = 90 * 24 * 60 * 60;

/** Known generic type labels produced by extractLabel when no OSM name exists */
const GENERIC_LABELS = new Set(Object.values(FACILITY_TYPE_LABELS));

/** Max unnamed facilities to reverse geocode per cold cache run */
const MAX_GEOCODE_COUNT = 500;

/**
 * Reverse-geocode unnamed facilities to produce "Type near City" labels.
 * Uses Redis cache (30-day TTL) so only the first cold-cache run is slow.
 * Respects Nominatim 1 req/s rate limit for uncached calls.
 */
async function labelUnnamedFacilities(facilities: WaterFacility[]): Promise<WaterFacility[]> {
  const unnamed = facilities.filter((f) => GENERIC_LABELS.has(f.label));
  if (unnamed.length === 0) return facilities;

  const toGeocode = unnamed.slice(0, MAX_GEOCODE_COUNT);
  log.info(
    { unnamed: unnamed.length, geocoding: toGeocode.length },
    'reverse geocoding unnamed water facilities',
  );

  for (const f of toGeocode) {
    const qLat = Math.round(f.lat * 100) / 100;
    const qLon = Math.round(f.lng * 100) / 100;
    const cacheKey = `${GEOCODE_CACHE_PREFIX}${qLat},${qLon}`;

    // Check Redis cache first (avoids Nominatim call + rate limit delay)
    const cached = await cacheGetSafe<{ city?: string; country?: string; display?: string }>(
      cacheKey,
      GEOCODE_TTL_MS,
    );

    if (cached) {
      const location = cached.data;
      const place = location.city ?? location.country ?? 'Unknown';
      f.label = `${FACILITY_TYPE_LABELS[f.facilityType]} near ${place}`;
      continue;
    }

    // Cache miss — call Nominatim with rate limit delay
    try {
      const geo = await reverseGeocode(f.lat, f.lng);
      await cacheSetSafe(cacheKey, geo, GEOCODE_REDIS_TTL_SEC);
      const place = geo.city ?? geo.country ?? 'Unknown';
      f.label = `${FACILITY_TYPE_LABELS[f.facilityType]} near ${place}`;
    } catch (err) {
      log.warn({ err, facilityId: f.id }, 'reverse geocode failed for unnamed facility');
    }

    // 1 req/s rate limit for Nominatim (only for uncached calls)
    await new Promise((resolve) => setTimeout(resolve, 1050));
  }

  return facilities;
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
 * Cache-first with 24h logical TTL.
 *
 * ?refresh=true triggers a forced cache refresh. In production, only Vercel cron
 * (identified by user-agent) can trigger this. In dev, it always works.
 * The Vercel function timeout (60s maxDuration) provides the hard cap in production;
 * in local dev, the 90s per-query Overpass timeout handles it.
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
    return sendValidated(res, waterResponseSchema, cached);
  }

  try {
    const raw = await fetchWaterFacilities();
    const facilities = await labelUnnamedFacilities(raw);
    await cacheSetSafe(FACILITIES_KEY, facilities, WATER_REDIS_TTL_SEC);
    sendValidated(res, waterResponseSchema, {
      data: facilities,
      stale: false,
      lastFresh: Date.now(),
    });
  } catch (err) {
    log.error({ err }, 'Overpass error');
    if (cached) {
      sendValidated(res, waterResponseSchema, {
        data: cached.data,
        stale: true,
        lastFresh: cached.lastFresh,
      });
    } else {
      log.warn('Overpass failed, returning empty');
      sendValidated(res, waterResponseSchema, { data: [], stale: true, lastFresh: 0 });
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
      const raw = await fetchWaterFacilities();
      facilities = await labelUnnamedFacilities(raw);
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
