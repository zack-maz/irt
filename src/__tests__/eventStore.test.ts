import { describe, it, expect, beforeEach } from 'vitest';
import { useEventStore } from '@/stores/eventStore';
import type { ConflictEventEntity, CacheResponse } from '@/types/entities';

const mockAirstrikeEvent: ConflictEventEntity = {
  id: 'event-IRN001',
  type: 'airstrike',
  lat: 32.6546,
  lng: 51.668,
  timestamp: Date.now(),
  label: 'Aerial weapons',
  data: {
    eventType: 'Aerial weapons',
    subEventType: 'CAMEO 195',
    fatalities: 0,
    actor1: 'Unknown',
    actor2: 'Unknown',
    notes: '',
    source: 'ISNA',
    goldsteinScale: -5.0,
    locationName: 'Isfahan, Iran',
    cameoCode: '195',
  },
};

const mockGroundCombatEvent: ConflictEventEntity = {
  id: 'event-IRN002',
  type: 'ground_combat',
  lat: 35.6892,
  lng: 51.389,
  timestamp: Date.now(),
  label: 'Conventional military force',
  data: {
    eventType: 'Conventional military force',
    subEventType: 'CAMEO 190',
    fatalities: 3,
    actor1: 'Unknown',
    actor2: 'Unknown',
    notes: '',
    source: 'Reuters',
    goldsteinScale: -9.5,
    locationName: 'Tehran, Iran',
    cameoCode: '190',
  },
};

describe('eventStore', () => {
  beforeEach(() => {
    useEventStore.setState({
      events: [],
      connectionStatus: 'loading',
      lastFetchAt: null,
      eventCount: 0,
    });
  });

  it('has correct initial state (no lastFresh field)', () => {
    const state = useEventStore.getState();
    expect(state.events).toEqual([]);
    expect(state.connectionStatus).toBe('loading');
    expect(state.lastFetchAt).toBeNull();
    expect(state.eventCount).toBe(0);
    expect('lastFresh' in state).toBe(false);
  });

  it('setEventData with non-stale response sets connected status', () => {
    const response: CacheResponse<ConflictEventEntity[]> = {
      data: [mockAirstrikeEvent, mockGroundCombatEvent],
      stale: false,
      lastFresh: Date.now(),
    };

    useEventStore.getState().setEventData(response);

    const state = useEventStore.getState();
    expect(state.events).toEqual([mockAirstrikeEvent, mockGroundCombatEvent]);
    expect(state.eventCount).toBe(2);
    expect(state.connectionStatus).toBe('connected');
    expect(state.lastFetchAt).not.toBeNull();
  });

  it('setEventData with stale response sets status to stale', () => {
    const staleResponse: CacheResponse<ConflictEventEntity[]> = {
      data: [mockAirstrikeEvent],
      stale: true,
      lastFresh: Date.now(),
    };

    useEventStore.getState().setEventData(staleResponse);

    const state = useEventStore.getState();
    expect(state.connectionStatus).toBe('stale');
  });

  it('setError sets connectionStatus to error', () => {
    useEventStore.getState().setError();
    expect(useEventStore.getState().connectionStatus).toBe('error');
  });

  it('setLoading sets connectionStatus to loading', () => {
    useEventStore.getState().setLoading();
    expect(useEventStore.getState().connectionStatus).toBe('loading');
  });

  it('does not have a clearStaleData action', () => {
    const state = useEventStore.getState();
    expect('clearStaleData' in state).toBe(false);
  });
});
