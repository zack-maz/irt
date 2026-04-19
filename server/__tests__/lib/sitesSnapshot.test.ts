// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Phase 27.3.1 R-05 sites snapshot loader tests.
 *
 * Mirrors server/__tests__/lib/waterSnapshot.test.ts.
 *
 * Covers loadSitesSnapshot's four branches:
 *  1. file absent       → null
 *  2. file present+valid→ typed SitesSnapshot (with source forced to 'snapshot')
 *  3. file malformed    → null + warning
 *  4. file wrong-shape  → null + warning
 *
 * The in-module cache is reset per-test via __resetSitesSnapshotCacheForTests.
 * fs.existsSync + fs.readFileSync are mocked so tests don't need a real
 * snapshot file (Task 3 generates it).
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
const { loadSitesSnapshot, __resetSitesSnapshotCacheForTests } =
  await import('../../lib/sitesSnapshot.js');

const emptyStats = {
  rawCount: 0,
  filteredCount: 0,
  rejections: {
    excluded_turkey: 0,
    no_coords: 0,
    no_type: 0,
    duplicate: 0,
  },
  byCountry: {},
  byType: {},
  overpass: [],
  source: 'overpass' as const,
  generatedAt: '2026-04-19T00:00:00.000Z',
};

beforeEach(() => {
  __resetSitesSnapshotCacheForTests();
  mockExistsSync.mockReset();
  mockReadFileSync.mockReset();
});

describe('loadSitesSnapshot', () => {
  it('returns null when snapshot file is absent', () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadSitesSnapshot()).toBeNull();
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('returns a typed snapshot when the file is valid', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-19T00:00:00.000Z',
        sites: [],
        stats: emptyStats,
      }),
    );
    const snap = loadSitesSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.generatedAt).toBe('2026-04-19T00:00:00.000Z');
    expect(snap!.sites).toEqual([]);
  });

  it('overrides stats.source to "snapshot" even when persisted value differs', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-19T00:00:00.000Z',
        sites: [],
        stats: { ...emptyStats, source: 'overpass' },
      }),
    );
    const snap = loadSitesSnapshot();
    expect(snap?.stats.source).toBe('snapshot');
  });

  it('stats.generatedAt matches the snapshot generatedAt after load', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-19T12:34:56.000Z',
        sites: [],
        stats: { ...emptyStats, generatedAt: '2025-01-01T00:00:00.000Z' },
      }),
    );
    const snap = loadSitesSnapshot();
    expect(snap?.stats.generatedAt).toBe('2026-04-19T12:34:56.000Z');
  });

  it('returns null when JSON is malformed', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{not valid json');
    expect(loadSitesSnapshot()).toBeNull();
  });

  it('returns null when shape is wrong (missing generatedAt)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ sites: [], stats: emptyStats }));
    expect(loadSitesSnapshot()).toBeNull();
  });

  it('returns null when shape is wrong (sites not an array)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-19T00:00:00.000Z',
        sites: 'oops-not-an-array',
        stats: emptyStats,
      }),
    );
    expect(loadSitesSnapshot()).toBeNull();
  });

  it('caches the snapshot after the first call (O(1) subsequent)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        generatedAt: '2026-04-19T00:00:00.000Z',
        sites: [],
        stats: emptyStats,
      }),
    );
    const a = loadSitesSnapshot();
    const b = loadSitesSnapshot();
    expect(a).not.toBeNull();
    expect(a).toBe(b); // same reference → cached
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
  });

  it('caches null result when file is absent (no repeated stat)', () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadSitesSnapshot()).toBeNull();
    expect(loadSitesSnapshot()).toBeNull();
    expect(mockExistsSync).toHaveBeenCalledTimes(1);
  });
});
