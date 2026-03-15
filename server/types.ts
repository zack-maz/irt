// MapEntity discriminated union -- shared data contract between server and frontend

export interface MapEntityBase {
  id: string;
  type: EntityType;
  lat: number;
  lng: number;
  timestamp: number; // Unix ms
  label: string;
}

export type EntityType = 'flight' | 'ship' | 'missile' | 'drone';

export interface FlightEntity extends MapEntityBase {
  type: 'flight';
  data: {
    icao24: string;
    callsign: string;
    originCountry: string;
    velocity: number | null; // m/s
    heading: number | null; // degrees
    altitude: number | null; // meters
    onGround: boolean;
    verticalRate: number | null; // m/s
  };
}

export interface ShipEntity extends MapEntityBase {
  type: 'ship';
  data: {
    mmsi: number;
    shipName: string;
    speedOverGround: number; // knots
    courseOverGround: number; // degrees
    trueHeading: number; // degrees
  };
}

export interface ConflictEventEntity extends MapEntityBase {
  type: 'missile' | 'drone';
  data: {
    eventType: string; // ACLED event_type
    subEventType: string; // ACLED sub_event_type
    fatalities: number;
    actor1: string;
    actor2: string;
    notes: string;
    source: string;
  };
}

export type MapEntity = FlightEntity | ShipEntity | ConflictEventEntity;

export interface BoundingBox {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface CacheResponse<T> {
  data: T;
  stale: boolean;
  lastFresh: number; // Unix ms of last successful fetch
}
