// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';
import type { WaterFacility, CacheResponse } from '../../types.js';

// In-memory store backing the Redis mock
interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}
const redisStore = new Map<string, CacheEntry<unknown>>();

/**
 * Zod-valid empty WaterFilterStats stub. Phase 27.3 Plan 01 added
 * waterFilterStatsSchema to server/schemas/cacheResponse.ts requiring all 5
 * sub-fields; the Zod wrapper is `.optional()` but once present the inner
 * object must be well-formed. Serves both as a passing fixture and a
 * reference for what a fresh-fetch filterStats payload looks like.
 *
 * Phase 27.3.1 R-08 (Plan 03): extended with byCountry (D-28), overpass (D-29),
 * source + generatedAt (D-30), and byTypeRejections (D-31). Schema is `.strict()`
 * on these fields once filterStats is present, so fixtures MUST include them.
 */
const emptyStats = {
  rawCounts: {} as Record<string, number>,
  filteredCounts: {} as Record<string, number>,
  rejections: {
    excluded_location: 0,
    // Phase 27.3.1 Plan 10 (G2) — Turkey country-exclusion bucket.
    excluded_turkey: 0,
    not_notable: 0,
    no_name: 0,
    duplicate: 0,
    low_score: 0,
    no_city: 0,
  },
  byTypeRejections: {} as Record<
    string,
    {
      excluded_location: number;
      excluded_turkey: number; // Phase 27.3.1 Plan 10 (G2)
      not_notable: number;
      no_name: number;
      duplicate: number;
      low_score: number;
      no_city: number;
    }
  >, // Phase 27.3.1 R-08 D-31 (Plan 10 G2 added excluded_turkey)
  byCountry: {} as Record<string, Record<string, number>>, // Phase 27.3.1 R-08 D-28
  overpass: [] as {
    facilityType: string;
    mirror: string;
    status: number;
    durationMs: number;
    attempts: number;
    ok: boolean;
  }[], // Phase 27.3.1 R-08 D-29
  source: 'overpass' as const, // Phase 27.3.1 R-08 D-30
  generatedAt: new Date(0).toISOString(),
  enrichment: { withCapacity: 0, withCity: 0, withRiver: 0 },
  scoreHistogram: [] as { bucket: string; count: number }[],
};

// Module-level mock functions
const mockFetchWaterFacilities = vi.fn(
  async (): Promise<{ facilities: WaterFacility[]; stats: typeof emptyStats }> => ({
    facilities: [],
    stats: emptyStats,
  }),
);
const mockFetchPrecipitation = vi.fn(async () => []);

// Mock rate limiter
const _passThrough = (_req: unknown, _res: unknown, next: () => void) => next();
vi.mock('../../middleware/rateLimit.js', () => ({
  rateLimiters: {
    flights: _passThrough,
    ships: _passThrough,
    events: _passThrough,
    news: _passThrough,
    markets: _passThrough,
    weather: _passThrough,
    sites: _passThrough,
    sources: _passThrough,
    geocode: _passThrough,
    water: _passThrough,
    public: _passThrough,
  },
}));

// Mock config (spread actual to preserve constants)
vi.mock('../../config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config.js')>();
  const mockCfg = {
    port: 0,
    corsOrigin: '*',
    opensky: { clientId: 'test-id', clientSecret: 'test-secret' },
    aisstream: { apiKey: 'test-ais-key' },
    acled: { email: 'test@example.com', password: 'test-pass' },
    newsRelevanceThreshold: 0.7,
    eventConfidenceThreshold: 0.35,
    eventMinSources: 2,
    eventCentroidPenalty: 0.7,
    eventExcludedCameo: ['180', '192'],
    bellingcatCorroborationBoost: 0.2,
  };
  return { ...actual, config: mockCfg, loadConfig: () => mockCfg, getConfig: () => mockCfg };
});

