import { cacheGetSafe, cacheSetSafe } from '../cache/redis.js';
import { reverseGeocode } from '../adapters/nominatim.js';
import { FACILITY_TYPE_LABELS } from '../adapters/overpass-water.js';
import { logger } from './logger.js';
import type { WaterFacility } from '../types.js';

const log = logger.child({ module: 'water-labeling' });

/** Redis cache key prefix for reverse geocode results (shared with geocode route) */
const GEOCODE_CACHE_PREFIX = 'geocode:';
/** 30-day logical TTL for geocode cache */
const GEOCODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 90-day hard Redis TTL for geocode cache */
const GEOCODE_REDIS_TTL_SEC = 90 * 24 * 60 * 60;

/** Known generic type labels produced by extractLabel when no OSM name exists */
const GENERIC_LABELS = new Set<string>(Object.values(FACILITY_TYPE_LABELS));

/** Max unnamed facilities to reverse geocode per cold cache run */
const MAX_GEOCODE_COUNT = 500;

/**
 * Reverse-geocode unnamed facilities to produce "Type near City" labels.
 *
 * Phase 27.3.1 R-04: extracted from `server/routes/water.ts` into a shared
 * module so both the route (runtime cold-start fallback) and the refresh
 * script (`scripts/refresh-water-facilities.ts`) invoke the identical
 * labeling pipeline. Sharing the function preserves the Phase 27.3 truth-19
 * guarantee: "labelUnnamedFacilities never writes 'Unknown'".
 *
 * Uses Redis cache (30-day TTL) so only the first cold-cache run is slow.
 * Respects Nominatim 1 req/s rate limit for uncached calls.
 */
export async function labelUnnamedFacilities(
  facilities: WaterFacility[],
): Promise<WaterFacility[]> {
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
      const place = location.city ?? location.country;
      if (place) {
        f.label = `${FACILITY_TYPE_LABELS[f.facilityType]} near ${place}`;
      }
      // else: keep the generic type label intact — never write "near Unknown" (Phase 27.3 Plan 04 / UAT Test 3)
      continue;
    }

    // Cache miss — call Nominatim with rate limit delay
    try {
      const geo = await reverseGeocode(f.lat, f.lng);
      await cacheSetSafe(cacheKey, geo, GEOCODE_REDIS_TTL_SEC);
      const place = geo.city ?? geo.country;
      if (place) {
        f.label = `${FACILITY_TYPE_LABELS[f.facilityType]} near ${place}`;
      }
      // else: keep the generic type label intact (Phase 27.3 Plan 04 / UAT Test 3)
    } catch (err) {
      log.warn({ err, facilityId: f.id }, 'reverse geocode failed for unnamed facility');
    }

    // 1 req/s rate limit for Nominatim (only for uncached calls)
    await new Promise((resolve) => setTimeout(resolve, 1050));
  }

  return facilities;
}
