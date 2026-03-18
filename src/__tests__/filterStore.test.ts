import { beforeEach, describe, expect, it } from 'vitest';
import { useFilterStore } from '@/stores/filterStore';
import type { FilterState } from '@/stores/filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().clearAll();
  });

  describe('defaults', () => {
    it('selectedCountries defaults to empty array', () => {
      expect(useFilterStore.getState().selectedCountries).toEqual([]);
    });

    it('speedMin/speedMax default to null', () => {
      const s = useFilterStore.getState();
      expect(s.speedMin).toBeNull();
      expect(s.speedMax).toBeNull();
    });

    it('altitudeMin/altitudeMax default to null', () => {
      const s = useFilterStore.getState();
      expect(s.altitudeMin).toBeNull();
      expect(s.altitudeMax).toBeNull();
    });

    it('proximityPin defaults to null', () => {
      expect(useFilterStore.getState().proximityPin).toBeNull();
    });

    it('proximityRadiusKm defaults to 100', () => {
      expect(useFilterStore.getState().proximityRadiusKm).toBe(100);
    });

    it('dateStart/dateEnd default to null', () => {
      const s = useFilterStore.getState();
      expect(s.dateStart).toBeNull();
      expect(s.dateEnd).toBeNull();
    });

    it('isSettingPin defaults to false', () => {
      expect(useFilterStore.getState().isSettingPin).toBe(false);
    });
  });

  describe('country actions', () => {
    it('setCountries replaces selectedCountries array', () => {
      useFilterStore.getState().setCountries(['Iran', 'Iraq']);
      expect(useFilterStore.getState().selectedCountries).toEqual(['Iran', 'Iraq']);
    });

    it('addCountry appends to selectedCountries', () => {
      useFilterStore.getState().addCountry('Iran');
      useFilterStore.getState().addCountry('Iraq');
      expect(useFilterStore.getState().selectedCountries).toEqual(['Iran', 'Iraq']);
    });

    it('addCountry prevents duplicates', () => {
      useFilterStore.getState().addCountry('Iran');
      useFilterStore.getState().addCountry('Iran');
      expect(useFilterStore.getState().selectedCountries).toEqual(['Iran']);
    });

    it('removeCountry removes from selectedCountries', () => {
      useFilterStore.getState().setCountries(['Iran', 'Iraq', 'Turkey']);
      useFilterStore.getState().removeCountry('Iraq');
      expect(useFilterStore.getState().selectedCountries).toEqual(['Iran', 'Turkey']);
    });
  });

  describe('range actions', () => {
    it('setSpeedRange sets speedMin and speedMax', () => {
      useFilterStore.getState().setSpeedRange(100, 400);
      const s = useFilterStore.getState();
      expect(s.speedMin).toBe(100);
      expect(s.speedMax).toBe(400);
    });

    it('setAltitudeRange sets altitudeMin and altitudeMax', () => {
      useFilterStore.getState().setAltitudeRange(10000, 40000);
      const s = useFilterStore.getState();
      expect(s.altitudeMin).toBe(10000);
      expect(s.altitudeMax).toBe(40000);
    });
  });

  describe('proximity actions', () => {
    it('setProximityPin sets pin coordinates', () => {
      useFilterStore.getState().setProximityPin({ lat: 35, lng: 51 });
      expect(useFilterStore.getState().proximityPin).toEqual({ lat: 35, lng: 51 });
    });

    it('setProximityPin with null clears pin', () => {
      useFilterStore.getState().setProximityPin({ lat: 35, lng: 51 });
      useFilterStore.getState().setProximityPin(null);
      expect(useFilterStore.getState().proximityPin).toBeNull();
    });

    it('setProximityRadius sets radius', () => {
      useFilterStore.getState().setProximityRadius(250);
      expect(useFilterStore.getState().proximityRadiusKm).toBe(250);
    });
  });

  describe('date actions', () => {
    it('setDateRange sets dateStart and dateEnd', () => {
      const start = Date.now() - 86400000;
      const end = Date.now();
      useFilterStore.getState().setDateRange(start, end);
      const s = useFilterStore.getState();
      expect(s.dateStart).toBe(start);
      expect(s.dateEnd).toBe(end);
    });
  });

  describe('pin mode', () => {
    it('setSettingPin sets isSettingPin boolean', () => {
      useFilterStore.getState().setSettingPin(true);
      expect(useFilterStore.getState().isSettingPin).toBe(true);
      useFilterStore.getState().setSettingPin(false);
      expect(useFilterStore.getState().isSettingPin).toBe(false);
    });
  });

  describe('clearFilter', () => {
    it('clearFilter(country) resets selectedCountries to empty', () => {
      useFilterStore.getState().setCountries(['Iran', 'Iraq']);
      useFilterStore.getState().clearFilter('country');
      expect(useFilterStore.getState().selectedCountries).toEqual([]);
    });

    it('clearFilter(speed) resets speedMin/speedMax to null', () => {
      useFilterStore.getState().setSpeedRange(100, 400);
      useFilterStore.getState().clearFilter('speed');
      const s = useFilterStore.getState();
      expect(s.speedMin).toBeNull();
      expect(s.speedMax).toBeNull();
    });

    it('clearFilter(altitude) resets altitudeMin/altitudeMax to null', () => {
      useFilterStore.getState().setAltitudeRange(10000, 40000);
      useFilterStore.getState().clearFilter('altitude');
      const s = useFilterStore.getState();
      expect(s.altitudeMin).toBeNull();
      expect(s.altitudeMax).toBeNull();
    });

    it('clearFilter(proximity) resets proximityPin to null but keeps radius default', () => {
      useFilterStore.getState().setProximityPin({ lat: 35, lng: 51 });
      useFilterStore.getState().setProximityRadius(250);
      useFilterStore.getState().clearFilter('proximity');
      expect(useFilterStore.getState().proximityPin).toBeNull();
      // radius resets to default 100
      expect(useFilterStore.getState().proximityRadiusKm).toBe(100);
    });

    it('clearFilter(date) resets dateStart/dateEnd to null', () => {
      useFilterStore.getState().setDateRange(1000, 2000);
      useFilterStore.getState().clearFilter('date');
      const s = useFilterStore.getState();
      expect(s.dateStart).toBeNull();
      expect(s.dateEnd).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('resets all filter fields to defaults', () => {
      useFilterStore.getState().setCountries(['Iran']);
      useFilterStore.getState().setSpeedRange(100, 400);
      useFilterStore.getState().setAltitudeRange(10000, 40000);
      useFilterStore.getState().setProximityPin({ lat: 35, lng: 51 });
      useFilterStore.getState().setProximityRadius(250);
      useFilterStore.getState().setDateRange(1000, 2000);
      useFilterStore.getState().setSettingPin(true);

      useFilterStore.getState().clearAll();
      const s = useFilterStore.getState();
      expect(s.selectedCountries).toEqual([]);
      expect(s.speedMin).toBeNull();
      expect(s.speedMax).toBeNull();
      expect(s.altitudeMin).toBeNull();
      expect(s.altitudeMax).toBeNull();
      expect(s.proximityPin).toBeNull();
      expect(s.proximityRadiusKm).toBe(100);
      expect(s.dateStart).toBeNull();
      expect(s.dateEnd).toBeNull();
      expect(s.isSettingPin).toBe(false);
    });
  });

  describe('activeFilterCount', () => {
    it('returns 0 when no filters are active', () => {
      expect(useFilterStore.getState().activeFilterCount()).toBe(0);
    });

    it('counts country filter when countries selected', () => {
      useFilterStore.getState().setCountries(['Iran']);
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('counts speed filter when speedMin set', () => {
      useFilterStore.getState().setSpeedRange(100, null);
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('counts speed filter when speedMax set', () => {
      useFilterStore.getState().setSpeedRange(null, 400);
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('counts altitude filter when altitudeMin set', () => {
      useFilterStore.getState().setAltitudeRange(10000, null);
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('counts proximity filter when pin set', () => {
      useFilterStore.getState().setProximityPin({ lat: 35, lng: 51 });
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('counts date filter when dateStart set', () => {
      useFilterStore.getState().setDateRange(1000, null);
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('returns 5 when all filters active', () => {
      useFilterStore.getState().setCountries(['Iran']);
      useFilterStore.getState().setSpeedRange(100, 400);
      useFilterStore.getState().setAltitudeRange(10000, 40000);
      useFilterStore.getState().setProximityPin({ lat: 35, lng: 51 });
      useFilterStore.getState().setDateRange(1000, 2000);
      expect(useFilterStore.getState().activeFilterCount()).toBe(5);
    });
  });
});
