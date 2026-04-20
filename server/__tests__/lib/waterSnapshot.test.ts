// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Phase 27.3.1 R-04 snapshot loader tests.
 *
 * Covers the loadWaterSnapshot() function's four branches:
 *  1. file absent       → null
 *  2. file present+valid→ typed WaterSnapshot (with source forced to 'snapshot')
 *  3. file malformed    → null + warning
 *  4. file wrong-shape  → null + warning
 *
 * The in-module cache is reset per-test via __resetSnapshotCacheForTests.
 * fs.existsSync + fs.readFileSync are mocked so tests don't need the real
 * snapshot file (Task 2 generates it).
 */

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: (p: string) => mockExistsSync(p),
    readFileSync: (p: string, enc?: string) => mockReadFileSync(p, enc),
  };
});

// Import AFTER mocks are registered
const { loadWaterSnapshot, __resetSnapshotCacheForTests } =
  await import('../../lib/waterSnapshot.js');

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
  generatedAt: '2026-04-18T00:00:00.000Z',
  enrichment: { withCapacity: 0, withCity: 0, withRiver: 0 },
  scoreHistogram: [],
};

beforeEach(() => {
  __resetSnapshotCacheForTests();
  mockExistsSync.mockReset();
  mockReadFileSync.mockReset();
});

describe('loadWaterSnapshot', () => {
  it('returns null when snapshot file is absent', () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadWaterSnapshot()).toBeNull();
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('returns a typed snapshot when the file is valid', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-18T00:00:00.000Z',
        facilities: [],
        stats: emptyStats,
      }),
    );
    const snap = loadWaterSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.generatedAt).toBe('2026-04-18T00:00:00.000Z');
    expect(snap!.facilities).toEqual([]);
  });

  it('overrides stats.source to "snapshot" even when persisted value differs', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-18T00:00:00.000Z',
        facilities: [],
        stats: { ...emptyStats, source: 'overpass' },
      }),
    );
    const snap = loadWaterSnapshot();
    expect(snap?.stats.source).toBe('snapshot');
  });

  it('stats.generatedAt matches the snapshot generatedAt after load', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-18T12:34:56.000Z',
        facilities: [],
        stats: { ...emptyStats, generatedAt: '2025-01-01T00:00:00.000Z' },
      }),
    );
    const snap = loadWaterSnapshot();
    expect(snap?.stats.generatedAt).toBe('2026-04-18T12:34:56.000Z');
  });

  it('returns null when JSON is malformed', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{not valid json');
    expect(loadWaterSnapshot()).toBeNull();
  });

  it('returns null when shape is wrong (missing generatedAt)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ facilities: [], stats: emptyStats }));
    expect(loadWaterSnapshot()).toBeNull();
  });

  it('returns null when shape is wrong (facilities not an array)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-18T00:00:00.000Z',
        facilities: 'oops-not-an-array',
        stats: emptyStats,
      }),
    );
    expect(loadWaterSnapshot()).toBeNull();
  });

  it('caches the snapshot after the first call (O(1) subsequent)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-18T00:00:00.000Z',
        facilities: [],
        stats: emptyStats,
      }),
    );
    const a = loadWaterSnapshot();
    const b = loadWaterSnapshot();
    expect(a).not.toBeNull();
    expect(a).toBe(b); // same reference → cached
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
  });

  it('caches null result when file is absent (no repeated stat)', () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadWaterSnapshot()).toBeNull();
    expect(loadWaterSnapshot()).toBeNull();
    expect(mockExistsSync).toHaveBeenCalledTimes(1);
  });
});
