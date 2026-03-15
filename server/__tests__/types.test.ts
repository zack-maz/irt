// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type {
  EntityType,
  FlightEntity,
  ShipEntity,
  ConflictEventEntity,
  MapEntity,
  BoundingBox,
  CacheResponse,
} from '../types.js';

describe('MapEntity types', () => {
  it('FlightEntity has type "flight" and required data fields', () => {
    const flight: FlightEntity = {
      id: 'flight-abc123',
      type: 'flight',
      lat: 35.6892,
      lng: 51.389,
      timestamp: Date.now(),
      label: 'IRA123',
      data: {
        icao24: 'abc123',
        callsign: 'IRA123',
        originCountry: 'Iran',
        velocity: 250.5,
        heading: 180,
        altitude: 10000,
        onGround: false,
        verticalRate: -2.5,
      },
    };
    expect(flight.type).toBe('flight');
    expect(flight.data.icao24).toBe('abc123');
    expect(flight.data.onGround).toBe(false);
  });

  it('FlightEntity data allows null for optional numeric fields', () => {
    const flight: FlightEntity = {
      id: 'flight-xyz',
      type: 'flight',
      lat: 32.0,
      lng: 53.0,
      timestamp: Date.now(),
      label: 'Unknown',
      data: {
        icao24: 'xyz789',
        callsign: '',
        originCountry: 'Unknown',
        velocity: null,
        heading: null,
        altitude: null,
        onGround: true,
        verticalRate: null,
      },
    };
    expect(flight.data.velocity).toBeNull();
    expect(flight.data.heading).toBeNull();
    expect(flight.data.altitude).toBeNull();
    expect(flight.data.verticalRate).toBeNull();
  });

  it('ShipEntity has type "ship" and required data fields', () => {
    const ship: ShipEntity = {
      id: 'ship-123456789',
      type: 'ship',
      lat: 27.1,
      lng: 56.3,
      timestamp: Date.now(),
      label: 'PERSIAN GULF TRADER',
      data: {
        mmsi: 123456789,
        shipName: 'PERSIAN GULF TRADER',
        speedOverGround: 12.5,
        courseOverGround: 270,
        trueHeading: 268,
      },
    };
    expect(ship.type).toBe('ship');
    expect(ship.data.mmsi).toBe(123456789);
    expect(ship.data.speedOverGround).toBe(12.5);
  });

  it('ConflictEventEntity has type "missile" or "drone"', () => {
    const missile: ConflictEventEntity = {
      id: 'event-IRN001',
      type: 'missile',
      lat: 33.5,
      lng: 48.2,
      timestamp: Date.now(),
      label: 'Missile strike near border',
      data: {
        eventType: 'Explosions/Remote violence',
        subEventType: 'Shelling/artillery/missile attack',
        fatalities: 0,
        actor1: 'Military Forces of Iran',
        actor2: '',
        notes: 'Reported missile launch detected',
        source: 'ACLED',
      },
    };
    expect(missile.type).toBe('missile');

    const drone: ConflictEventEntity = {
      id: 'event-IRN002',
      type: 'drone',
      lat: 34.0,
      lng: 50.1,
      timestamp: Date.now(),
      label: 'Drone strike',
      data: {
        eventType: 'Explosions/Remote violence',
        subEventType: 'Air/drone strike',
        fatalities: 3,
        actor1: 'Unknown',
        actor2: 'Civilians',
        notes: 'Drone strike reported',
        source: 'ACLED',
      },
    };
    expect(drone.type).toBe('drone');
  });

  it('MapEntity discriminated union narrows by type', () => {
    const entities: MapEntity[] = [
      {
        id: 'flight-1',
        type: 'flight',
        lat: 35,
        lng: 51,
        timestamp: Date.now(),
        label: 'F1',
        data: {
          icao24: 'a',
          callsign: 'A',
          originCountry: 'Iran',
          velocity: null,
          heading: null,
          altitude: null,
          onGround: false,
          verticalRate: null,
        },
      },
      {
        id: 'ship-1',
        type: 'ship',
        lat: 27,
        lng: 56,
        timestamp: Date.now(),
        label: 'S1',
        data: {
          mmsi: 1,
          shipName: 'S',
          speedOverGround: 0,
          courseOverGround: 0,
          trueHeading: 0,
        },
      },
    ];

    // Discriminated union narrowing
    for (const entity of entities) {
      switch (entity.type) {
        case 'flight':
          expect(entity.data.icao24).toBeDefined();
          break;
        case 'ship':
          expect(entity.data.mmsi).toBeDefined();
          break;
        case 'missile':
        case 'drone':
          expect(entity.data.eventType).toBeDefined();
          break;
      }
    }
  });

  it('BoundingBox has south, north, west, east fields', () => {
    const bbox: BoundingBox = {
      south: 25.0,
      north: 40.0,
      west: 44.0,
      east: 63.5,
    };
    expect(bbox.south).toBe(25.0);
    expect(bbox.north).toBe(40.0);
    expect(bbox.west).toBe(44.0);
    expect(bbox.east).toBe(63.5);
  });

  it('CacheResponse wraps data with stale and lastFresh', () => {
    const response: CacheResponse<string[]> = {
      data: ['a', 'b'],
      stale: false,
      lastFresh: Date.now(),
    };
    expect(response.data).toEqual(['a', 'b']);
    expect(response.stale).toBe(false);
    expect(typeof response.lastFresh).toBe('number');
  });

  it('EntityType includes all four types', () => {
    const types: EntityType[] = ['flight', 'ship', 'missile', 'drone'];
    expect(types).toHaveLength(4);
  });
});
