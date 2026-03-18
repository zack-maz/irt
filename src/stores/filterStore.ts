import { create } from 'zustand';

export interface ProximityPin {
  lat: number;
  lng: number;
}

export type FilterKey = 'country' | 'speed' | 'altitude' | 'proximity' | 'date';

export interface FilterState {
  // State
  selectedCountries: string[];
  speedMin: number | null;
  speedMax: number | null;
  altitudeMin: number | null;
  altitudeMax: number | null;
  proximityPin: ProximityPin | null;
  proximityRadiusKm: number;
  dateStart: number | null;
  dateEnd: number | null;
  isSettingPin: boolean;

  // Actions
  setCountries: (countries: string[]) => void;
  addCountry: (country: string) => void;
  removeCountry: (country: string) => void;
  setSpeedRange: (min: number | null, max: number | null) => void;
  setAltitudeRange: (min: number | null, max: number | null) => void;
  setProximityPin: (pin: ProximityPin | null) => void;
  setProximityRadius: (km: number) => void;
  setDateRange: (start: number | null, end: number | null) => void;
  setSettingPin: (v: boolean) => void;
  clearFilter: (filter: FilterKey) => void;
  clearAll: () => void;
  activeFilterCount: () => number;
}

const DEFAULTS = {
  selectedCountries: [] as string[],
  speedMin: null as number | null,
  speedMax: null as number | null,
  altitudeMin: null as number | null,
  altitudeMax: null as number | null,
  proximityPin: null as ProximityPin | null,
  proximityRadiusKm: 100,
  dateStart: null as number | null,
  dateEnd: null as number | null,
  isSettingPin: false,
};

export const useFilterStore = create<FilterState>()((set, get) => ({
  ...DEFAULTS,

  setCountries: (countries) => set({ selectedCountries: countries }),

  addCountry: (country) =>
    set((s) => {
      if (s.selectedCountries.includes(country)) return s;
      return { selectedCountries: [...s.selectedCountries, country] };
    }),

  removeCountry: (country) =>
    set((s) => ({
      selectedCountries: s.selectedCountries.filter((c) => c !== country),
    })),

  setSpeedRange: (min, max) => set({ speedMin: min, speedMax: max }),

  setAltitudeRange: (min, max) => set({ altitudeMin: min, altitudeMax: max }),

  setProximityPin: (pin) => set({ proximityPin: pin }),

  setProximityRadius: (km) => set({ proximityRadiusKm: km }),

  setDateRange: (start, end) => set({ dateStart: start, dateEnd: end }),

  setSettingPin: (v) => set({ isSettingPin: v }),

  clearFilter: (filter) => {
    switch (filter) {
      case 'country':
        set({ selectedCountries: [] });
        break;
      case 'speed':
        set({ speedMin: null, speedMax: null });
        break;
      case 'altitude':
        set({ altitudeMin: null, altitudeMax: null });
        break;
      case 'proximity':
        set({ proximityPin: null, proximityRadiusKm: 100 });
        break;
      case 'date':
        set({ dateStart: null, dateEnd: null });
        break;
    }
  },

  clearAll: () => set({ ...DEFAULTS }),

  activeFilterCount: () => {
    const s = get();
    let count = 0;
    if (s.selectedCountries.length > 0) count++;
    if (s.speedMin !== null || s.speedMax !== null) count++;
    if (s.altitudeMin !== null || s.altitudeMax !== null) count++;
    if (s.proximityPin !== null) count++;
    if (s.dateStart !== null || s.dateEnd !== null) count++;
    return count;
  },
}));
