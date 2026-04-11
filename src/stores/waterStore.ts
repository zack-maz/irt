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

export interface FetchRecord {
  ok: boolean;
  durationMs: number;
  timestamp: number;
}

interface WaterState {
  facilities: WaterFacility[];
  connectionStatus: WaterConnectionStatus;
  lastError: string | null;
  nextPollAt: number | null;
  recentFetches: FetchRecord[];
  /** Precipitation-specific observability */
  precipStatus: WaterConnectionStatus;
  precipLastFetchAt: number | null;
  precipLastError: string | null;
  precipNextPollAt: number | null;
  precipRecentFetches: FetchRecord[];
  precipMatchedCount: number;
  setWaterData: (response: CacheResponse<WaterFacility[]>) => void;
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
  lastError: null,
  nextPollAt: null,
  recentFetches: [],
  precipStatus: 'idle',
  precipLastFetchAt: null,
  precipLastError: null,
  precipNextPollAt: null,
  precipRecentFetches: [],
  precipMatchedCount: 0,

  setWaterData: (response) =>
    set({
      facilities: response.data,
      connectionStatus: response.stale ? 'stale' : 'connected',
      lastError: null,
    }),

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
      return { facilities: updated };
    }),

  setError: (message?: string) =>
    set({ connectionStatus: 'error', lastError: message ?? 'Unknown error' }),

  setLoading: () => set({ connectionStatus: 'loading' }),

  recordFetch: (ok, durationMs) =>
    set((state) => ({
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