// Mock all existing adapters
vi.mock('../../adapters/opensky.js', () => ({ fetchFlights: vi.fn(async () => []) }));
vi.mock('../../adapters/adsb-lol.js', () => ({ fetchFlights: vi.fn(async () => []) }));
vi.mock('../../adapters/aisstream.js', () => ({
  getShips: vi.fn(() => []),
  getLastMessageTime: vi.fn(() => 0),
  connectAISStream: vi.fn(),
}));
vi.mock('../../adapters/acled.js', () => ({ fetchEvents: vi.fn(async () => []) }));
vi.mock('../../adapters/gdelt.js', () => ({
  fetchEvents: vi.fn(async () => []),
  backfillEvents: vi.fn(async () => []),
}));
vi.mock('../../adapters/overpass.js', () => ({ fetchSites: vi.fn(async () => []) }));
vi.mock('../../adapters/gdelt-doc.js', () => ({ fetchGdeltArticles: vi.fn(async () => []) }));
vi.mock('../../adapters/rss.js', () => ({
  fetchAllRssFeeds: vi.fn(async () => []),
  RSS_FEEDS: [],
}));
vi.mock('../../adapters/yahoo-finance.js', () => ({
  fetchMarkets: vi.fn(async () => []),
  isValidRange: vi.fn(() => true),
}));
vi.mock('../../adapters/nominatim.js', () => ({
  reverseGeocode: vi.fn(async () => ({ display: 'Unknown location' })),
}));
vi.mock('../../adapters/open-meteo.js', () => ({ fetchWeather: vi.fn(async () => []) }));
vi.mock('../../cache/devFileCache.js', () => ({
  saveDevWaterCache: vi.fn(),
  loadDevWaterCache: vi.fn(() => null),
  saveDevLLMCache: vi.fn(),
  loadDevLLMCache: vi.fn(() => null),
}));

// Mock water adapters
vi.mock('../../adapters/overpass-water.js', () => ({
  fetchWaterFacilities: (...args: unknown[]) => mockFetchWaterFacilities(...args),
  FACILITY_TYPE_LABELS: {
    dam: 'Dam',
    reservoir: 'Reservoir',
    desalination: 'Desalination Plant',
  },
}));
vi.mock('../../adapters/open-meteo-precip.js', () => ({
  fetchPrecipitation: (...args: unknown[]) => mockFetchPrecipitation(...args),
}));

// Phase 27.3.1 R-04 — mock the snapshot loader so the route's tier 3 can be
// exercised without a real src/data/water-facilities.json on disk. Defaults
// to null (snapshot absent) so existing tests fall through to Overpass as
// before; tier-specific tests below override per-test.
const mockLoadWaterSnapshot = vi.fn<() => unknown>(() => null);
vi.mock('../../lib/waterSnapshot.js', () => ({
  loadWaterSnapshot: () => mockLoadWaterSnapshot(),
  __resetSnapshotCacheForTests: vi.fn(),
}));

// Mock Redis cache module with in-memory store
const _mockCacheGet = vi.fn(
  async <T>(key: string, logicalTtlMs: number): Promise<CacheResponse<T> | null> => {
    const entry = redisStore.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    const stale = Date.now() - entry.fetchedAt > logicalTtlMs;
    return { data: entry.data, stale, lastFresh: entry.fetchedAt };
  },
);
const _mockCacheSet = vi.fn(
  async <T>(key: string, data: T, _redisTtlSec: number): Promise<void> => {
    redisStore.set(key, { data, fetchedAt: Date.now() });
  },
);
vi.mock('../../cache/redis.js', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    ping: vi.fn(async () => 'PONG'),
  },
  cacheGet: _mockCacheGet,
  cacheSet: _mockCacheSet,
  cacheGetSafe: _mockCacheGet,
  cacheSetSafe: _mockCacheSet,
}));

// Sample water facility fixture
const sampleFacility: WaterFacility = {
  id: 'water-12345',
  type: 'water',
  facilityType: 'dam',
  lat: 33.3,
  lng: 44.4,
  label: 'Mosul Dam',
  osmId: 12345,
  stress: {
    bws_raw: 3.5,
    bws_score: 3.5,
    bws_label: 'High',
    drr_score: 2.0,
    gtd_score: 1.5,
    sev_score: 2.5,
    iav_score: 3.0,
    compositeHealth: 0.3,
  },
};

