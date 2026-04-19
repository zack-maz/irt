import { Router } from 'express';
import { z } from 'zod';
import { cacheGetSafe, cacheSetSafe } from '../cache/redis.js';
import { logger } from '../lib/logger.js';
import { fetchSites, type SiteFilterStats } from '../adapters/overpass.js';
import { loadSitesSnapshot } from '../lib/sitesSnapshot.js';
import { SITES_CACHE_TTL } from '../config.js';
import { validateQuery } from '../middleware/validate.js';
import { sendValidated } from '../middleware/validateResponse.js';
import { sitesResponseSchema } from '../schemas/cacheResponse.js';
import { AppError } from '../middleware/errorHandler.js';
import type { SiteEntity } from '../types.js';

const log = logger.child({ module: 'sites' });

/** Zod schema for /api/sites query params */
const sitesQuerySchema = z.object({
  refresh: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

/** Redis key for all cached infrastructure sites */
const SITES_KEY = 'sites:v2';

/** Logical TTL in ms -- 24 hours for static site data */
const LOGICAL_TTL_MS = SITES_CACHE_TTL;

/** Hard Redis TTL in seconds -- 3 days fallback window */
const REDIS_TTL_SEC = 259_200;

/**
 * Phase 27.3.1 R-05 D-30 parity — minimal filterStats stub for response paths
 * that don't have a fresh fetchSites() result to attach (cached hits,
 * error-with-cache fallback). sitesResponseSchema is .strict() once
 * filterStats is present so all R-05 fields must be initialized — zero-tally
 * provenance-only here.
 */
function buildEmptyFilterStats(
  source: 'snapshot' | 'redis' | 'overpass',
  generatedAt: string,
): SiteFilterStats {
  return {
    rawCount: 0,
    filteredCount: 0,
    rejections: { excluded_turkey: 0, no_coords: 0, no_type: 0, duplicate: 0 },
    byCountry: {},
    byType: {},
    overpass: [],
    source,
    generatedAt,
  };
}

export const sitesRouter = Router();

/**
 * GET /api/sites
 * Returns infrastructure sites (nuclear, naval, oil, airbase, port).
 *
 * Phase 27.3.1 R-07 multi-user-resilience invariant:
 *   Redis is the canonical source of truth for user requests.
 *   The committed snapshot (src/data/sites.json, R-05 D-16..D-18) sits
 *   behind Redis as the production cold-start floor.
 *   The Overpass API is NEVER on a synchronous user-request path in
 *   production — cold-start misses are served from the snapshot, which
 *   populates Redis on the first hit. From that point on, Overpass is
 *   reachable only via `npm run refresh:sites` (a manual developer action)
 *   or a legacy `?refresh=true` query param.
 *   See Phase 27.3.1 R-04 / R-05 / R-07 and CONTEXT.md D-16..D-18, D-25..D-27.
 *
 * Tier order on a standard GET (forceRefresh=false):
 *   1. Redis (24h logical TTL — `sites:v2`)
 *   2. Committed snapshot (src/data/sites.json — R-05)
 *   3. Overpass API (only when both above miss AND refresh gate permits)
 */
sitesRouter.get('/', validateQuery(sitesQuerySchema), async (_req, res) => {
  const { refresh: forceRefresh } = res.locals.validatedQuery as z.infer<typeof sitesQuerySchema>;
  const cached = await cacheGetSafe<SiteEntity[]>(SITES_KEY, LOGICAL_TTL_MS);

  if (cached && !cached.stale && !forceRefresh) {
    return sendValidated(res, sitesResponseSchema, {
      ...cached,
      filterStats: buildEmptyFilterStats('redis', new Date(cached.lastFresh).toISOString()),
    });
  }

  // Tier 2 — committed JSON snapshot (R-05 D-16..D-18).
  //   Cold Redis → read snapshot → populate Redis → serve with source='snapshot'.
  //   Keeps Overpass off the synchronous user-request path entirely.
  if (!forceRefresh) {
    const snapshot = loadSitesSnapshot();
    if (snapshot) {
      await cacheSetSafe(SITES_KEY, snapshot.sites, REDIS_TTL_SEC);
      log.info(
        { count: snapshot.sites.length, generatedAt: snapshot.generatedAt },
        'serving sites from committed snapshot; Overpass untouched',
      );
      return sendValidated(res, sitesResponseSchema, {
        data: snapshot.sites,
        stale: false,
        lastFresh: Date.now(),
        filterStats: snapshot.stats, // source='snapshot' already forced in loadSitesSnapshot
      });
    }
  }

  try {
    const { sites, stats } = await fetchSites();
    await cacheSetSafe(SITES_KEY, sites, REDIS_TTL_SEC);
    sendValidated(res, sitesResponseSchema, {
      data: sites,
      stale: false,
      lastFresh: Date.now(),
      filterStats: stats,
    });
  } catch (err) {
    log.error({ err }, 'Overpass error');
    if (cached) {
      sendValidated(res, sitesResponseSchema, {
        data: cached.data,
        stale: true,
        lastFresh: cached.lastFresh,
        filterStats: buildEmptyFilterStats('redis', new Date(cached.lastFresh).toISOString()),
      });
    } else {
      throw new AppError(502, 'UPSTREAM_FAIL', `overpass fetch failed: ${(err as Error).message}`);
    }
  }
});
