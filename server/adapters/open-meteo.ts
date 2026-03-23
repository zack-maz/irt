import type { WeatherGridPoint } from '../types.js';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 30_000;

// Grid bounds: lat 15-42, lng 30-70 at 1-degree steps
const LAT_MIN = 15;
const LAT_MAX = 42;
const LNG_MIN = 30;
const LNG_MAX = 70;

// Split into 2 latitude bands to stay under Open-Meteo's 1000-location limit
// Band 1: lat 15-28 (14 lats * 41 lngs = 574 locations)
// Band 2: lat 29-42 (14 lats * 41 lngs = 574 locations)
const LAT_SPLIT = 28;

interface OpenMeteoResult {
  latitude: number;
  longitude: number;
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
}

/** Build comma-separated coordinate strings for a latitude band */
function buildCoords(latStart: number, latEnd: number): { lats: string; lngs: string } {
  const latValues: number[] = [];
  const lngValues: number[] = [];

  for (let lat = latStart; lat <= latEnd; lat++) {
    for (let lng = LNG_MIN; lng <= LNG_MAX; lng++) {
      latValues.push(lat);
      lngValues.push(lng);
    }
  }

  return {
    lats: latValues.join(','),
    lngs: lngValues.join(','),
  };
}

/** Fetch a single latitude band from Open-Meteo */
async function fetchBand(latStart: number, latEnd: number): Promise<WeatherGridPoint[]> {
  const { lats, lngs } = buildCoords(latStart, latEnd);

  const url = `${BASE_URL}?latitude=${lats}&longitude=${lngs}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&forecast_days=1`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo API returned ${res.status}`);
  }

  const data = (await res.json()) as OpenMeteoResult[];

  return data.map((r) => ({
    lat: r.latitude,
    lng: r.longitude,
    temperature: r.current.temperature_2m,
    windSpeed: r.current.wind_speed_10m,
    windDirection: r.current.wind_direction_10m,
  }));
}

/**
 * Fetch weather grid data from Open-Meteo.
 *
 * Returns a 1-degree grid of temperature, wind speed (knots), and wind direction
 * covering lat 15-42, lng 30-70 (Greater Middle East).
 *
 * Splits into 2 requests to stay under the Open-Meteo 1000-location limit.
 */
export async function fetchWeather(): Promise<WeatherGridPoint[]> {
  const [band1, band2] = await Promise.all([
    fetchBand(LAT_MIN, LAT_SPLIT),
    fetchBand(LAT_SPLIT + 1, LAT_MAX),
  ]);

  return [...band1, ...band2];
}
