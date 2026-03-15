import { describe, it, expect, beforeEach } from 'vitest';
import { useFlightStore } from '@/stores/flightStore';
import type { FlightEntity, CacheResponse } from '@/types/entities';

function mockFlight(overrides: Partial<FlightEntity> = {}): FlightEntity {
  return {
    id: 'flight-abc123',
    type: 'flight',
    lat: 32.5,
    lng: 53.0,
    timestamp: Date.now(),
    label: 'QTR123',
    data: {
      icao24: 'abc123',
      callsign: 'QTR123',
      originCountry: 'Qatar',
      velocity: 250,
      heading: 45,
      altitude: 10000,
      onGround: false,
      verticalRate: 0,
      unidentified: false,
    },
    ...overrides,
  };
}

describe('flightStore', () => {
  beforeEach(() => {
    useFlightStore.setState({
      flights: [],
      connectionStatus: 'loading',
      lastFetchAt: null,
      lastFresh: null,
      flightCount: 0,
    });
  });

  it('has correct initial state', () => {
    const state = useFlightStore.getState();
    expect(state.flights).toEqual([]);
    expect(state.connectionStatus).toBe('loading');
    expect(state.lastFetchAt).toBeNull();
    expect(state.lastFresh).toBeNull();
    expect(state.flightCount).toBe(0);
  });

  it('setFlightData with stale=false sets connected status and updates flights', () => {
    const flight = mockFlight();
    const response: CacheResponse<FlightEntity[]> = {
      data: [flight],
      stale: false,
      lastFresh: Date.now(),
    };

    useFlightStore.getState().setFlightData(response);

    const state = useFlightStore.getState();
    expect(state.flights).toEqual([flight]);
    expect(state.connectionStatus).toBe('connected');
    expect(state.flightCount).toBe(1);
    expect(state.lastFetchAt).toBeTypeOf('number');
    expect(state.lastFresh).toBeTypeOf('number');
  });

  it('setFlightData with stale=true sets stale status and preserves existing lastFresh', () => {
    // First set a fresh response to establish lastFresh
    const freshTime = 1000000;
    useFlightStore.setState({ lastFresh: freshTime });

    const flight = mockFlight();
    const response: CacheResponse<FlightEntity[]> = {
      data: [flight],
      stale: true,
      lastFresh: 0, // Server's lastFresh -- should not overwrite store's
    };

    useFlightStore.getState().setFlightData(response);

    const state = useFlightStore.getState();
    expect(state.connectionStatus).toBe('stale');
    expect(state.lastFresh).toBe(freshTime); // Preserved, not overwritten
    expect(state.flightCount).toBe(1);
  });

  it('setError sets error status', () => {
    useFlightStore.getState().setError();

    expect(useFlightStore.getState().connectionStatus).toBe('error');
  });

  it('setLoading sets loading status', () => {
    useFlightStore.setState({ connectionStatus: 'connected' });

    useFlightStore.getState().setLoading();

    expect(useFlightStore.getState().connectionStatus).toBe('loading');
  });

  it('clearStaleData empties flights and sets error status', () => {
    useFlightStore.setState({
      flights: [mockFlight()],
      flightCount: 1,
      connectionStatus: 'stale',
    });

    useFlightStore.getState().clearStaleData();

    const state = useFlightStore.getState();
    expect(state.flights).toEqual([]);
    expect(state.flightCount).toBe(0);
    expect(state.connectionStatus).toBe('error');
  });
});
