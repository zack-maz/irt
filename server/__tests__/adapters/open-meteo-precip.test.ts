// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Open-Meteo Precipitation Adapter', () => {
  let fetchPrecipitation: (locations: { lat: number; lng: number }[]) => Promise<
    { lat: number; lng: number; last30DaysMm: number; anomalyRatio: number; updatedAt: number }[]
  >;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
    const mod = await import('../../adapters/open-meteo-precip.js');
    fetchPrecipitation = mod.fetchPrecipitation;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns precipitation data for a single location', async () => {
    const mockResponse = {
      daily: {
        time: Array.from({ length: 30 }, (_, i) => `2026-03-${String(i + 1).padStart(2, '0')}`),
        precipitation_sum: Array.from({ length: 30 }, () => 2.0), // 2mm/day = 60mm total
      },
    };

    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([mockResponse]), { status: 200 }),
    );

    const result = await fetchPrecipitation([{ lat: 33, lng: 44 }]);
    expect(result).toHaveLength(1);
    expect(result[0].lat).toBe(33);
    expect(result[0].lng).toBe(44);
    expect(result[0].last30DaysMm).toBeCloseTo(60, 0);
    expect(typeof result[0].anomalyRatio).toBe('number');
    expect(typeof result[0].updatedAt).toBe('number');
  });

  it('batches locations into groups of 100', async () => {
    const locations = Array.from({ length: 150 }, (_, i) => ({
      lat: 30 + (i % 10),
      lng: 40 + Math.floor(i / 10),
    }));

    const mockDayData = {
      daily: {
        time: Array.from({ length: 30 }, (_, i) => `2026-03-${String(i + 1).padStart(2, '0')}`),
        precipitation_sum: Array.from({ length: 30 }, () => 1.0),
      },
    };

    const mockFetch = vi.mocked(globalThis.fetch);
    // First batch: 100 locations
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(Array(100).fill(mockDayData)), { status: 200 }),
    );
    // Second batch: 50 locations
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(Array(50).fill(mockDayData)), { status: 200 }),
    );

    const result = await fetchPrecipitation(locations);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(150);
  });

  it('returns empty array on API failure (graceful degradation)', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockRejectedValueOnce(new Error('API down'));

    const result = await fetchPrecipitation([{ lat: 33, lng: 44 }]);
    expect(result).toEqual([]);
  });

  it('returns empty array on non-OK response', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response('Server Error', { status: 500 }),
    );

    const result = await fetchPrecipitation([{ lat: 33, lng: 44 }]);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty location list', async () => {
    const result = await fetchPrecipitation([]);
    expect(result).toEqual([]);
  });

  it('handles null values in precipitation_sum', async () => {
    const mockResponse = {
      daily: {
        time: Array.from({ length: 30 }, (_, i) => `2026-03-${String(i + 1).padStart(2, '0')}`),
        precipitation_sum: [1.0, null, 2.0, null, ...Array(26).fill(0)],
      },
    };

    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([mockResponse]), { status: 200 }),
    );

    const result = await fetchPrecipitation([{ lat: 33, lng: 44 }]);
    expect(result).toHaveLength(1);
    // 1.0 + 2.0 = 3.0 (nulls treated as 0)
    expect(result[0].last30DaysMm).toBeCloseTo(3, 0);
  });
});
