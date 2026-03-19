import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlightStore } from '@/stores/flightStore';
import { useEventStore } from '@/stores/eventStore';
import { useUIStore } from '@/stores/uiStore';
import { useFilterStore } from '@/stores/filterStore';
import { useCounterData } from '@/components/counters/useCounterData';
import type { FlightEntity, ConflictEventEntity } from '@/types/entities';
import type { ConflictEventType } from '@/types/ui';

function makeFlight(id: string, country: string, unidentified = false): FlightEntity {
  return {
    id, type: 'flight', lat: 32, lng: 51, timestamp: Date.now(), label: id,
    data: { icao24: id, callsign: id, originCountry: country, velocity: 250, heading: 45, altitude: 10000, onGround: false, verticalRate: 0, unidentified },
  };
}

function makeEvent(id: string, type: ConflictEventType, fatalities = 0): ConflictEventEntity {
  return {
    id, type, lat: 32, lng: 51, timestamp: Date.now(), label: id,
    data: { eventType: '', subEventType: '', fatalities, actor1: '', actor2: '', notes: '', source: '', goldsteinScale: 0, locationName: '', cameoCode: '' },
  };
}

describe('useCounterData', () => {
  beforeEach(() => {
    useFlightStore.setState({ flights: [], flightCount: 0, connectionStatus: 'connected' });
    useEventStore.setState({ events: [], eventCount: 0, connectionStatus: 'connected' });
    useUIStore.setState({
      showEvents: true,
      showAirstrikes: true,
      showGroundCombat: true,
      showTargeted: true,
      showFlights: true,
      showShips: true,
      showGroundTraffic: false,
    });
    useFilterStore.setState({
      flightCountries: [],
      eventCountries: [],
      flightSpeedMin: null,
      flightSpeedMax: null,
      shipSpeedMin: null,
      shipSpeedMax: null,
      altitudeMin: null,
      altitudeMax: null,
      proximityPin: null,
      proximityRadiusKm: 100,
      dateStart: null,
      dateEnd: null,
      isSettingPin: false,
    });
  });

  it('returns zero counts with empty stores', () => {
    const { result } = renderHook(() => useCounterData());
    expect(result.current.iranianFlights).toBe(0);
    expect(result.current.unidentifiedFlights).toBe(0);
    expect(result.current.airstrikes).toEqual({ filtered: 0, total: 0 });
    expect(result.current.groundCombat).toEqual({ filtered: 0, total: 0 });
    expect(result.current.targeted).toEqual({ filtered: 0, total: 0 });
    expect(result.current.totalEvents).toEqual({ filtered: 0, total: 0 });
    expect(result.current.fatalities).toEqual({ filtered: 0, total: 0 });
  });

  it('counts iranianFlights from raw flights with originCountry Iran', () => {
    useFlightStore.setState({
      flights: [
        makeFlight('f1', 'Iran'),
        makeFlight('f2', 'Iran'),
        makeFlight('f3', 'Qatar'),
      ],
      flightCount: 3,
    });
    const { result } = renderHook(() => useCounterData());
    expect(result.current.iranianFlights).toBe(2);
  });

  it('counts unidentifiedFlights from raw flights with unidentified flag', () => {
    useFlightStore.setState({
      flights: [
        makeFlight('f1', 'Unknown', true),
        makeFlight('f2', 'Iran', false),
        makeFlight('f3', 'Unknown', true),
      ],
      flightCount: 3,
    });
    const { result } = renderHook(() => useCounterData());
    expect(result.current.unidentifiedFlights).toBe(2);
  });

  it('computes event group totals from raw events matching CONFLICT_TOGGLE_GROUPS', () => {
    useEventStore.setState({
      events: [
        makeEvent('a1', 'airstrike'),
        makeEvent('a2', 'airstrike'),
        makeEvent('gc1', 'ground_combat'),
        makeEvent('sh1', 'shelling'),
        makeEvent('t1', 'assassination'),
        makeEvent('bl1', 'blockade'),
      ],
      eventCount: 6,
    });
    const { result } = renderHook(() => useCounterData());
    expect(result.current.airstrikes.total).toBe(2);
    expect(result.current.groundCombat.total).toBe(3); // ground_combat + shelling + blockade
    expect(result.current.targeted.total).toBe(1);
    expect(result.current.totalEvents.total).toBe(6);
  });

  it('filtered counts respect toggle gating (showAirstrikes=false yields 0 filtered airstrikes)', () => {
    useEventStore.setState({
      events: [
        makeEvent('a1', 'airstrike'),
        makeEvent('gc1', 'ground_combat'),
        makeEvent('t1', 'assassination'),
      ],
      eventCount: 3,
    });
    useUIStore.setState({ showAirstrikes: false });
    const { result } = renderHook(() => useCounterData());
    expect(result.current.airstrikes.filtered).toBe(0);
    expect(result.current.airstrikes.total).toBe(1);
    // Other groups still show filtered counts
    expect(result.current.groundCombat.filtered).toBe(1);
    expect(result.current.targeted.filtered).toBe(1);
  });

  it('all filtered counts are 0 when showEvents is false', () => {
    useEventStore.setState({
      events: [
        makeEvent('a1', 'airstrike'),
        makeEvent('gc1', 'ground_combat'),
        makeEvent('t1', 'assassination'),
      ],
      eventCount: 3,
    });
    useUIStore.setState({ showEvents: false });
    const { result } = renderHook(() => useCounterData());
    expect(result.current.airstrikes.filtered).toBe(0);
    expect(result.current.groundCombat.filtered).toBe(0);
    expect(result.current.targeted.filtered).toBe(0);
    expect(result.current.totalEvents.filtered).toBe(0);
    expect(result.current.fatalities.filtered).toBe(0);
    // Totals still reflect raw
    expect(result.current.airstrikes.total).toBe(1);
  });

  it('totalEvents sums three groups independently for filtered and total', () => {
    useEventStore.setState({
      events: [
        makeEvent('a1', 'airstrike'),
        makeEvent('gc1', 'ground_combat'),
        makeEvent('t1', 'assassination'),
        makeEvent('t2', 'abduction'),
      ],
      eventCount: 4,
    });
    useUIStore.setState({ showTargeted: false });
    const { result } = renderHook(() => useCounterData());
    expect(result.current.totalEvents.total).toBe(4);
    expect(result.current.totalEvents.filtered).toBe(2); // airstrike + ground_combat, targeted OFF
  });

  it('fatalities.total sums data.fatalities from all raw events', () => {
    useEventStore.setState({
      events: [
        makeEvent('a1', 'airstrike', 5),
        makeEvent('gc1', 'ground_combat', 10),
        makeEvent('t1', 'assassination', 1),
      ],
      eventCount: 3,
    });
    const { result } = renderHook(() => useCounterData());
    expect(result.current.fatalities.total).toBe(16);
    expect(result.current.fatalities.filtered).toBe(16); // all toggles on
  });

  it('fatalities.filtered respects toggle gating', () => {
    useEventStore.setState({
      events: [
        makeEvent('a1', 'airstrike', 5),
        makeEvent('gc1', 'ground_combat', 10),
        makeEvent('t1', 'assassination', 1),
      ],
      eventCount: 3,
    });
    useUIStore.setState({ showGroundCombat: false });
    const { result } = renderHook(() => useCounterData());
    expect(result.current.fatalities.total).toBe(16);
    expect(result.current.fatalities.filtered).toBe(6); // 5 (airstrike) + 1 (assassination)
  });

  it('flight counters derive from raw flights regardless of filters', () => {
    useFlightStore.setState({
      flights: [
        makeFlight('f1', 'Iran'),
        makeFlight('f2', 'Qatar'),
      ],
      flightCount: 2,
    });
    // Apply a country filter -- should NOT affect flight counters
    useFilterStore.setState({ flightCountries: ['Qatar'] });
    const { result } = renderHook(() => useCounterData());
    // iranianFlights still counts from raw
    expect(result.current.iranianFlights).toBe(1);
  });
});
