// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getWaterFacilityDisplayName } from '../waterLabel';
import type { WaterFacility, WaterStressIndicators } from '../../../server/types';

const stubStress: WaterStressIndicators = {
  bws_raw: 0,
  bws_score: 0,
  bws_label: 'Low',
  drr_score: 0,
  gtd_score: 0,
  sev_score: 0,
  iav_score: 0,
  compositeHealth: 0.8,
};

function makeFacility(overrides: Partial<WaterFacility>): WaterFacility {
  return {
    id: 'water-test',
    type: 'water',
    facilityType: 'dam',
    lat: 35.7,
    lng: 51.4,
    label: '',
    osmId: 1,
    stress: stubStress,
    ...overrides,
  };
}

describe('getWaterFacilityDisplayName — generic-type sentinel (Phase 27.3 Plan 05)', () => {
  it('falls through to linkedRiver when label is the bare generic "Reservoir" (UAT Test 8a)', () => {
    const f = makeFacility({
      facilityType: 'reservoir',
      label: 'Reservoir',
      linkedRiver: { name: 'Euphrates', distanceKm: 5 },
    });
    expect(getWaterFacilityDisplayName(f)).toBe('Reservoir on Euphrates');
  });

  it('falls through to linkedRiver when label is the bare generic "Dam"', () => {
    const f = makeFacility({
      facilityType: 'dam',
      label: 'Dam',
      linkedRiver: { name: 'Tigris', distanceKm: 3 },
    });
    expect(getWaterFacilityDisplayName(f)).toBe('Dam on Tigris');
  });

  it('falls through to nearestCity when label is "Desalination Plant" and no river', () => {
    const f = makeFacility({
      facilityType: 'desalination',
      label: 'Desalination Plant',
      nearestCity: { name: 'Dubai', distanceKm: 20, population: 3_400_000 },
    });
    expect(getWaterFacilityDisplayName(f)).toBe('Desalination Plant near Dubai');
  });

  it('falls through to coordinate when label is "Dam" and no enrichment', () => {
    const f = makeFacility({
      facilityType: 'dam',
      label: 'Dam',
      lat: 35.7,
      lng: 51.4,
    });
    expect(getWaterFacilityDisplayName(f)).toBe('Dam at 35.70°N, 51.40°E');
  });

  it('PRESERVES a substantive label like "Mosul Dam" (non-generic, has a real identifier)', () => {
    const f = makeFacility({
      facilityType: 'dam',
      label: 'Mosul Dam',
      linkedRiver: { name: 'Tigris', distanceKm: 1 },
    });
    expect(getWaterFacilityDisplayName(f)).toBe('Mosul Dam');
  });

  it('PRESERVES "Hub Dam" as-is (dam token is part of the identifier, not a sentinel)', () => {
    const f = makeFacility({ facilityType: 'dam', label: 'Hub Dam' });
    expect(getWaterFacilityDisplayName(f)).toBe('Hub Dam');
  });

  it('is case-insensitive — "reservoir" (lowercase) is also a sentinel', () => {
    const f = makeFacility({
      facilityType: 'reservoir',
      label: 'reservoir',
      linkedRiver: { name: 'Jordan', distanceKm: 2 },
    });
    expect(getWaterFacilityDisplayName(f)).toBe('Reservoir on Jordan');
  });

  it('strips trailing whitespace before sentinel check — "Dam " is still a sentinel', () => {
    const f = makeFacility({
      facilityType: 'dam',
      label: 'Dam   ',
      linkedRiver: { name: 'Euphrates', distanceKm: 1 },
    });
    expect(getWaterFacilityDisplayName(f)).toBe('Dam on Euphrates');
  });

  it('Plan 04 regression guard — "Dam near Unknown" still triggers fallback', () => {
    const f = makeFacility({
      facilityType: 'dam',
      label: 'Dam near Unknown',
      linkedRiver: { name: 'Euphrates', distanceKm: 5 },
    });
    expect(getWaterFacilityDisplayName(f)).toBe('Dam on Euphrates');
  });

  it('D-10 audit: non-Latin-only OSM name path produces bare-type label, sentinel catches it', () => {
    // Simulates a facility admitted by hasName() (non-Latin script accepted)
    // but rendered as a bare type token by extractLabel's isLatin guard.
    // Sentinel must fall through to the coordinate fallback since linkedRiver
    // and nearestCity are both absent in this simulation. Confirms the
    // generic-type fallback chain is still reachable under Phase 27.3.1 R-03
    // D-05 (hasName mandatory), so the fallback path is retained, not deleted.
    const f = makeFacility({
      facilityType: 'dam',
      label: 'Dam', // bare generic emitted by extractLabel for non-Latin-only name
      lat: 35.0,
      lng: 51.0,
    });
    const result = getWaterFacilityDisplayName(f);
    expect(result).not.toBe('Dam');
    expect(result).toContain('°'); // coordinate fallback
  });
});
