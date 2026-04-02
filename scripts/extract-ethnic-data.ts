/**
 * One-time script to extract Middle East ethnic zone polygons.
 *
 * Primary: Downloads GeoEPR-2021 GeoJSON from ETH Zurich, filters to Middle East,
 * maps to our 10-group taxonomy, merges cross-border groups, detects overlaps.
 *
 * Fallback: If download fails, constructs approximate polygons from well-known
 * geographic boundaries of ethnic homelands.
 *
 * Usage: npx tsx scripts/extract-ethnic-data.ts
 *
 * Output: src/data/ethnic-zones.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------- Types ----------

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

type EthnicGroupId =
  | 'kurdish'
  | 'arab'
  | 'persian'
  | 'baloch'
  | 'turkmen'
  | 'druze'
  | 'alawite'
  | 'yazidi'
  | 'assyrian'
  | 'pashtun';

interface SingleGroupFeature {
  type: 'Feature';
  properties: { group: string; label: string };
  geometry: { type: string; coordinates: unknown };
}

interface OverlapFeature {
  type: 'Feature';
  properties: { groups: string[]; label: string };
  geometry: { type: string; coordinates: unknown };
}

// ---------- Config ----------

const FILTER_BBOX = {
  latMin: 0,
  latMax: 50,
  lngMin: 20,
  lngMax: 80,
};

/**
 * Case-insensitive mapping from GeoEPR group names to our taxonomy.
 * Multiple spellings map to the same ID.
 */
const GROUP_NAME_MAP: Record<string, EthnicGroupId> = {
  kurds: 'kurdish',
  kurdish: 'kurdish',
  kurd: 'kurdish',
  arabs: 'arab',
  arab: 'arab',
  persians: 'persian',
  persian: 'persian',
  baluch: 'baloch',
  baluchis: 'baloch',
  baloch: 'baloch',
  baluchi: 'baloch',
  turkmen: 'turkmen',
  turkmens: 'turkmen',
  druze: 'druze',
  druse: 'druze',
  alawites: 'alawite',
  alawite: 'alawite',
  alawi: 'alawite',
  'alawis (nusayris)': 'alawite',
  yazidis: 'yazidi',
  yazidi: 'yazidi',
  assyrians: 'assyrian',
  assyrian: 'assyrian',
  'chaldo-assyrians': 'assyrian',
  pashtuns: 'pashtun',
  pashtun: 'pashtun',
  pathans: 'pashtun',
  pathan: 'pashtun',
  pushtun: 'pashtun',
};

const GROUP_LABELS: Record<EthnicGroupId, string> = {
  kurdish: 'Kurdish',
  arab: 'Arab',
  persian: 'Persian',
  baloch: 'Baloch',
  turkmen: 'Turkmen',
  druze: 'Druze',
  alawite: 'Alawite',
  yazidi: 'Yazidi',
  assyrian: 'Assyrian',
  pashtun: 'Pashtun',
};

// ---------- Utilities ----------

function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function roundCoords(coords: unknown, decimals: number): unknown {
  if (typeof coords === 'number') return roundTo(coords, decimals);
  if (Array.isArray(coords)) return coords.map((c) => roundCoords(c, decimals));
  return coords;
}

/** Perpendicular distance from point to line segment (for Douglas-Peucker) */
function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const lineLenSq = dx * dx + dy * dy;
  if (lineLenSq === 0) {
    const pdx = point[0] - lineStart[0];
    const pdy = point[1] - lineStart[1];
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }
  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / lineLenSq;
  const tc = Math.max(0, Math.min(1, t));
  const projX = lineStart[0] + tc * dx;
  const projY = lineStart[1] + tc * dy;
  const pdx = point[0] - projX;
  const pdy = point[1] - projY;
  return Math.sqrt(pdx * pdx + pdy * pdy);
}

