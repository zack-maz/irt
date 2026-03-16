import type { BoundingBox } from './types.js';

// Greater Middle East: Iran + neighbors (Iraq, Turkey, Saudi, UAE, Pakistan, Afghanistan)
// Persian Gulf, Gulf of Oman, Caspian Sea, Red Sea approaches
export const IRAN_BBOX: BoundingBox = {
  south: 15.0,
  north: 42.0,
  west: 30.0,
  east: 70.0,
};

// ADS-B Exchange/adsb.lol center point for radius query (centered on region)
export const IRAN_CENTER = { lat: 30.0, lon: 50.0 } as const;
export const ADSB_RADIUS_NM = 500;

// ADS-B Exchange polling interval: 10K requests/month / 30 days => ~260s per poll
export const ADSB_POLL_INTERVAL = 260_000;

// Unit conversion constants (ADS-B Exchange uses imperial units)
export const KNOTS_TO_MS = 0.514444;
export const FEET_TO_METERS = 0.3048;
export const FPM_TO_MS = 0.00508; // feet per minute to meters per second

// Cache TTL values per data source (milliseconds)
export const CACHE_TTL = {
  flights: 10_000, // 10s -- OpenSky polling interval
  adsbFlights: 260_000, // 260s -- same as ADS-B Exchange poll interval
  adsblolFlights: 30_000, // 30s -- adsb.lol community API (respectful polling)
  ships: 0, // N/A for WebSocket push
  events: 300_000, // 5min -- ACLED has 24-48h inherent delay
} as const;
