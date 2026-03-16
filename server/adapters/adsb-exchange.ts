import { RateLimitError } from '../types.js';
import type { FlightEntity } from '../types.js';
import {
  IRAN_CENTER,
  ADSB_RADIUS_NM,
  KNOTS_TO_MS,
  FEET_TO_METERS,
  FPM_TO_MS,
} from '../constants.js';

const RAPIDAPI_HOST = 'adsbexchange-com1.p.rapidapi.com';

export interface AdsbAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | 'ground';
  gs?: number; // knots
  track?: number; // degrees
  baro_rate?: number; // feet/min
  r?: string; // registration
  dbFlags?: number; // bitfield: 1=military
}

interface AdsbResponse {
  ac: AdsbAircraft[] | null;
  msg: string;
  now: number;
  total: number;
}

export function normalizeAircraft(ac: AdsbAircraft): FlightEntity | null {
  if (ac.lat == null || ac.lon == null) return null;
  if (ac.alt_baro === 'ground') return null;

  const callsign = typeof ac.flight === 'string' ? ac.flight.trim() : '';
  const cleanHex = ac.hex.replace(/^~/, '');

  return {
    id: `flight-${cleanHex}`,
    type: 'flight',
    lat: ac.lat,
    lng: ac.lon,
    timestamp: Date.now(),
    label: callsign || ac.hex,
    data: {
      icao24: ac.hex,
      callsign: callsign || ac.hex,
      originCountry: '',
      velocity: ac.gs != null ? ac.gs * KNOTS_TO_MS : null,
      heading: ac.track ?? null,
      altitude: ac.alt_baro != null ? (ac.alt_baro as number) * FEET_TO_METERS : null,
      onGround: false,
      verticalRate: ac.baro_rate != null ? ac.baro_rate * FPM_TO_MS : null,
      unidentified: callsign === '',
    },
  };
}

export async function fetchFlights(): Promise<FlightEntity[]> {
  const start = Date.now();
  const apiKey = process.env.ADSB_EXCHANGE_API_KEY;

  if (!apiKey) {
    throw new Error('ADSB_EXCHANGE_API_KEY environment variable is not set');
  }

  const url = `https://${RAPIDAPI_HOST}/v2/lat/${IRAN_CENTER.lat}/lon/${IRAN_CENTER.lon}/dist/${ADSB_RADIUS_NM}/`;

  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  });

  if (res.status === 429) {
    throw new RateLimitError('ADS-B Exchange rate limit exceeded');
  }

  if (!res.ok) {
    throw new Error(`ADS-B Exchange API error: ${res.status}`);
  }

  const data = (await res.json()) as AdsbResponse;
  const aircraft = data.ac ?? [];

  const flights = aircraft
    .map(normalizeAircraft)
    .filter((f): f is FlightEntity => f !== null);

  console.log(`[adsb-exchange] fetched ${flights.length} flights in ${Date.now() - start}ms`);
  return flights;
}
