import { create } from 'zustand';

interface MapState {
  isMapLoaded: boolean;
  cursorLng: number;
  cursorLat: number;
  setMapLoaded: () => void;
  setCursorPosition: (lng: number, lat: number) => void;
}

export const useMapStore = create<MapState>()((set) => ({
  isMapLoaded: false,
  cursorLng: 0,
  cursorLat: 0,
  setMapLoaded: () => set({ isMapLoaded: true }),
  setCursorPosition: (lng, lat) => set({ cursorLng: lng, cursorLat: lat }),
}));
