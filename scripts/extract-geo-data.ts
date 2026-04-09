/**
 * One-time script to extract Middle East country polygons and disputed territories
 * from Natural Earth GeoJSON data.
 *
 * Usage: npx tsx scripts/extract-geo-data.ts
 *
 * Outputs:
 *   src/data/countries.json  - Middle East countries from Natural Earth 110m
 *   src/data/disputed.json   - Gaza, West Bank, Golan Heights from Natural Earth 10m
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const NE_110M_COUNTRIES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

const NE_10M_DISPUTED_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_disputed_areas.geojson';

// Extended bbox for filtering (wider than display bbox to capture full polygons)
const FILTER_BBOX = {
  latMin: 0,
  latMax: 50,
  lngMin: 20,
  lngMax: 80,
};

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/** Round a number to N decimal places */
function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/** Recursively round all coordinates in a GeoJSON geometry */
function roundCoords(coords: unknown, decimals: number): unknown {
  if (typeof coords === 'number') return roundTo(coords, decimals);
  if (Array.isArray(coords)) return coords.map((c) => roundCoords(c, decimals));
  return coords;
}

/** Check if a feature's bbox overlaps with the filter region */
function overlapsFilterRegion(feature: GeoJSONFeature): boolean {
  // Compute bbox from geometry coordinates
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  function walkCoords(c: unknown): void {
    if (typeof c === 'number') return;
    if (!Array.isArray(c)) return;
    // If it's a coordinate pair [lng, lat]
    if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
      const lng = c[0] as number;
      const lat = c[1] as number;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const child of c) walkCoords(child);
  }

  walkCoords(feature.geometry.coordinates);

  // Check overlap with filter bbox
  return (
    maxLng >= FILTER_BBOX.lngMin &&
    minLng <= FILTER_BBOX.lngMax &&
    maxLat >= FILTER_BBOX.latMin &&
    minLat <= FILTER_BBOX.latMax
  );
}

async function fetchJSON(url: string): Promise<GeoJSONCollection> {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return (await res.json()) as GeoJSONCollection;
}

async function main() {
  const outDir = join(process.cwd(), 'src', 'data');
  mkdirSync(outDir, { recursive: true });

  // --- COUNTRIES ---
  console.log('\n=== Countries (110m) ===');
  const countriesRaw = await fetchJSON(NE_110M_COUNTRIES_URL);
  console.log(`Total features: ${countriesRaw.features.length}`);

  const filteredCountries = countriesRaw.features.filter(overlapsFilterRegion).map((f) => {
    let isoA3 = f.properties.ISO_A3 as string;
    const adm0A3 = f.properties.ADM0_A3 as string;
    const name = f.properties.NAME as string;

    // Fallback for -99 codes
    if (isoA3 === '-99' && adm0A3) {
      console.log(`  ISO_A3 fallback: ${name} -> ${adm0A3} (was -99)`);
      isoA3 = adm0A3;
    }

    return {
      type: 'Feature' as const,
      properties: { ISO_A3: isoA3, NAME: name },
      geometry: {
        type: f.geometry.type,
        coordinates: roundCoords(f.geometry.coordinates, 2),
      },
    };
  });

  const countriesOut: GeoJSONCollection = {
    type: 'FeatureCollection',
    features: filteredCountries,
  };

  const countriesPath = join(outDir, 'countries.json');
  writeFileSync(countriesPath, JSON.stringify(countriesOut));

  const countriesSize = Buffer.byteLength(JSON.stringify(countriesOut));
  console.log(`Filtered features: ${filteredCountries.length}`);
  console.log(`Output size: ${(countriesSize / 1024).toFixed(1)} KB`);
  console.log('ISO A3 codes:', filteredCountries.map((f) => f.properties.ISO_A3).join(', '));

  // Verify no -99 codes remain
  const bad = filteredCountries.filter((f) => f.properties.ISO_A3 === '-99');
  if (bad.length > 0) {
    console.error(
      'ERROR: Still have -99 codes:',
      bad.map((f) => f.properties.NAME),
    );
    process.exit(1);
  }

  // --- DISPUTED TERRITORIES ---
  console.log('\n=== Disputed Territories (10m) ===');
  const disputedRaw = await fetchJSON(NE_10M_DISPUTED_URL);
  console.log(`Total features: ${disputedRaw.features.length}`);

  // Log all NAME values for verification
  console.log('All NAME values in dataset:');
  for (const f of disputedRaw.features) {
    console.log(`  - "${f.properties.NAME}"`);
  }

  const disputedKeywords = ['Gaza', 'West Bank', 'Golan'];
  const filteredDisputed = disputedRaw.features
    .filter((f) => {
      const name = f.properties.NAME as string;
      return disputedKeywords.some((kw) => name.includes(kw));
    })
    .map((f) => ({
      type: 'Feature' as const,
      properties: { NAME: f.properties.NAME as string },
      geometry: {
        type: f.geometry.type,
        coordinates: roundCoords(f.geometry.coordinates, 3),
      },
    }));

  const disputedOut: GeoJSONCollection = {
    type: 'FeatureCollection',
    features: filteredDisputed,
  };

  const disputedPath = join(outDir, 'disputed.json');
  writeFileSync(disputedPath, JSON.stringify(disputedOut));

  const disputedSize = Buffer.byteLength(JSON.stringify(disputedOut));
  console.log(`Filtered features: ${filteredDisputed.length}`);
  console.log(`Output size: ${(disputedSize / 1024).toFixed(1)} KB`);
  console.log('Names:', filteredDisputed.map((f) => f.properties.NAME).join(', '));

  if (filteredDisputed.length !== 3) {
    console.warn(`WARNING: Expected 3 disputed features, got ${filteredDisputed.length}`);
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
