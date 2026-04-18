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
 * labelUnnamedFacilities used to emit (server/routes/water.ts). Phase 27.3
 * Plan 04 Task 1 removed the origin; this pattern exists so that any stale
 * cached facility still carrying the sentinel in its `label` field gets
 * sanitized at read time.
 */
const NEAR_UNKNOWN_RE = /\bnear\s+unknown\s*$/i;

/**
 * Case-insensitive whole-string match for the four bare generic type tokens
 * that `extractLabel` in server/adapters/overpass-water.ts emits when an OSM
 * element has no `name` / `name:en` / `operator` tag. Phase 27.3 Plan 05 /
 * UAT Test 8a: a label of exactly "Reservoir" is not a useful display name,
 * so treat it as equivalent to an empty label and fall through to the
 * river/city/coord fallback chain. Matching is WHOLE-STRING (trimmed), NOT
 * substring — so "Mosul Dam" is preserved, but "Dam" alone is a sentinel.
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
