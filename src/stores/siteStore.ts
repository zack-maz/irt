import { create } from 'zustand';
import type { SiteEntity, CacheResponse } from '@/types/entities';

export type SiteConnectionStatus = 'connected' | 'stale' | 'error' | 'loading' | 'idle';

interface SiteState {
  sites: SiteEntity[];
  connectionStatus: SiteConnectionStatus;
  siteCount: number;
  setSiteData: (response: CacheResponse<SiteEntity[]>) => void;
  setError: () => void;
  setLoading: () => void;
}

export const useSiteStore = create<SiteState>()((set) => ({
  sites: [],
  connectionStatus: 'idle',
  siteCount: 0,

  setSiteData: (response) =>
    set({
      sites: response.data,
      siteCount: response.data.length,
      connectionStatus: response.stale ? 'stale' : 'connected',
    }),

  setError: () => set({ connectionStatus: 'error' }),

  setLoading: () => set({ connectionStatus: 'loading' }),
}));
