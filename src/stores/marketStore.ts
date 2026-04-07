import { create } from 'zustand';
import type { MarketQuote, CacheResponse } from '@/types/entities';

export type ConnectionStatus = 'connected' | 'stale' | 'error' | 'loading';

export type MarketRange = '1d' | '5d' | '1mo' | 'ytd';

interface MarketState {
  quotes: MarketQuote[];
  connectionStatus: ConnectionStatus;
  lastFetchAt: number | null;
  range: MarketRange;
  setMarketData: (response: CacheResponse<MarketQuote[]>) => void;
  setError: () => void;
  setLoading: () => void;
  setRange: (range: MarketRange) => void;
}

function readRange(): MarketRange {
  try {
    const v = localStorage.getItem('markets-range');
    if (v === '1d' || v === '5d' || v === '1mo' || v === 'ytd') return v;
  } catch {
    /* noop */
  }
  return '1d';
}

export const useMarketStore = create<MarketState>()((set) => ({
  quotes: [],
  connectionStatus: 'loading',
  lastFetchAt: null,
  range: readRange(),

  setMarketData: (response) =>
    set({
      quotes: response.data,
      connectionStatus: response.stale ? 'stale' : 'connected',
      lastFetchAt: Date.now(),
    }),

  setError: () => set({ connectionStatus: 'error' }),

  setLoading: () => set({ connectionStatus: 'loading' }),

  setRange: (range) => {
    try {
      localStorage.setItem('markets-range', range);
    } catch {
      /* noop */
    }
    set({ range, connectionStatus: 'loading', quotes: [] });
  },
}));
