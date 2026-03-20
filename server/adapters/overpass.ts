import type { SiteEntity, SiteType } from '../types.js';
import { IRAN_BBOX } from '../constants.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_FALLBACK = 'https://overpass.private.coffee/api/interpreter';
const TIMEOUT_MS = 60_000;

// bbox format for Overpass: south,west,north,east
const bbox = `${IRAN_BBOX.south},${IRAN_BBOX.west},${IRAN_BBOX.north},${IRAN_BBOX.east}`;

const QUERY = `
[out:json][timeout:60][bbox:${bbox}];
(
  nwr["plant:source"="nuclear"];
  nwr["generator:source"="nuclear"];
  nwr["military"="naval_base"];
  nwr["military"="base"]["military_service"="navy"];
  nwr["industrial"="refinery"];
  nwr["industrial"="oil_refinery"];
  nwr["military"="airfield"];
  nwr["aeroway"="aerodrome"]["aerodrome:type"="military"];
  nwr["waterway"="dam"];
  nwr["industrial"="port"];
  nwr["harbour"="yes"];
  nwr["landuse"="port"];
);
out center tags;
`;

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function classifySiteType(tags: Record<string, string>): SiteType | null {
  if (tags['plant:source'] === 'nuclear' || tags['generator:source'] === 'nuclear') return 'nuclear';
  if (tags['military'] === 'naval_base' || tags['military_service'] === 'navy') return 'naval';
  if (tags['industrial'] === 'refinery' || tags['industrial'] === 'oil_refinery') return 'oil';
  if (tags['military'] === 'airfield' || tags['aerodrome:type'] === 'military') return 'airbase';
  if (tags['waterway'] === 'dam') return 'dam';
  if (tags['industrial'] === 'port' || tags['harbour'] === 'yes' || tags['landuse'] === 'port') return 'port';
  return null;
}

export function normalizeElement(el: OverpassElement): SiteEntity | null {
  if (!el.tags) return null;
  const siteType = classifySiteType(el.tags);
  if (!siteType) return null;

  // Nodes have lat/lon directly; ways/relations have center
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat === undefined || lon === undefined) return null;

  return {
    id: `site-${el.id}`,
    type: 'site',
    siteType,
    lat,
    lng: lon,
    label: el.tags.name || el.tags['name:en'] || `${siteType} facility`,
    operator: el.tags.operator || undefined,
    osmId: el.id,
  };
}

export async function fetchSites(): Promise<SiteEntity[]> {
  // Try primary, fallback to secondary
  for (const url of [OVERPASS_URL, OVERPASS_FALLBACK]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(QUERY)}`,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        console.warn(`[overpass] ${url} returned ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { elements: OverpassElement[] };

      // Normalize and deduplicate by OSM ID
      const siteMap = new Map<number, SiteEntity>();
      for (const el of json.elements) {
        const site = normalizeElement(el);
        if (site) siteMap.set(el.id, site);
      }
      return Array.from(siteMap.values());
    } catch (err) {
      console.warn(`[overpass] ${url} failed:`, (err as Error).message);
    }
  }
  throw new Error('All Overpass API instances failed');
}
