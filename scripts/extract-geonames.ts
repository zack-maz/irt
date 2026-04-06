/**
 * One-time script to extract Middle East cities from GeoNames data.
 *
 * Downloads cities15000.zip (all cities with population >= 15,000),
 * filters to ME bbox with population >= 50,000, and outputs a typed
 * JSON array to src/data/me-cities.json.
 *
 * Usage: npx tsx scripts/extract-geonames.ts
 *
 * Output:
 *   src/data/me-cities.json - ME cities with name, asciiName, lat, lng, countryCode, population
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import AdmZip from 'adm-zip';

const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities15000.zip';

// Extended ME bbox matching political overlay (lat 0-50, lng 20-80)
const ME_BBOX = {
  latMin: 0,
  latMax: 50,
  lngMin: 20,
  lngMax: 80,
};

const MIN_POPULATION = 200_000;

// ISO 2-letter country codes for Greater Middle East (matches MIDDLE_EAST_FIPS in gdelt.ts)
// Includes neighboring countries that appear in conflict events
const ME_COUNTRY_CODES = new Set([
  'IR', // Iran
  'IQ', // Iraq (FIPS: IZ)
  'SY', // Syria
  'TR', // Turkey (FIPS: TU)
  'SA', // Saudi Arabia
  'YE', // Yemen (FIPS: YM)
  'OM', // Oman (FIPS: MU)
  'AE', // United Arab Emirates
  'QA', // Qatar
  'BH', // Bahrain (FIPS: BA)
  'KW', // Kuwait (FIPS: KU)
  'JO', // Jordan
  'IL', // Israel (FIPS: IS)
  'PS', // Palestine (FIPS: IS)
  'LB', // Lebanon (FIPS: LE)
  'AF', // Afghanistan
  'PK', // Pakistan
  'EG', // Egypt (regional actor)
  'SD', // Sudan (regional actor)
  'SO', // Somalia (regional actor)
  'DJ', // Djibouti (strategic strait)
  'ER', // Eritrea (Red Sea corridor)
]);

// City names that are common English words or too short -- will cause NLP false matches
const EXCLUDE_NAMES = new Set([
  'sur', 'salt', 'hit', 'hail', 'as', 'ad', 'al', 'ar', 'at',
  'dam', 'van', 'bar', 'star', 'mesa', 'lod', 'acre', 'soma',
  'deal', 'ram', 'bid', 'bam', 'say', 'qom', 'ray', 'net',
  'end', 'lar', 'tar',
]);

interface MeCity {
  name: string;
  asciiName: string;
  lat: number;
  lng: number;
  countryCode: string;
  population: number;
}

/**
 * GeoNames TSV columns:
 * 0: geonameid, 1: name, 2: asciiname, 3: alternatenames,
 * 4: latitude, 5: longitude, 6: feature class, 7: feature code,
 * 8: country code, 9: cc2, 10: admin1, 11: admin2, 12: admin3,
 * 13: admin4, 14: population, 15: elevation, 16: dem, 17: timezone,
 * 18: modification date
 */

async function main() {
  console.log('Downloading GeoNames cities15000.zip...');
  const response = await fetch(GEONAMES_URL);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

  // Extract ZIP
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const tsvEntry = entries.find(e => e.entryName === 'cities15000.txt');
  if (!tsvEntry) {
    throw new Error('cities15000.txt not found in ZIP archive');
  }

  const tsvContent = tsvEntry.getData().toString('utf-8');
  const lines = tsvContent.split('\n').filter(l => l.trim().length > 0);
  console.log(`Total cities in dump: ${lines.length}`);

  // Parse and filter
  const cities: MeCity[] = [];
  let totalInBbox = 0;
  let excludedByName = 0;
  let excludedByPopulation = 0;

  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 15) continue;

    const lat = parseFloat(cols[4]);
    const lng = parseFloat(cols[5]);

    // Filter to ME bbox
    if (lat < ME_BBOX.latMin || lat > ME_BBOX.latMax) continue;
    if (lng < ME_BBOX.lngMin || lng > ME_BBOX.lngMax) continue;

    const countryCode = cols[8].trim();

    // Filter to ME countries only
    if (!ME_COUNTRY_CODES.has(countryCode)) continue;
    totalInBbox++;

    const population = parseInt(cols[14], 10);
    if (isNaN(population) || population < MIN_POPULATION) {
      excludedByPopulation++;
      continue;
    }

    const name = cols[1].trim();
    const asciiName = cols[2].trim();

    // Exclude problematic short/common names
    if (name.length < 4 && EXCLUDE_NAMES.has(name.toLowerCase())) {
      excludedByName++;
      continue;
    }
    if (EXCLUDE_NAMES.has(name.toLowerCase())) {
      excludedByName++;
      continue;
    }

    cities.push({
      name,
      asciiName,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      countryCode,
      population,
    });
  }

  // Sort by population descending
  cities.sort((a, b) => b.population - a.population);

  // Collect unique countries
  const countries = new Set(cities.map(c => c.countryCode));

  // Write output
  const outDir = join(process.cwd(), 'src', 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'me-cities.json');
  writeFileSync(outPath, JSON.stringify(cities, null, 2) + '\n');

  console.log('\n--- Summary ---');
  console.log(`Cities in ME bbox: ${totalInBbox}`);
  console.log(`Excluded by population (<${MIN_POPULATION}): ${excludedByPopulation}`);
  console.log(`Excluded by name (short/common): ${excludedByName}`);
  console.log(`Final city count: ${cities.length}`);
  console.log(`Countries represented: ${countries.size} (${[...countries].sort().join(', ')})`);
  console.log(`Top 5: ${cities.slice(0, 5).map(c => `${c.name} (${c.countryCode}, pop ${c.population.toLocaleString()})`).join(', ')}`);
  console.log(`Output: ${outPath}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
