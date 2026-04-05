/**
 * Open-Meteo precipitation adapter.
 *
 * Fetches 30-day precipitation totals and computes anomaly ratios
 * for water facility locations. Deduplicates to a 0.5° grid (~50km)
 * to minimize API calls, then fans results back to all original locations.
 */

import { log } from '../lib/logger.js';

export interface PrecipitationData {
  lat: number;
  lng: number;
  last30DaysMm: number;
  anomalyRatio: number;
  updatedAt: number;
}

/** Approximate regional monthly precipitation normals (mm) */
const REGIONAL_NORMALS_MM: Record<string, number> = {
  arid: 20,    // Arabian Peninsula, central Iran, Sahara
  fertile: 50, // Fertile Crescent, coastal areas, Turkey
};

/**
 * Estimate the regional monthly normal precipitation for a coordinate.
 * Fertile Crescent: lat 30-40, lng 35-50 (Iraq, Syria, SE Turkey, Lebanon)
 * Everything else: arid default (20mm/month).
 */
function estimateNormalMm(lat: number, lng: number): number {
  if (lat >= 30 && lat <= 40 && lng >= 35 && lng <= 50) {
    return REGIONAL_NORMALS_MM.fertile;
  }
  return REGIONAL_NORMALS_MM.arid;
}

const BATCH_SIZE = 100;
const TIMEOUT_MS = 30_000;
/** Grid quantization step in degrees (~50km) */
const GRID_STEP = 0.5;

interface OpenMeteoDailyResponse {
  daily: {
    time: string[];
    precipitation_sum: (number | null)[];
  };
}

/** Quantize a coordinate to the grid */
function quantize(v: number): number {
  return Math.round(v / GRID_STEP) * GRID_STEP;
}

function gridKey(lat: number, lng: number): string {
  return `${quantize(lat).toFixed(2)},${quantize(lng).toFixed(2)}`;
}

/**
 * Fetch 30-day precipitation data for a list of locations.
 *
 * Deduplicates locations to a 0.5° grid, fetches unique cells in batches
 * of 100, then maps results back to every original location via its
 * nearest grid cell. Skips failed batches instead of aborting entirely.
 */
export async function fetchPrecipitation(
  locations: { lat: number; lng: number }[],
): Promise<PrecipitationData[]> {
  if (locations.length === 0) return [];

  // Deduplicate to grid cells
  const cellMap = new Map<string, { lat: number; lng: number }>();
  for (const loc of locations) {
    const key = gridKey(loc.lat, loc.lng);
    if (!cellMap.has(key)) {
      cellMap.set(key, { lat: quantize(loc.lat), lng: quantize(loc.lng) });
    }
  }
  const uniqueCells = Array.from(cellMap.values());

  log({ level: 'info', message: `[open-meteo-precip] ${locations.length} locations → ${uniqueCells.length} unique grid cells (${Math.ceil(uniqueCells.length / BATCH_SIZE)} batches)` });

  // Fetch precipitation for unique grid cells
  const cellResults = new Map<string, { totalMm: number; anomalyRatio: number }>();

  for (let i = 0; i < uniqueCells.length; i += BATCH_SIZE) {
    const batch = uniqueCells.slice(i, i + BATCH_SIZE);
    const lats = batch.map(c => c.lat.toFixed(2)).join(',');
    const lngs = batch.map(c => c.lng.toFixed(2)).join(',');

    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lats}&longitude=${lngs}&` +
      `daily=precipitation_sum&past_days=30&forecast_days=0&timezone=UTC`;

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) {
        log({ level: 'warn', message: `[open-meteo-precip] Batch ${Math.floor(i / BATCH_SIZE)} returned ${res.status}, skipping` });
        continue;
      }

      const json = await res.json();
      const responses: OpenMeteoDailyResponse[] = Array.isArray(json) ? json : [json];

      for (let j = 0; j < responses.length; j++) {
        const cell = batch[j];
        const data = responses[j];
        if (!data?.daily?.precipitation_sum) continue;

        const totalMm = data.daily.precipitation_sum.reduce(
          (sum: number, v: number | null) => sum + (v ?? 0),
          0,
        );

        const normalMm = estimateNormalMm(cell.lat, cell.lng);
        const anomalyRatio = normalMm > 0 ? totalMm / normalMm : 1.0;

        cellResults.set(gridKey(cell.lat, cell.lng), {
          totalMm: Math.round(totalMm * 10) / 10,
          anomalyRatio: Math.round(anomalyRatio * 100) / 100,
        });
      }
    } catch (batchErr) {
      log({ level: 'warn', message: `[open-meteo-precip] Batch ${Math.floor(i / BATCH_SIZE)} failed: ${(batchErr as Error).message}, skipping` });
      continue;
    }
  }

  // Fan results back to all original locations
  const now = Date.now();
  const results: PrecipitationData[] = [];
  for (const loc of locations) {
    const cell = cellResults.get(gridKey(loc.lat, loc.lng));
    if (!cell) continue;
    results.push({
      lat: loc.lat,
      lng: loc.lng,
      last30DaysMm: cell.totalMm,
      anomalyRatio: cell.anomalyRatio,
      updatedAt: now,
    });
  }

  log({ level: 'info', message: `[open-meteo-precip] Fetched precipitation for ${cellResults.size} cells, mapped to ${results.length} locations` });
  return results;
}
