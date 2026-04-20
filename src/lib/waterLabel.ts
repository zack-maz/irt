import type { WaterFacility, WaterFacilityType } from '../../server/types';

/**
 * Human-readable facility type labels. Matches server's FACILITY_TYPE_LABELS
 * (server/adapters/overpass-water.ts). Phase 27.3 Plan 04 harmonizes the
 * "Desalination Plant" vs "Desalination" drift identified as IN-04 in the
 * Plan 03 deferred list.
 */
const WATER_TYPE_LABELS: Record<WaterFacilityType, string> = {
  dam: 'Dam',
  reservoir: 'Reservoir',
  desalination: 'Desalination Plant',
};

/**
 * Case-insensitive regex matching the pre-fix "near Unknown" sentinel that
 * the (now-deleted) `labelUnnamedFacilities` reverse-geocoder used to emit.
 * Phase 27.3 Plan 04 Task 1 removed the origin; Phase 27.3.1 Plan 10
 * (G1 / D-10 final resolution) deleted `server/lib/waterLabeling.ts`
 * entirely — the tightened hasName gate in overpass-water.ts now rejects
 * the wikidata-only admissions that produced generic labels, so the
 * labeler has no remaining work to do. This pattern is retained purely
 * so any stale cached facility still carrying the sentinel in its
 * `label` field gets sanitized at read time.
 */
const NEAR_UNKNOWN_RE = /\bnear\s+unknown\s*$/i;

/**
 * Case-insensitive whole-string match for the four bare generic type tokens
 * that `extractLabel` in server/adapters/overpass-water.ts emits when an OSM
 * element has ONLY non-Latin name / name:en / operator tags (e.g. a
 * Persian- or Arabic-only named facility). Phase 27.3.1 R-03 D-05 made
 * `hasName(tags)` a mandatory admission requirement — but hasName accepts
 * any script, while `extractLabel`'s isLatin guard drops non-Latin names
 * for display. The resulting bare-type label ("Dam" / "Reservoir" /
 * "Desalination Plant") is still valid data (the facility has a real name
 * in OSM, just not in Latin script) but is not a useful UI display name,
 * so we fall through to river/city/coord here.
 *
 * Sentinel is WHOLE-STRING (trimmed), NOT substring — "Mosul Dam" is a real
 * label; "Dam" alone is the sentinel.
 *
 * Audited 2026-04-18 per Phase 27.3.1 R-03 D-10: confirmed reachable via
 * the non-Latin-only-name path; kept. If a future phase either (a) adds a
 * transliteration step to extractLabel or (b) tightens hasName to require
 * a Latin-script tag, this fallback becomes unreachable and should be
 * removed. See src/lib/__tests__/waterLabel.test.ts `D-10 audit:` case.
 */
const GENERIC_TYPE_RE = /^(dam|reservoir|desalination(?:\s+plant)?)$/i;

/**
 * Single source of truth for a water facility's UI display name.
 *
 * Fallback chain (first non-sentinel match wins):
 *   1. `facility.label` — unless it ends with the "near Unknown" sentinel
 *      (pre-Phase-27.3-Plan-04 cached labels)
 *   2. `"<Type> on <RiverName>"` — when `linkedRiver` enrichment resolved
 *   3. `"<Type> near <CityName>"` — when `nearestCity` enrichment resolved
 *      (mostly dead after Task 1's filter tightening, kept for stale caches)
 *   4. `"<Type> at <lat>°, <lng>°"` — last-resort coordinate-based label
 *
 * Invariant: the returned string NEVER contains the case-insensitive token
 * "unknown". Consumed by: WaterTooltip, useCounterData.toWaterEntity,
 * useProximityAlerts.waterToSiteLike, panelLabel.getEntityName,
 * WaterFacilityDetail (img alt).
 */
export function getWaterFacilityDisplayName(facility: WaterFacility): string {
  const typeLabel = WATER_TYPE_LABELS[facility.facilityType];

  const raw = facility.label?.trim();
  // Sentinel check: legacy "... near Unknown" from pre-Plan-04 caches, AND
  // bare generic type tokens ("Dam" / "Reservoir" / "Desalination" /
  // "Desalination Plant") from extractLabel when no OSM name exists. Either
  // sentinel falls through to the river/city/coord chain.
  if (raw && !NEAR_UNKNOWN_RE.test(raw) && !GENERIC_TYPE_RE.test(raw)) {
    return raw;
  }

  if (facility.linkedRiver) {
    return `${typeLabel} on ${facility.linkedRiver.name}`;
  }

  if (facility.nearestCity) {
    return `${typeLabel} near ${facility.nearestCity.name}`;
  }

  const latStr = `${Math.abs(facility.lat).toFixed(2)}°${facility.lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(facility.lng).toFixed(2)}°${facility.lng >= 0 ? 'E' : 'W'}`;
  return `${typeLabel} at ${latStr}, ${lngStr}`;
}
