import type { BoundingBox } from './types.js';

// Iran + immediate neighboring waters (Persian Gulf, Gulf of Oman, Caspian Sea)
export const IRAN_BBOX: BoundingBox = {
  south: 25.0,
  north: 40.0,
  west: 44.0,
  east: 63.5,
};

// Cache TTL values per data source (milliseconds)
export const CACHE_TTL = {
  flights: 10_000, // 10s -- OpenSky polling interval
  ships: 0, // N/A for WebSocket push
  events: 300_000, // 5min -- ACLED has 24-48h inherent delay
} as const;
