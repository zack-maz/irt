import { create } from 'zustand';

const ZOOM_CROSSOVER = 8;

interface MapState {
  isMapLoaded: boolean;
  cursorLng: number;
  cursorLat: number;
  /** True when map zoom is below crossover (regional view). Used for layer z-order crossover. */
  isBelowCrossover: boolean;
  setMapLoaded: () => void;
  setCursorPosition: (lng: number, lat: number) => void;
  /** Update zoom region boolean. Only triggers re-render when crossing the threshold. */
  setZoomRegion: (zoom: number) => void;
}

export const useMapStore = create<MapState>()((set) => ({
  isMapLoaded: false,
  cursorLng: 0,
  cursorLat: 0,
  isBelowCrossover: true,
  setMapLoaded: () => set({ isMapLoaded: true }),
  setCursorPosition: (lng, lat) => set({ cursorLng: lng, cursorLat: lat }),
  setZoomRegion: (zoom) => set({ isBelowCrossover: zoom < ZOOM_CROSSOVER }),
}));
