import { create } from 'zustand';
import type { WaterFacility, CacheResponse } from '../../server/types';
import { compositeHealth } from '@/lib/waterStress';

export type WaterConnectionStatus = 'connected' | 'stale' | 'error' | 'loading' | 'idle';

/** Precipitation data returned by /api/water/precip */
export interface PrecipitationData {
  lat: number;
  lng: number;
  last30DaysMm: number;
  anomalyRatio: number;
  updatedAt: number;
}

/**
 * Water filter diagnostics from /api/water response envelope (Phase 27.3 D-04/REV-4).
 * Populated only on non-cached responses; null when served from Redis/dev file cache.
 * Schema mirrors server/schemas/cacheResponse.ts `waterFilterStatsSchema`.
 */
export interface WaterFilterStats {
  rawCounts: Record<string, number>;
  filteredCounts: Record<string, number>;
  rejections: {
    excluded_location: number;
    not_notable: number;
    no_name: number;
    duplicate: number;
    low_score: number;
  };
  enrichment: {
    withCapacity: number;
    withCity: number;
    withRiver: number;
  };
  scoreHistogram: { bucket: string; count: number }[];
}

export interface FetchRecord {
  ok: boolean;
  durationMs: number;
  timestamp: number;
}

interface WaterState {
  facilities: WaterFacility[];
  connectionStatus: WaterConnectionStatus;
  lastFetchAt: number | null;
  lastError: string | null;
  nextPollAt: number | null;
  recentFetches: FetchRecord[];
  /** Server-reported filter diagnostics (null when response served from cache) */
  filterStats: WaterFilterStats | null;
  /** Precipitation-specific observability */
  precipStatus: WaterConnectionStatus;
  precipLastFetchAt: number | null;
  precipLastError: string | null;
  precipNextPollAt: number | null;
  precipRecentFetches: FetchRecord[];
  precipMatchedCount: number;
  /** Raw precipitation array for direct coordinate lookup (e.g. weather tooltip) */
  rawPrecipData: PrecipitationData[];
  setWaterData: (response: CacheResponse<WaterFacility[]>) => void;
  setFilterStats: (stats: WaterFilterStats | null) => void;
  updatePrecipitation: (data: PrecipitationData[]) => void;
  setError: (message?: string) => void;
  setLoading: () => void;
  recordFetch: (ok: boolean, durationMs: number) => void;
  setNextPollAt: (ts: number | null) => void;
  recordPrecipFetch: (ok: boolean, durationMs: number, matchedCount?: number) => void;
  setPrecipNextPollAt: (ts: number | null) => void;
  setPrecipError: (message?: string) => void;
}

/** Max lat/lng distance in degrees to match a precipitation entry to a facility */
const COORD_MATCH_THRESHOLD = 0.01;

export const useWaterStore = create<WaterState>()((set) => ({
  facilities: [],
  connectionStatus: 'idle',
  lastFetchAt: null,
  lastError: null,
  nextPollAt: null,
  recentFetches: [],
  filterStats: null,
  precipStatus: 'idle',
  precipLastFetchAt: null,
  precipLastError: null,
  precipNextPollAt: null,
  precipRecentFetches: [],
  precipMatchedCount: 0,
  rawPrecipData: [],

  setWaterData: (response) =>
    set({
      facilities: response.data,
      connectionStatus: response.stale ? 'stale' : 'connected',
      lastError: null,
    }),

  setFilterStats: (filterStats) => set({ filterStats }),

  updatePrecipitation: (data) =>
    set((state) => {
      const updated = state.facilities.map((facility) => {
        const match = data.find(
          (p) =>
            Math.abs(p.lat - facility.lat) < COORD_MATCH_THRESHOLD &&
            Math.abs(p.lng - facility.lng) < COORD_MATCH_THRESHOLD,
        );
        if (!match) return facility;

        const newHealth = compositeHealth(facility.stress.bws_score, match.anomalyRatio);
        return {
          ...facility,
          precipitation: {
            last30DaysMm: match.last30DaysMm,
            anomalyRatio: match.anomalyRatio,
            updatedAt: match.updatedAt,
          },
          stress: {
            ...facility.stress,
            compositeHealth: newHealth,
          },
        };
      });
      return { facilities: updated, rawPrecipData: data };
    }),

  setError: (message?: string) =>
    set({ connectionStatus: 'error', lastError: message ?? 'Unknown error' }),

  setLoading: () => set({ connectionStatus: 'loading' }),

  recordFetch: (ok, durationMs) =>
    set((state) => ({
      lastFetchAt: Date.now(),
      recentFetches: [...state.recentFetches.slice(-9), { ok, durationMs, timestamp: Date.now() }],
    })),

  setNextPollAt: (ts) => set({ nextPollAt: ts }),

  recordPrecipFetch: (ok, durationMs, matchedCount) =>
    set((state) => ({
      precipStatus: ok ? 'connected' : 'error',
      precipLastFetchAt: Date.now(),
      precipLastError: ok ? null : state.precipLastError,
      precipRecentFetches: [
        ...state.precipRecentFetches.slice(-9),
        { ok, durationMs, timestamp: Date.now() },
      ],
      ...(matchedCount !== undefined ? { precipMatchedCount: matchedCount } : {}),
    })),

  setPrecipNextPollAt: (ts) => set({ precipNextPollAt: ts }),

  setPrecipError: (message) =>
    set({ precipStatus: 'error', precipLastError: message ?? 'Unknown error' }),
}));
