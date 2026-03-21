import { create } from 'zustand';
import type { MarketQuote, CacheResponse } from '@/types/entities';

export type ConnectionStatus = 'connected' | 'stale' | 'error' | 'loading';

interface MarketState {
  quotes: MarketQuote[];
  connectionStatus: ConnectionStatus;
  lastFetchAt: number | null;
  setMarketData: (response: CacheResponse<MarketQuote[]>) => void;
  setError: () => void;
  setLoading: () => void;
}

export const useMarketStore = create<MarketState>()((set) => ({
  quotes: [],
  connectionStatus: 'loading',
  lastFetchAt: null,

  setMarketData: (response) =>
    set({
      quotes: response.data,
      connectionStatus: response.stale ? 'stale' : 'connected',
      lastFetchAt: Date.now(),
    }),

  setError: () => set({ connectionStatus: 'error' }),

  setLoading: () => set({ connectionStatus: 'loading' }),
}));
