// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { waterResponseSchema } from '../../schemas/cacheResponse.js';

/**
 * Phase 27.3.1 R-08 schema regression tests for the four observability
 * extensions: byCountry (D-28), overpass (D-29), source + generatedAt (D-30),
 * and byTypeRejections (D-31).
 *
 * The base schema is `.optional()` for filterStats; once present every new
 * field is required. Negative tests guard against accidental loosening.
 */
describe('Phase 27.3.1 R-08 waterFilterStatsSchema extensions', () => {
  const base = {
    data: [],
    stale: false,
    lastFresh: Date.now(),
  };
  const emptyStats = {
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
    source: 'overpass' as const,
    generatedAt: new Date(0).toISOString(),
    enrichment: { withCapacity: 0, withCity: 0, withRiver: 0 },
    scoreHistogram: [],
  };

  it('accepts the empty-stats shape', () => {
    const r = waterResponseSchema.safeParse({ ...base, filterStats: emptyStats });
    expect(r.success).toBe(true);
  });

  it('accepts populated byCountry + byTypeRejections', () => {
    const populated = {
      ...emptyStats,
      byCountry: { Iran: { dam: 20, reservoir: 35 }, Turkey: { dam: 15 } },
      byTypeRejections: {
        dams: {
          excluded_location: 1,
          not_notable: 0,
          no_name: 3,
          duplicate: 0,
          low_score: 2,
          no_city: 0,
        },
      },
    };
    const r = waterResponseSchema.safeParse({ ...base, filterStats: populated });
    expect(r.success).toBe(true);
  });

  it('accepts overpass telemetry array', () => {
    const withTelemetry = {
      ...emptyStats,
      overpass: [
        {
          facilityType: 'dams',
          mirror: 'primary',
          status: 200,
          durationMs: 1500,
          attempts: 1,
          ok: true,
        },
      ],
    };
    const r = waterResponseSchema.safeParse({ ...base, filterStats: withTelemetry });
    expect(r.success).toBe(true);
  });

  it('accepts both snapshot and redis source values', () => {
    const snap = { ...emptyStats, source: 'snapshot' as const };
    const red = { ...emptyStats, source: 'redis' as const };
    expect(waterResponseSchema.safeParse({ ...base, filterStats: snap }).success).toBe(true);
    expect(waterResponseSchema.safeParse({ ...base, filterStats: red }).success).toBe(true);
  });

  it('rejects missing source field', () => {
    const bad: Record<string, unknown> = { ...emptyStats };
    delete bad.source;
    const r = waterResponseSchema.safeParse({ ...base, filterStats: bad });
    expect(r.success).toBe(false);
  });

  it('rejects unknown source value', () => {
    const bad = { ...emptyStats, source: 'file-cache' };
    const r = waterResponseSchema.safeParse({ ...base, filterStats: bad });
    expect(r.success).toBe(false);
  });
});
