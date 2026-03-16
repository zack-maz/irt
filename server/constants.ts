import type { BoundingBox } from './types.js';

// Iran + immediate neighboring waters (Persian Gulf, Gulf of Oman, Caspian Sea)
export const IRAN_BBOX: BoundingBox = {
  south: 25.0,
  north: 40.0,
  west: 44.0,
  east: 63.5,
};

// ADS-B Exchange center point for 250 NM radius query (covers core Iran airspace)
export const IRAN_CENTER = { lat: 32.5, lon: 53.75 } as const;
export const ADSB_RADIUS_NM = 250;

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