/** Ramer-Douglas-Peucker line simplification */
function simplifyRing(points: number[][], epsilon: number): number[][] {
  if (points.length <= 3) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0] as [number, number];
  const end = points[points.length - 1] as [number, number];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i] as [number, number], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRing(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyRing(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
}

/** Simplify all rings in a polygon/multipolygon coordinate structure */
function simplifyCoords(coords: unknown, epsilon: number): unknown {
  if (!Array.isArray(coords)) return coords;
  // Check if this is a ring (array of coordinate pairs)
  if (
    coords.length > 0 &&
    Array.isArray(coords[0]) &&
    typeof coords[0][0] === 'number'
  ) {
    return simplifyRing(coords as number[][], epsilon);
  }
  return coords.map((c) => simplifyCoords(c, epsilon));
}

function overlapsFilterRegion(feature: GeoJSONFeature): boolean {
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  function walkCoords(c: unknown): void {
    if (typeof c === 'number') return;
    if (!Array.isArray(c)) return;
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

  return (
    maxLng >= FILTER_BBOX.lngMin &&
    minLng <= FILTER_BBOX.lngMax &&
    maxLat >= FILTER_BBOX.latMin &&
    minLat <= FILTER_BBOX.latMax
  );
}

/** Extract all coordinate pairs from a geometry */
function extractCoordPairs(coords: unknown): [number, number][] {
  const pairs: [number, number][] = [];
  function walk(c: unknown): void {
    if (typeof c === 'number') return;
    if (!Array.isArray(c)) return;
    if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
      pairs.push([c[0] as number, c[1] as number]);
      return;
    }
    for (const child of c) walk(child);
  }
  walk(coords);
  return pairs;
}

/** Extract polygon rings from any geometry type (Polygon or MultiPolygon) */
function extractPolygonRings(geometry: { type: string; coordinates: unknown }): unknown[][] {
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates as unknown[]];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates as unknown[][];
  }
  return [];
}

async function fetchJSON(url: string): Promise<GeoJSONCollection> {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'IranConflictMonitor/1.0 (academic-research)',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return (await res.json()) as GeoJSONCollection;
}

// ---------- GeoEPR Download ----------

const GEOEPR_URLS = [
  'https://icr.ethz.ch/data/epr/geoepr/GeoEPR-2021.geojson',
  'https://icr.ethz.ch/data/epr/geoepr/geoepr-2021.geojson',
];

async function tryDownloadGeoEPR(): Promise<GeoJSONCollection | null> {
  for (const url of GEOEPR_URLS) {
    try {
      const data = await fetchJSON(url);
      if (data.type === 'FeatureCollection' && data.features?.length > 0) {
        console.log(`GeoEPR downloaded: ${data.features.length} features`);
        return data;
      }
    } catch (err) {
      console.log(`Failed: ${url} - ${(err as Error).message}`);
    }
  }
  return null;
}

