import { beforeEach, describe, expect, it } from 'vitest';
import { useFilterStore } from '@/stores/filterStore';
import { useUIStore } from '@/stores/uiStore';

describe('filterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().clearAll();
  });

  describe('defaults', () => {
    it('flightCountries defaults to empty array', () => {
      expect(useFilterStore.getState().flightCountries).toEqual([]);
    });

    it('eventCountries defaults to empty array', () => {
      expect(useFilterStore.getState().eventCountries).toEqual([]);
    });

    it('flightSpeedMin/flightSpeedMax default to null', () => {
      const s = useFilterStore.getState();
      expect(s.flightSpeedMin).toBeNull();
      expect(s.flightSpeedMax).toBeNull();
    });

    it('shipSpeedMin/shipSpeedMax default to null', () => {
      const s = useFilterStore.getState();
      expect(s.shipSpeedMin).toBeNull();
      expect(s.shipSpeedMax).toBeNull();
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

    it('dateStart defaults to null, dateEnd defaults to null', () => {
      const s = useFilterStore.getState();
      expect(s.dateStart).toBeNull();
      expect(s.dateEnd).toBeNull();
    });

    it('isSettingPin defaults to false', () => {
      expect(useFilterStore.getState().isSettingPin).toBe(false);
    });

    it('granularity defaults to hour', () => {
      expect(useFilterStore.getState().granularity).toBe('hour');
    });

    it('savedToggles defaults to null', () => {
      expect(useFilterStore.getState().savedToggles).toBeNull();
    });
  });

  describe('flight country actions', () => {
    it('setFlightCountries replaces flightCountries array', () => {
      useFilterStore.getState().setFlightCountries(['Iran', 'Iraq']);
      expect(useFilterStore.getState().flightCountries).toEqual(['Iran', 'Iraq']);
    });

    it('addFlightCountry appends to flightCountries', () => {
      useFilterStore.getState().addFlightCountry('Iran');
      useFilterStore.getState().addFlightCountry('Iraq');
      expect(useFilterStore.getState().flightCountries).toEqual(['Iran', 'Iraq']);
    });

    it('addFlightCountry prevents duplicates', () => {
      useFilterStore.getState().addFlightCountry('Iran');
      useFilterStore.getState().addFlightCountry('Iran');
      expect(useFilterStore.getState().flightCountries).toEqual(['Iran']);
    });

    it('removeFlightCountry removes from flightCountries', () => {
      useFilterStore.getState().setFlightCountries(['Iran', 'Iraq', 'Turkey']);
      useFilterStore.getState().removeFlightCountry('Iraq');
      expect(useFilterStore.getState().flightCountries).toEqual(['Iran', 'Turkey']);
    });
  });

  describe('event country actions', () => {
    it('setEventCountries replaces eventCountries array', () => {
      useFilterStore.getState().setEventCountries(['ISRAEL', 'IRAN']);
      expect(useFilterStore.getState().eventCountries).toEqual(['ISRAEL', 'IRAN']);
    });

    it('addEventCountry appends to eventCountries', () => {
      useFilterStore.getState().addEventCountry('ISRAEL');
      useFilterStore.getState().addEventCountry('IRAN');
      expect(useFilterStore.getState().eventCountries).toEqual(['ISRAEL', 'IRAN']);
    });

    it('addEventCountry prevents duplicates', () => {
      useFilterStore.getState().addEventCountry('ISRAEL');
      useFilterStore.getState().addEventCountry('ISRAEL');
      expect(useFilterStore.getState().eventCountries).toEqual(['ISRAEL']);
    });

    it('removeEventCountry removes from eventCountries', () => {
      useFilterStore.getState().setEventCountries(['ISRAEL', 'IRAN', 'IRAQ']);
      useFilterStore.getState().removeEventCountry('IRAN');
      expect(useFilterStore.getState().eventCountries).toEqual(['ISRAEL', 'IRAQ']);
    });
  });

  describe('range actions', () => {
    it('setFlightSpeedRange sets flightSpeedMin and flightSpeedMax', () => {
      useFilterStore.getState().setFlightSpeedRange(100, 400);
      const s = useFilterStore.getState();
      expect(s.flightSpeedMin).toBe(100);
      expect(s.flightSpeedMax).toBe(400);
    });

    it('setShipSpeedRange sets shipSpeedMin and shipSpeedMax', () => {
      useFilterStore.getState().setShipSpeedRange(5, 25);
      const s = useFilterStore.getState();
      expect(s.shipSpeedMin).toBe(5);
      expect(s.shipSpeedMax).toBe(25);
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
    it('clearFilter(flightCountry) resets flightCountries to empty', () => {
      useFilterStore.getState().setFlightCountries(['Iran', 'Iraq']);
      useFilterStore.getState().clearFilter('flightCountry');
      expect(useFilterStore.getState().flightCountries).toEqual([]);
    });

    it('clearFilter(eventCountry) resets eventCountries to empty', () => {
      useFilterStore.getState().setEventCountries(['ISRAEL', 'IRAN']);
      useFilterStore.getState().clearFilter('eventCountry');
      expect(useFilterStore.getState().eventCountries).toEqual([]);
    });

    it('clearFilter(flightSpeed) resets flightSpeedMin/flightSpeedMax to null', () => {
      useFilterStore.getState().setFlightSpeedRange(100, 400);
      useFilterStore.getState().clearFilter('flightSpeed');
      const s = useFilterStore.getState();
      expect(s.flightSpeedMin).toBeNull();
      expect(s.flightSpeedMax).toBeNull();
    });

    it('clearFilter(shipSpeed) resets shipSpeedMin/shipSpeedMax to null', () => {
      useFilterStore.getState().setShipSpeedRange(5, 25);
      useFilterStore.getState().clearFilter('shipSpeed');
      const s = useFilterStore.getState();
      expect(s.shipSpeedMin).toBeNull();
      expect(s.shipSpeedMax).toBeNull();
    });

    it('clearFilter(altitude) resets altitudeMin/altitudeMax to null', () => {
      useFilterStore.getState().setAltitudeRange(10000, 40000);
      useFilterStore.getState().clearFilter('altitude');
      const s = useFilterStore.getState();
      expect(s.altitudeMin).toBeNull();
      expect(s.altitudeMax).toBeNull();
    });

    it('clearFilter(proximity) resets proximityPin to null and radius to default', () => {
      useFilterStore.getState().setProximityPin({ lat: 35, lng: 51 });
      useFilterStore.getState().setProximityRadius(250);
      useFilterStore.getState().clearFilter('proximity');
      expect(useFilterStore.getState().proximityPin).toBeNull();
      expect(useFilterStore.getState().proximityRadiusKm).toBe(100);
    });

    it('clearFilter(date) resets dateStart and dateEnd to null', () => {
      useFilterStore.getState().setDateRange(1000, 2000);
      useFilterStore.getState().clearFilter('date');
      const s = useFilterStore.getState();
      expect(s.dateStart).toBeNull();
      expect(s.dateEnd).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('resets all filter fields to defaults', () => {
      useFilterStore.getState().setFlightCountries(['Iran']);
      useFilterStore.getState().setEventCountries(['ISRAEL']);
      useFilterStore.getState().setFlightSpeedRange(100, 400);
      useFilterStore.getState().setShipSpeedRange(5, 25);
      useFilterStore.getState().setAltitudeRange(10000, 40000);
      useFilterStore.getState().setProximityPin({ lat: 35, lng: 51 });
      useFilterStore.getState().setProximityRadius(250);
      useFilterStore.getState().setDateRange(1000, 2000);
      useFilterStore.getState().setSettingPin(true);

      useFilterStore.getState().clearAll();
      const s = useFilterStore.getState();
      expect(s.flightCountries).toEqual([]);
      expect(s.eventCountries).toEqual([]);
      expect(s.flightSpeedMin).toBeNull();
      expect(s.flightSpeedMax).toBeNull();
      expect(s.shipSpeedMin).toBeNull();
      expect(s.shipSpeedMax).toBeNull();
      expect(s.altitudeMin).toBeNull();
      expect(s.altitudeMax).toBeNull();
      expect(s.proximityPin).toBeNull();
      expect(s.proximityRadiusKm).toBe(100);
      expect(s.dateStart).toBeNull();
      expect(s.dateEnd).toBeNull();
      expect(s.isSettingPin).toBe(false);
    });
  });

  describe('granularity', () => {
    it('setGranularity updates granularity', () => {
      useFilterStore.getState().setGranularity('minute');
      expect(useFilterStore.getState().granularity).toBe('minute');
    });

    it('setGranularity snaps dateStart to new step boundary', () => {
      // Set a dateStart at an odd timestamp
      const oddTs = Date.UTC(2026, 2, 10, 14, 37, 22); // Mar 10 14:37:22
      useFilterStore.getState().setDateRange(oddTs, null);
      useFilterStore.getState().setGranularity('hour');
      const s = useFilterStore.getState();
      // Should snap to Mar 10 14:00:00 (floor to hour)
      expect(s.dateStart).toBe(Date.UTC(2026, 2, 10, 14, 0, 0));
    });

    it('setGranularity snaps dateEnd to new step boundary', () => {
      const oddTs = Date.UTC(2026, 2, 10, 14, 37, 22);
      useFilterStore.getState().setDateRange(null, oddTs);
      useFilterStore.getState().setGranularity('day');
      const s = useFilterStore.getState();
      // Should snap to Mar 10 00:00:00 (floor to day)
      expect(s.dateEnd).toBe(Date.UTC(2026, 2, 10, 0, 0, 0));
    });

    it('setGranularity clamps start to end if snapping makes start > end', () => {
      const start = Date.UTC(2026, 2, 10, 23, 30, 0);
      const end = Date.UTC(2026, 2, 10, 23, 45, 0);
      useFilterStore.getState().setDateRange(start, end);
      // Switching to day: start snaps to Mar 10, end snaps to Mar 10 — equal is fine
      useFilterStore.getState().setGranularity('day');
      const s = useFilterStore.getState();
      expect(s.dateStart! <= s.dateEnd!).toBe(true);
    });
  });

  describe('custom range activation', () => {
    beforeEach(() => {
      // Reset uiStore toggles to known state
      useUIStore.setState({
        showFlights: true,
        showGroundTraffic: false,
        pulseEnabled: true,
        showShips: true,
      });
    });

    it('setDateRange with non-null end auto-activates custom range', () => {
      useFilterStore.getState().setDateRange(1000, 2000);
      expect(useFilterStore.getState().savedToggles).not.toBeNull();
    });

    it('activating custom range snapshots and suppresses flight/ship toggles', () => {
      useFilterStore.getState().setDateRange(1000, 2000);
      // uiStore toggles should be suppressed
      const ui = useUIStore.getState();
      expect(ui.showFlights).toBe(false);
      expect(ui.showGroundTraffic).toBe(false);
      expect(ui.pulseEnabled).toBe(false);
      expect(ui.showShips).toBe(false);
      // Snapshot should contain original values
      const saved = useFilterStore.getState().savedToggles;
      expect(saved).toEqual({
        showFlights: true,
        showGroundTraffic: false,
        pulseEnabled: true,
        showShips: true,
      });
    });

    it('setDateRange with both null auto-deactivates and restores toggles', () => {
      useFilterStore.getState().setDateRange(1000, 2000); // activate
      useFilterStore.getState().setDateRange(null, null); // deactivate
      expect(useFilterStore.getState().savedToggles).toBeNull();
      const ui = useUIStore.getState();
      expect(ui.showFlights).toBe(true);
      expect(ui.showGroundTraffic).toBe(false);
      expect(ui.pulseEnabled).toBe(true);
      expect(ui.showShips).toBe(true);
    });

    it('setDateRange with start non-null and end null stays active', () => {
      useFilterStore.getState().setDateRange(1000, 2000); // activate
      useFilterStore.getState().setDateRange(1000, null); // end removed but start remains
      expect(useFilterStore.getState().savedToggles).not.toBeNull();
      const ui = useUIStore.getState();
      expect(ui.showFlights).toBe(false); // still paused
    });

    it('moving start handle while custom range active does not re-snapshot', () => {
      useFilterStore.getState().setDateRange(1000, 2000); // activate
      // Manually change a toggle to verify snapshot is not overwritten
      useUIStore.setState({ showFlights: true }); // would be different if re-snapshotted
      useFilterStore.getState().setDateRange(500, 2000); // move start only
      const saved = useFilterStore.getState().savedToggles;
      // Still original snapshot
      expect(saved?.showFlights).toBe(true);
    });

    it('isCustomRangeActive returns true when savedToggles is not null', () => {
      useFilterStore.getState().setDateRange(1000, 2000);
      expect(useFilterStore.getState().isCustomRangeActive()).toBe(true);
    });

    it('isCustomRangeActive returns false when savedToggles is null', () => {
      expect(useFilterStore.getState().isCustomRangeActive()).toBe(false);
    });

    it('clearFilter(date) deactivates custom range and restores toggles', () => {
      useFilterStore.getState().setDateRange(1000, 2000);
      useFilterStore.getState().clearFilter('date');
      expect(useFilterStore.getState().savedToggles).toBeNull();
      expect(useUIStore.getState().showFlights).toBe(true);
      expect(useUIStore.getState().showShips).toBe(true);
    });

    it('clearAll deactivates custom range and restores toggles', () => {
      useFilterStore.getState().setDateRange(1000, 2000);
      useFilterStore.getState().clearAll();
      expect(useFilterStore.getState().savedToggles).toBeNull();
      expect(useUIStore.getState().showFlights).toBe(true);
      expect(useUIStore.getState().showShips).toBe(true);
    });
  });

  describe('activeFilterCount', () => {
    it('returns 0 when no filters are active', () => {
      expect(useFilterStore.getState().activeFilterCount()).toBe(0);
    });

    it('counts flightCountry filter when countries selected', () => {
      useFilterStore.getState().setFlightCountries(['Iran']);
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('counts eventCountry filter when countries selected', () => {
      useFilterStore.getState().setEventCountries(['ISRAEL']);
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('counts flightSpeed filter when flightSpeedMin set', () => {
      useFilterStore.getState().setFlightSpeedRange(100, null);
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('counts flightSpeed filter when flightSpeedMax set', () => {
      useFilterStore.getState().setFlightSpeedRange(null, 400);
      expect(useFilterStore.getState().activeFilterCount()).toBe(1);
    });

    it('counts shipSpeed filter when shipSpeedMin set', () => {
      useFilterStore.getState().setShipSpeedRange(5, null);
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

    it('returns 7 when all filters active', () => {
      useFilterStore.getState().setFlightCountries(['Iran']);
      useFilterStore.getState().setEventCountries(['ISRAEL']);
      useFilterStore.getState().setFlightSpeedRange(100, 400);
      useFilterStore.getState().setShipSpeedRange(5, 25);
      useFilterStore.getState().setAltitudeRange(10000, 40000);
      useFilterStore.getState().setProximityPin({ lat: 35, lng: 51 });
      useFilterStore.getState().setDateRange(1000, 2000);
      expect(useFilterStore.getState().activeFilterCount()).toBe(7);
    });
  });
});
