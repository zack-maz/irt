import { create } from 'zustand';
import type { FlightEntity, CacheResponse } from '@/types/entities';

export type ConnectionStatus = 'connected' | 'stale' | 'error' | 'loading';

interface FlightState {
  flights: FlightEntity[];
  connectionStatus: ConnectionStatus;
  lastFetchAt: number | null;
  lastFresh: number | null;
  flightCount: number;
  setFlightData: (response: CacheResponse<FlightEntity[]>) => void;
  setError: () => void;
  setLoading: () => void;
  clearStaleData: () => void;
}

export const useFlightStore = create<FlightState>()((set, get) => ({
  flights: [],
  connectionStatus: 'loading',
  lastFetchAt: null,
  lastFresh: null,
  flightCount: 0,

  setFlightData: (response) =>
    set({
      flights: response.data,
      flightCount: response.data.length,
      connectionStatus: response.stale ? 'stale' : 'connected',
      lastFetchAt: Date.now(),
      lastFresh: response.stale ? get().lastFresh : Date.now(),
    }),

  setError: () => set({ connectionStatus: 'error' }),

  setLoading: () => set({ connectionStatus: 'loading' }),

  clearStaleData: () =>
    set({ flights: [], flightCount: 0, connectionStatus: 'error' }),
}));