describe('Water Routes (/api/water)', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    redisStore.clear();
    mockFetchWaterFacilities.mockClear();
    mockFetchPrecipitation.mockClear();
    mockFetchWaterFacilities.mockResolvedValue({ facilities: [], stats: emptyStats });
    mockFetchPrecipitation.mockResolvedValue([]);
    // Phase 27.3.1 R-04 — default snapshot-absent; per-test overrides below.
    mockLoadWaterSnapshot.mockReset();
    mockLoadWaterSnapshot.mockReturnValue(null);

    vi.resetModules();
    const { createApp } = await import('../../index.js');
    const app = createApp();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr !== 'string') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(() => {
    server?.close();
  });

  describe('GET /api/water', () => {
    it('returns 200 with { data, stale: false, lastFresh } on cache miss + successful fetch', async () => {
      mockFetchWaterFacilities.mockResolvedValue({
        facilities: [sampleFacility],
        stats: emptyStats,
      });

      const res = await fetch(`${baseUrl}/api/water`);
      const body = await res.json();

      expect(res.ok).toBe(true);
      expect(body.stale).toBe(false);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        id: 'water-12345',
        type: 'water',
        facilityType: 'dam',
        label: 'Mosul Dam',
      });
      expect(typeof body.lastFresh).toBe('number');
    });

    it('returns cached data when cache is fresh (does not call fetchWaterFacilities)', async () => {
      redisStore.set('water:facilities', {
        data: [sampleFacility],
        fetchedAt: Date.now(),
      });

      const res = await fetch(`${baseUrl}/api/water`);
      const body = await res.json();

      expect(res.ok).toBe(true);
      expect(body.stale).toBe(false);
      expect(body.data).toHaveLength(1);
      expect(mockFetchWaterFacilities).not.toHaveBeenCalled();
    });

    it('returns stale cache when upstream fails but cache exists', async () => {
      redisStore.set('water:facilities', {
        data: [sampleFacility],
        fetchedAt: Date.now() - 90_000_000, // stale (>24h)
      });

      mockFetchWaterFacilities.mockRejectedValue(new Error('Overpass down'));

      const res = await fetch(`${baseUrl}/api/water`);
      const body = await res.json();

      expect(res.ok).toBe(true);
      expect(body.stale).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('returns empty array with stale:true when upstream fails and no cache exists', async () => {
      mockFetchWaterFacilities.mockRejectedValue(new Error('Overpass down'));

      const res = await fetch(`${baseUrl}/api/water`);
      const body = await res.json();

      expect(res.ok).toBe(true);
      expect(body.stale).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.lastFresh).toBe(0);
    });
  });

  /**
   * Phase 27.3.1 R-04 — committed JSON snapshot tier.
   *
   * Verifies the new tier slots between dev file cache and Overpass:
   *   Redis → devFileCache (dev only) → snapshot → Overpass
   *
   * The R-07 invariant ("Overpass never on a user request path") is tested
   * by asserting `fetchWaterFacilities` is NOT called when the snapshot is
   * present and Redis + devFileCache miss.
   */
  describe('R-04 snapshot tier', () => {
    const snapshotFacility: WaterFacility = {
      id: 'water-99001',
      type: 'water',
      facilityType: 'dam',
      lat: 35.84,
      lng: 38.55,
      label: 'Tabqa Dam',
      osmId: 99001,
      stress: {
        bws_raw: 4.3,
        bws_score: 4.3,
        bws_label: 'Extremely High',
        drr_score: 3.8,
        gtd_score: 3.5,
        sev_score: 3.2,
        iav_score: 2.8,
        compositeHealth: 0.2,
      },
    };

    const snapshotStats = {
      ...emptyStats,
      filteredCounts: { dams: 515, reservoirs: 73, desalination: 15 },
      source: 'snapshot' as const,
      generatedAt: '2026-04-19T07:00:00.000Z',
    };

    it("serves snapshot with source='snapshot' when Redis is cold and dev cache is empty", async () => {
      mockLoadWaterSnapshot.mockReturnValue({
        generatedAt: '2026-04-19T07:00:00.000Z',
        facilities: [snapshotFacility],
        stats: snapshotStats,
      });

      const res = await fetch(`${baseUrl}/api/water`);
      const body = await res.json();

      expect(res.ok).toBe(true);
      expect(body.stale).toBe(false);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({ id: 'water-99001', label: 'Tabqa Dam' });
      expect(body.filterStats.source).toBe('snapshot');
      expect(body.filterStats.generatedAt).toBe('2026-04-19T07:00:00.000Z');
      // R-07: Overpass must NOT be called
      expect(mockFetchWaterFacilities).not.toHaveBeenCalled();
    });

    it('populates Redis from the snapshot so subsequent hits serve source=redis', async () => {
      mockLoadWaterSnapshot.mockReturnValue({
        generatedAt: '2026-04-19T07:00:00.000Z',
        facilities: [snapshotFacility],
        stats: snapshotStats,
      });

      // First hit — should populate Redis from snapshot
      const res1 = await fetch(`${baseUrl}/api/water`);
      const body1 = await res1.json();
      expect(body1.filterStats.source).toBe('snapshot');

      // Second hit — Redis is now warm
      const res2 = await fetch(`${baseUrl}/api/water`);
      const body2 = await res2.json();
      expect(body2.filterStats.source).toBe('redis');
      expect(body2.data).toHaveLength(1);
      expect(mockFetchWaterFacilities).not.toHaveBeenCalled();
    });

    it('falls through to Overpass when snapshot is absent (existing behavior preserved)', async () => {
      mockLoadWaterSnapshot.mockReturnValue(null);
      mockFetchWaterFacilities.mockResolvedValue({
        facilities: [sampleFacility],
        stats: emptyStats,
      });

      const res = await fetch(`${baseUrl}/api/water`);
      const body = await res.json();

      expect(res.ok).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(mockFetchWaterFacilities).toHaveBeenCalledTimes(1);
    });

    it('refresh=true bypasses the snapshot tier and hits Overpass', async () => {
      mockLoadWaterSnapshot.mockReturnValue({
        generatedAt: '2026-04-19T07:00:00.000Z',
        facilities: [snapshotFacility],
        stats: snapshotStats,
      });
      mockFetchWaterFacilities.mockResolvedValue({
        facilities: [sampleFacility],
        stats: { ...emptyStats, source: 'overpass' as const },
      });

      const res = await fetch(`${baseUrl}/api/water?refresh=true`);
      const body = await res.json();

      expect(res.ok).toBe(true);
      expect(mockFetchWaterFacilities).toHaveBeenCalledTimes(1);
      expect(body.filterStats.source).toBe('overpass');
      // Snapshot loader should NOT have been consulted on a forced refresh
      expect(mockLoadWaterSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/water/precip', () => {
    it('returns precipitation data for cached facilities', async () => {
      // Pre-populate facility cache
      redisStore.set('water:facilities', {
        data: [sampleFacility],
        fetchedAt: Date.now(),
      });

      const precipData = [
        { lat: 33.3, lng: 44.4, last30DaysMm: 15.2, anomalyRatio: 0.8, updatedAt: Date.now() },
      ];
      mockFetchPrecipitation.mockResolvedValue(precipData);

      const res = await fetch(`${baseUrl}/api/water/precip`);
      const body = await res.json();

      expect(res.ok).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        lat: 33.3,
        lng: 44.4,
        last30DaysMm: 15.2,
      });
    });

    it('returns cached precip data when cache is fresh', async () => {
      const precipData = [
        { lat: 33.3, lng: 44.4, last30DaysMm: 15.2, anomalyRatio: 0.8, updatedAt: Date.now() },
      ];
      redisStore.set('water:precip', {
        data: precipData,
        fetchedAt: Date.now(),
      });

      const res = await fetch(`${baseUrl}/api/water/precip`);
      const body = await res.json();

      expect(res.ok).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(mockFetchPrecipitation).not.toHaveBeenCalled();
    });
  });
});
