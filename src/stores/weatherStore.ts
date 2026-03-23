import { create } from 'zustand';

export interface WeatherGridPoint {
  lat: number;
  lng: number;
  temperature: number;     // Celsius
  windSpeed: number;        // knots
  windDirection: number;    // degrees (0-360)
}

export type ConnectionStatus = 'connected' | 'stale' | 'error' | 'loading';

interface WeatherState {
  grid: WeatherGridPoint[];
  connectionStatus: ConnectionStatus;
  lastFetchAt: number | null;
  setWeatherData: (response: { data: WeatherGridPoint[]; stale: boolean; lastFresh: number }) => void;
  setError: () => void;
  setLoading: () => void;
}

export const useWeatherStore = create<WeatherState>()((set) => ({
  grid: [],
  connectionStatus: 'loading',
  lastFetchAt: null,

  setWeatherData: (response) =>
    set({
      grid: response.data,
      connectionStatus: response.stale ? 'stale' : 'connected',
      lastFetchAt: Date.now(),
    }),

  setError: () => set({ connectionStatus: 'error' }),

  setLoading: () => set({ connectionStatus: 'loading' }),
}));