function mapGroupName(rawName: string): EthnicGroupId | null {
  const lower = rawName.toLowerCase().trim();
  if (GROUP_NAME_MAP[lower]) return GROUP_NAME_MAP[lower];
  // Try partial match for compound names
  for (const [key, id] of Object.entries(GROUP_NAME_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }
  return null;
}

function processGeoEPR(data: GeoJSONCollection): Map<EthnicGroupId, unknown[][]> {
  // Filter to Middle East bbox
  const meFeatures = data.features.filter(overlapsFilterRegion);
  console.log(`Features in Middle East bbox: ${meFeatures.length}`);

  // Dump all unique group names
  const allNames = new Set<string>();
  for (const f of meFeatures) {
    const name = (f.properties.group || f.properties.GROUP || f.properties.name || f.properties.NAME) as string;
    if (name) allNames.add(name);
  }
  console.log(`\nAll unique group names in Middle East bbox:`);
  for (const name of [...allNames].sort()) {
    const mapped = mapGroupName(name);
    console.log(`  ${name} -> ${mapped ?? 'UNMAPPED (omitted)'}`);
  }

  // Collect polygon rings per group
  const groupRings = new Map<EthnicGroupId, unknown[][]>();

  for (const f of meFeatures) {
    const rawName = (f.properties.group || f.properties.GROUP || f.properties.name || f.properties.NAME) as string;
    if (!rawName) continue;

    const groupId = mapGroupName(rawName);
    if (!groupId) continue;

    const rings = extractPolygonRings(f.geometry);
    if (rings.length === 0) continue;

    const existing = groupRings.get(groupId) ?? [];
    existing.push(...rings);
    groupRings.set(groupId, existing);
  }

  return groupRings;
}

// ---------- Fallback: Approximate Polygons ----------

/**
 * Manually defined approximate ethnic zone polygons based on well-known
 * geographic boundaries from published ethnic distribution maps.
 */
function buildFallbackData(): Map<EthnicGroupId, unknown[][]> {
  console.log('\nFALLBACK: Using manually defined approximate ethnic zone polygons');

  const groupRings = new Map<EthnicGroupId, unknown[][]>();

  // Kurdish — SE Turkey, N Iraq, NE Syria, W Iran (unified cross-border zone)
  groupRings.set('kurdish', [
    [
      [
        [36.0, 37.0],
        [38.0, 37.5],
        [40.0, 38.0],
        [42.0, 38.5],
        [44.0, 38.0],
        [44.5, 37.5],
        [46.0, 37.0],
        [47.0, 36.5],
        [47.0, 35.5],
        [46.5, 35.0],
        [46.0, 34.5],
        [45.5, 34.0],
        [44.5, 34.5],
        [44.0, 35.0],
        [43.0, 35.5],
        [42.0, 36.0],
        [41.0, 36.5],
        [40.0, 36.5],
        [39.0, 36.5],
        [38.0, 36.5],
        [37.0, 36.5],
        [36.0, 37.0],
      ],
    ],
  ]);

  // Arab — Arabian Peninsula, Iraq (south/central), Levant coast
  groupRings.set('arab', [
    // Arabian Peninsula core
    [
      [
        [34.5, 31.5],
        [36.0, 33.0],
        [38.0, 33.5],
        [40.0, 32.0],
        [42.0, 31.0],
        [44.0, 30.0],
        [46.0, 29.5],
        [48.0, 29.0],
        [50.0, 26.5],
        [51.5, 25.5],
        [52.0, 24.0],
        [55.0, 22.0],
        [56.5, 21.0],
        [55.0, 17.0],
        [52.0, 15.0],
        [48.0, 14.0],
        [45.0, 13.0],
        [43.5, 12.5],
        [42.5, 14.0],
        [41.0, 17.0],
        [39.5, 20.0],
        [37.0, 24.0],
        [35.5, 28.0],
        [34.5, 31.5],
      ],
    ],
    // Southern Iraq
    [
      [
        [44.0, 33.5],
        [44.5, 33.5],
        [46.0, 33.0],
        [47.5, 31.5],
        [48.0, 30.5],
        [48.0, 29.5],
        [47.0, 29.5],
        [46.0, 30.0],
        [45.0, 31.0],
        [44.5, 32.0],
        [44.0, 33.0],
        [44.0, 33.5],
      ],
    ],
  ]);

  // Persian — Central/eastern Iran
  groupRings.set('persian', [
    [
      [
        [50.0, 37.5],
        [52.0, 37.0],
        [54.0, 37.0],
        [56.0, 36.5],
        [58.0, 36.0],
        [59.5, 35.0],
        [59.0, 33.0],
        [58.0, 31.0],
        [56.0, 29.0],
        [54.0, 28.0],
        [52.0, 28.5],
        [50.5, 29.5],
        [49.5, 31.0],
        [49.0, 33.0],
        [49.5, 35.0],
        [50.0, 37.5],
      ],
    ],
  ]);

  // Baloch — SE Iran, SW Pakistan
  groupRings.set('baloch', [
    [
      [
        [58.0, 28.5],
        [60.0, 29.0],
        [62.0, 29.5],
        [64.0, 30.0],
        [66.0, 29.0],
        [66.5, 27.5],
        [66.0, 26.0],
        [65.0, 25.0],
        [63.5, 25.5],
        [61.0, 25.0],
        [59.0, 25.5],
        [57.5, 26.5],
        [57.0, 27.5],
        [58.0, 28.5],
      ],
    ],
  ]);

  // Turkmen — Turkmenistan, NE Iran
  groupRings.set('turkmen', [
    [
      [
        [52.5, 42.0],
        [55.0, 42.0],
        [58.0, 41.5],
        [60.0, 41.0],
        [62.0, 40.0],
        [64.0, 39.0],
        [65.0, 38.0],
        [66.0, 37.0],
        [65.5, 36.0],
        [63.0, 35.5],
        [61.0, 36.0],
        [59.0, 36.5],
        [57.0, 37.5],
        [55.5, 38.0],
        [54.0, 38.5],
        [53.0, 39.5],
        [52.5, 40.5],
        [52.5, 42.0],
      ],
    ],
  ]);

  // Druze — S Lebanon, SW Syria, N Israel
  groupRings.set('druze', [
    [
      [
        [35.4, 33.5],
        [35.8, 33.5],
        [36.2, 33.2],
        [36.5, 32.8],
        [36.2, 32.5],
        [35.8, 32.5],
        [35.4, 32.8],
        [35.3, 33.0],
        [35.4, 33.5],
      ],
    ],
  ]);

  // Alawite — NW Syria coast
  groupRings.set('alawite', [
    [
      [
        [35.5, 36.0],
        [36.0, 36.0],
        [36.5, 35.5],
        [36.5, 35.0],
        [36.2, 34.8],
        [35.8, 34.7],
        [35.5, 35.0],
        [35.3, 35.5],
        [35.5, 36.0],
      ],
    ],
  ]);

  // Yazidi — Sinjar area, N Iraq
  groupRings.set('yazidi', [
    [
      [
        [41.5, 36.8],
        [42.0, 36.8],
        [42.5, 36.5],
        [42.5, 36.2],
        [42.0, 36.0],
        [41.5, 36.0],
        [41.2, 36.3],
        [41.2, 36.5],
        [41.5, 36.8],
      ],
    ],
  ]);

  // Assyrian — Nineveh Plains + Khabur triangle
  groupRings.set('assyrian', [
    // Nineveh Plains
    [
      [
        [43.0, 36.8],
        [43.5, 36.8],
        [44.0, 36.5],
        [44.0, 36.0],
        [43.5, 35.8],
        [43.0, 36.0],
        [42.8, 36.3],
        [43.0, 36.8],
      ],
    ],
    // Khabur triangle (NE Syria)
    [
      [
        [40.0, 37.2],
        [40.5, 37.2],
        [41.0, 37.0],
        [41.0, 36.7],
        [40.5, 36.5],
        [40.0, 36.7],
        [39.8, 37.0],
        [40.0, 37.2],
      ],
    ],
  ]);

  // Pashtun — E/S Afghanistan, NW Pakistan
  groupRings.set('pashtun', [
    [
      [
        [64.0, 36.0],
        [66.0, 36.5],
        [68.0, 36.5],
        [70.0, 36.0],
        [71.5, 35.0],
        [72.0, 34.0],
        [71.5, 33.0],
        [71.0, 32.0],
        [70.0, 31.0],
        [69.0, 30.0],
        [68.0, 29.5],
        [67.0, 30.0],
        [66.0, 31.0],
        [65.0, 32.0],
        [64.5, 33.0],
        [64.0, 34.0],
        [64.0, 36.0],
      ],
    ],
  ]);

  return groupRings;
}

// ---------- Overlap Detection ----------

/**
 * Detect overlap zones using a 0.5-degree grid.
 * For each grid cell, count which groups have coordinates in that cell.
 * Where 2+ groups share a cell, create overlap features.
 */
function detectOverlaps(
  groupRings: Map<EthnicGroupId, unknown[][]>
): OverlapFeature[] {
  const GRID_SIZE = 0.5;
  // Map: "gridLng,gridLat" -> Set<EthnicGroupId>
  const gridGroups = new Map<string, Set<EthnicGroupId>>();

  for (const [groupId, rings] of groupRings) {
    const coords = extractCoordPairs(rings);
    const visitedCells = new Set<string>();
    for (const [lng, lat] of coords) {
      const cellKey = `${Math.floor(lng / GRID_SIZE) * GRID_SIZE},${Math.floor(lat / GRID_SIZE) * GRID_SIZE}`;
      if (visitedCells.has(cellKey)) continue;
      visitedCells.add(cellKey);

      if (!gridGroups.has(cellKey)) gridGroups.set(cellKey, new Set());
      gridGroups.get(cellKey)!.add(groupId);
    }
  }

  // Find cells with 2+ groups
  const overlapCells = new Map<string, string[]>(); // "groupA,groupB,..." -> cellKeys[]
  for (const [cellKey, groups] of gridGroups) {
    if (groups.size < 2) continue;
    const sortedGroups = [...groups].sort().join(',');
    if (!overlapCells.has(sortedGroups)) overlapCells.set(sortedGroups, []);
    overlapCells.get(sortedGroups)!.push(cellKey);
  }

  const overlapFeatures: OverlapFeature[] = [];

  for (const [groupsKey, cellKeys] of overlapCells) {
    const groups = groupsKey.split(',') as EthnicGroupId[];
    const label = groups.map((g) => GROUP_LABELS[g]).join(' / ');

    // Create a MultiPolygon from the grid cells
    const polygons: number[][][] = cellKeys.map((ck) => {
      const [lngStr, latStr] = ck.split(',');
      const lng = parseFloat(lngStr);
      const lat = parseFloat(latStr);
      return [
        [lng, lat],
        [lng + GRID_SIZE, lat],
        [lng + GRID_SIZE, lat + GRID_SIZE],
        [lng, lat + GRID_SIZE],
        [lng, lat],
      ];
    });

    overlapFeatures.push({
      type: 'Feature',
      properties: { groups, label },
      geometry: {
        type: polygons.length === 1 ? 'Polygon' : 'MultiPolygon',
        coordinates:
          polygons.length === 1
            ? [polygons[0]]
            : polygons.map((p) => [p]),
      },
    });
  }

  return overlapFeatures;
}

// ---------- Main ----------

async function main() {
  const outDir = join(process.cwd(), 'src', 'data');
  mkdirSync(outDir, { recursive: true });

  let groupRings: Map<EthnicGroupId, unknown[][]>;
  let source: string;

  // Try GeoEPR first
  console.log('=== Attempting GeoEPR Download ===');
  const geoEPR = await tryDownloadGeoEPR();
  if (geoEPR) {
    groupRings = processGeoEPR(geoEPR);
    source = 'GeoEPR-2021';
  } else {
    console.log('\nGeoEPR download failed. Using fallback approximate polygons.');
    groupRings = buildFallbackData();
    source = 'fallback-approximate';
  }

  // Log per-group status
  console.log(`\n=== Group Status (source: ${source}) ===`);
  const allGroupIds: EthnicGroupId[] = [
    'kurdish', 'arab', 'persian', 'baloch', 'turkmen',
    'druze', 'alawite', 'yazidi', 'assyrian', 'pashtun',
  ];

  const foundGroups: EthnicGroupId[] = [];
  const missingGroups: EthnicGroupId[] = [];

  for (const gid of allGroupIds) {
    const rings = groupRings.get(gid);
    if (rings && rings.length > 0) {
      console.log(`  ${GROUP_LABELS[gid]}: ${rings.length} polygon ring(s)`);
      foundGroups.push(gid);
    } else {
      console.log(`  ${GROUP_LABELS[gid]}: MISSING`);
      missingGroups.push(gid);
    }
  }

  // Simplify polygons to reduce file size (epsilon in degrees — ~0.05° ≈ 5km)
  const SIMPLIFY_EPSILON = 0.05;
  console.log(`\n=== Simplification (epsilon=${SIMPLIFY_EPSILON}°) ===`);

  // Build single-group features
  const singleGroupFeatures: SingleGroupFeature[] = [];
  for (const gid of foundGroups) {
    const rings = groupRings.get(gid)!;
    const simplified = simplifyCoords(rings, SIMPLIFY_EPSILON);
    const simplifiedRings = simplified as unknown[][];
    singleGroupFeatures.push({
      type: 'Feature',
      properties: {
        group: gid,
        label: GROUP_LABELS[gid],
      },
      geometry: {
        type: simplifiedRings.length === 1 ? 'Polygon' : 'MultiPolygon',
        coordinates:
          simplifiedRings.length === 1
            ? roundCoords(simplifiedRings[0], 2) as unknown
            : roundCoords(simplifiedRings, 2) as unknown,
      },
    });
  }

  // Detect overlaps
  console.log('\n=== Overlap Detection ===');
  const overlapFeatures = detectOverlaps(groupRings);
  if (overlapFeatures.length > 0) {
    for (const f of overlapFeatures) {
      console.log(`  Overlap: ${f.properties.label} (${(f.geometry.coordinates as unknown[]).length} cell(s))`);
    }
  } else {
    console.log('  No overlaps detected');
  }

  // Round overlap coordinates
  const roundedOverlaps: OverlapFeature[] = overlapFeatures.map((f) => ({
    ...f,
    geometry: {
      type: f.geometry.type,
      coordinates: roundCoords(f.geometry.coordinates, 2),
    },
  }));

  // Assemble output
  const output: GeoJSONCollection = {
    type: 'FeatureCollection',
    features: [...singleGroupFeatures, ...roundedOverlaps] as GeoJSONFeature[],
  };

  const outPath = join(outDir, 'ethnic-zones.json');
  const jsonStr = JSON.stringify(output);
  writeFileSync(outPath, jsonStr);

  const sizeKB = (Buffer.byteLength(jsonStr) / 1024).toFixed(1);
  console.log(`\n=== Output ===`);
  console.log(`Single-group features: ${singleGroupFeatures.length}`);
  console.log(`Overlap features: ${roundedOverlaps.length}`);
  console.log(`Total features: ${output.features.length}`);
  console.log(`File size: ${sizeKB} KB`);
  console.log(`Groups found: ${foundGroups.join(', ')}`);
  if (missingGroups.length > 0) {
    console.log(`Groups missing: ${missingGroups.join(', ')}`);
  }
  console.log(`Source: ${source}`);
  console.log(`Output: ${outPath}`);

  if (parseFloat(sizeKB) > 200) {
    console.warn(`\nWARNING: File size ${sizeKB} KB exceeds 200 KB target`);
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
