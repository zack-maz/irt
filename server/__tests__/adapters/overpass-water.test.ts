// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  classifyWaterType,
  normalizeWaterElement,
  isPriorityCountry,
  isNotable,
  FACILITY_TYPE_LABELS,
  extractCapacityTags,
  findNearestCity,
  linkRiver,
  computeNotabilityScore,
  RIVER_BBOXES,
} from '../../adapters/overpass-water.js';
import type { WaterStressIndicators } from '../../types.js';

describe('classifyWaterType', () => {
  it('returns "dam" for waterway=dam', () => {
    expect(classifyWaterType({ waterway: 'dam' })).toBe('dam');
  });

  it('returns "reservoir" for natural=water + water=reservoir', () => {
    expect(classifyWaterType({ natural: 'water', water: 'reservoir' })).toBe('reservoir');
  });

  it('returns "desalination" for man_made=desalination_plant', () => {
    expect(classifyWaterType({ man_made: 'desalination_plant' })).toBe('desalination');
  });

  it('returns "desalination" for water_works=desalination', () => {
    expect(classifyWaterType({ water_works: 'desalination' })).toBe('desalination');
  });

  it('returns null for unrelated tags', () => {
    expect(classifyWaterType({ highway: 'primary' })).toBeNull();
  });

  it('returns null for canal tags (not a facility type)', () => {
    expect(classifyWaterType({ waterway: 'canal' })).toBeNull();
  });
});

describe('classifyWaterType (Phase 27.3)', () => {
  it('returns "dam" for waterway=dam', () => {
    expect(classifyWaterType({ waterway: 'dam' })).toBe('dam');
  });
  it('returns "dam" for man_made=dam (D-01 union)', () => {
    expect(classifyWaterType({ man_made: 'dam' })).toBe('dam');
  });
  it('returns "reservoir" for landuse=reservoir', () => {
    expect(classifyWaterType({ landuse: 'reservoir' })).toBe('reservoir');
  });
  it('returns null for man_made=water_works (treatment_plant removed)', () => {
    expect(classifyWaterType({ man_made: 'water_works' })).toBeNull();
  });
});

describe('isPriorityCountry', () => {
  it('returns true for coords near Israel (31.0, 34.9)', () => {
    expect(isPriorityCountry(31.0, 34.9)).toBe(true);
  });

  it('returns true for coords near Iraq (33.2, 43.7)', () => {
    expect(isPriorityCountry(33.2, 43.7)).toBe(true);
  });

  it('returns true for coords near Iran (32.4, 53.7)', () => {
    expect(isPriorityCountry(32.4, 53.7)).toBe(true);
  });

  it('returns true for coords near Afghanistan (33.9, 67.7)', () => {
    expect(isPriorityCountry(33.9, 67.7)).toBe(true);
  });

  it('returns true for coords near Jordan (31.2, 36.5)', () => {
    expect(isPriorityCountry(31.2, 36.5)).toBe(true);
  });

  it('returns true for coords near Lebanon (33.9, 35.9)', () => {
    expect(isPriorityCountry(33.9, 35.9)).toBe(true);
  });

  it('returns true for coords near Syria (35.0, 38.0)', () => {
    expect(isPriorityCountry(35.0, 38.0)).toBe(true);
  });

  it('returns false for coords near Saudi Arabia (23.9, 45.1)', () => {
    expect(isPriorityCountry(23.9, 45.1)).toBe(false);
  });

  it('returns false for coords near UAE (23.4, 53.8)', () => {
    expect(isPriorityCountry(23.4, 53.8)).toBe(false);
  });

  it('returns false for coords near Kuwait (29.3, 47.5)', () => {
    expect(isPriorityCountry(29.3, 47.5)).toBe(false);
  });

  it('returns false for coords near Egypt (26.8, 30.8)', () => {
    expect(isPriorityCountry(26.8, 30.8)).toBe(false);
  });
});

describe('isNotable', () => {
  it('returns true for tags with wikidata', () => {
    expect(isNotable({ name: 'Test Dam', wikidata: 'Q12345' })).toBe(true);
  });

  it('returns true for tags with wikipedia', () => {
    expect(isNotable({ name: 'Test Dam', wikipedia: 'en:Test Dam' })).toBe(true);
  });

  it('returns true for tags with wikipedia:en', () => {
    expect(isNotable({ name: 'Test Dam', 'wikipedia:en': 'Test Dam' })).toBe(true);
  });

  it('returns false for tags with only name (no wikidata/wikipedia)', () => {
    expect(isNotable({ name: 'Test Dam' })).toBe(false);
  });

  it('returns false for empty tags', () => {
    expect(isNotable({})).toBe(false);
  });
});

describe('normalizeWaterElement', () => {
  const mockStress: WaterStressIndicators = {
    bws_raw: 3.5,
    bws_score: 3.5,
    bws_label: 'High',
    drr_score: 2.0,
    gtd_score: 1.5,
    sev_score: 2.5,
    iav_score: 3.0,
    compositeHealth: 0.3,
  };
  const stressLookup = () => mockStress;

  it('creates WaterFacility with correct id format "water-{osmId}"', () => {
    const el = {
      type: 'node' as const,
      id: 12345,
      lat: 33.3,
      lon: 44.4,
      tags: { waterway: 'dam', name: 'Mosul Dam', wikidata: 'Q123' },
    };
    const result = normalizeWaterElement(el, stressLookup);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('water-12345');
    expect(result!.type).toBe('water');
    expect(result!.facilityType).toBe('dam');
    expect(result!.lat).toBe(33.3);
    expect(result!.lng).toBe(44.4);
    expect(result!.label).toBe('Mosul Dam');
    expect(result!.osmId).toBe(12345);
    expect(result!.stress).toEqual(mockStress);
  });

  it('uses center coordinates for way/relation elements', () => {
    const el = {
      type: 'way' as const,
      id: 67890,
      center: { lat: 35.0, lon: 45.0 },
      tags: { natural: 'water', water: 'reservoir', 'name:en': 'Lake Tharthar', wikidata: 'Q99' },
    };
    const result = normalizeWaterElement(el, stressLookup);
    expect(result).not.toBeNull();
    expect(result!.lat).toBe(35.0);
    expect(result!.lng).toBe(45.0);
    expect(result!.facilityType).toBe('reservoir');
  });

  it('returns null for elements without tags', () => {
    const el = { type: 'node' as const, id: 1, lat: 33, lon: 44 };
    expect(normalizeWaterElement(el, stressLookup)).toBeNull();
  });

  it('returns null for unrecognized tags', () => {
    const el = {
      type: 'node' as const,
      id: 1,
      lat: 33,
      lon: 44,
      tags: { highway: 'primary' },
    };
    expect(normalizeWaterElement(el, stressLookup)).toBeNull();
  });

  it('returns null for elements without coordinates', () => {
    const el = {
      type: 'way' as const,
      id: 1,
      tags: { waterway: 'dam', name: 'Test Dam' },
    };
    expect(normalizeWaterElement(el, stressLookup)).toBeNull();
  });

  it('extracts operator from tags', () => {
    const el = {
      type: 'node' as const,
      id: 100,
      lat: 33.0,
      lon: 44.0,
      tags: {
        waterway: 'dam',
        name: 'Darbandikhan Dam',
        operator: 'Iraqi Ministry of Water Resources',
        wikidata: 'Q456',
      },
    };
    const result = normalizeWaterElement(el, stressLookup);
    expect(result).not.toBeNull();
    expect(result!.operator).toBe('Iraqi Ministry Of Water Resources');
  });

  // ---------- Tiered country filtering tests ----------

  describe('tiered country filtering', () => {
    // Priority country: Iraq (33.2, 43.7) — keeps all facility types
    it('keeps dam in priority country (Iraq)', () => {
      const el = {
        type: 'node' as const,
        id: 200,
        lat: 33.2,
        lon: 43.7,
        tags: { waterway: 'dam', name: 'Iraqi Dam' },
      };
      expect(normalizeWaterElement(el, stressLookup)).not.toBeNull();
    });

    // Non-priority country: Saudi Arabia (23.9, 45.1)
    it('filters dam without name in non-priority country', () => {
      const el = {
        type: 'node' as const,
        id: 300,
        lat: 23.9,
        lon: 45.1,
        tags: { waterway: 'dam' },
      };
      expect(normalizeWaterElement(el, stressLookup)).toBeNull();
    });

    it('keeps dam with wikidata in non-priority country', () => {
      const el = {
        type: 'node' as const,
        id: 301,
        lat: 23.9,
        lon: 45.1,
        tags: { waterway: 'dam', name: 'Notable Saudi Dam', wikidata: 'Q12345' },
      };
      expect(normalizeWaterElement(el, stressLookup)).not.toBeNull();
    });

    it('filters reservoir without wikidata/wikipedia in non-priority country', () => {
      const el = {
        type: 'node' as const,
        id: 302,
        lat: 23.9,
        lon: 45.1,
        tags: { natural: 'water', water: 'reservoir', name: 'Saudi Reservoir' },
      };
      expect(normalizeWaterElement(el, stressLookup)).toBeNull();
    });

    it('keeps reservoir with wikipedia in non-priority country', () => {
      const el = {
        type: 'node' as const,
        id: 303,
        lat: 23.9,
        lon: 45.1,
        tags: {
          natural: 'water',
          water: 'reservoir',
          name: 'Notable Reservoir',
          wikipedia: 'en:Reservoir',
        },
      };
      expect(normalizeWaterElement(el, stressLookup)).not.toBeNull();
    });

    it('keeps desalination in non-priority country when score >= 25 (wikidata gives +40)', () => {
      const el = {
        type: 'node' as const,
        id: 305,
        lat: 23.9,
        lon: 45.1,
        tags: { man_made: 'desalination_plant', name: 'Saudi Desalination', wikidata: 'Q99' },
      };
      expect(normalizeWaterElement(el, stressLookup)).not.toBeNull();
    });

    it('keeps reservoir with wikipedia:en in non-priority country', () => {
      const el = {
        type: 'node' as const,
        id: 306,
        lat: 26.8,
        lon: 30.8, // Egypt (non-priority)
        tags: {
          natural: 'water',
          water: 'reservoir',
          name: 'Aswan Reservoir',
          'wikipedia:en': 'Lake Nasser',
        },
      };
      expect(normalizeWaterElement(el, stressLookup)).not.toBeNull();
    });
  });

  describe('unnamed facility labeling', () => {
    it('produces generic type label when OSM name tag is absent (wikidata provides notability)', () => {
      const el = {
        type: 'node' as const,
        id: 400,
        lat: 33.2,
        lon: 43.7, // Iraq (priority)
        tags: { waterway: 'dam', wikidata: 'Q999' }, // wikidata (+40) + priority (+15) = 55 >= 25
      };
      const result = normalizeWaterElement(el, stressLookup);
      expect(result).not.toBeNull();
      expect(result!.label).toBe('Dam');
    });

    it('produces named label when OSM name tag exists', () => {
      const el = {
        type: 'node' as const,
        id: 401,
        lat: 33.2,
        lon: 43.7,
        tags: { waterway: 'dam', name: 'Haditha Dam' },
      };
      const result = normalizeWaterElement(el, stressLookup);
      expect(result).not.toBeNull();
      expect(result!.label).toBe('Haditha Dam');
    });

    it('uses name:en when present over non-Latin name', () => {
      const el = {
        type: 'node' as const,
        id: 402,
        lat: 32.4,
        lon: 53.7, // Iran (priority)
        tags: { man_made: 'desalination_plant', 'name:en': 'Isfahan Desalination Plant' },
      };
      const result = normalizeWaterElement(el, stressLookup);
      expect(result).not.toBeNull();
      expect(result!.label).toBe('Isfahan Desalination Plant');
    });
  });
});

describe('FACILITY_TYPE_LABELS', () => {
  it('exports all three facility type labels', () => {
    expect(FACILITY_TYPE_LABELS).toEqual({
      dam: 'Dam',
      reservoir: 'Reservoir',
      desalination: 'Desalination Plant',
    });
  });
});

// ---------- Phase 27.3 new tests ----------

const stressLookup = () => ({
  bws_raw: 3.5,
  bws_score: 3.5,
  bws_label: 'High',
  drr_score: 2.0,
  gtd_score: 1.5,
  sev_score: 2.5,
  iav_score: 3.0,
  compositeHealth: 0.5,
});

describe('computeNotabilityScore (REV-1)', () => {
  it('scores high for wikidata + named + priority', () => {
    const score = computeNotabilityScore(
      { wikidata: 'Q123', name: 'Mosul Dam', 'name:en': 'Mosul Dam', operator: 'Iraq Gov' },
      'dam',
      true,
    );
    expect(score).toBeGreaterThanOrEqual(85);
  });
  it('scores low for unnamed non-priority', () => {
    expect(computeNotabilityScore({}, 'dam', false)).toBeLessThan(25);
  });
  it('desalination always gets +5 bonus', () => {
    expect(computeNotabilityScore({ name: 'Plant' }, 'desalination', false)).toBeGreaterThanOrEqual(
      20,
    );
  });
});

describe('extractCapacityTags', () => {
  it('extracts numeric height', () => {
    expect(extractCapacityTags({ height: '85' })).toEqual({ height: 85 });
  });
  it('strips unit suffixes', () => {
    expect(extractCapacityTags({ height: '85 m', volume: '1000000 m3' })).toEqual({
      height: 85,
      volume: 1000000,
    });
  });
  it('returns null when no capacity tags', () => {
    expect(extractCapacityTags({ name: 'Dam' })).toBeNull();
  });
  it('ignores fully non-numeric values', () => {
    expect(extractCapacityTags({ height: 'unknown' })).toBeNull();
  });
});

describe('findNearestCity', () => {
  it('finds Baghdad for coords near Baghdad', () => {
    // Use Baghdad city center coords (not Iraq country centroid)
    expect(findNearestCity(33.32, 44.37)?.name).toBe('Baghdad');
  });
  it('finds Tabqa for coords near Tabqa Dam (REV-1 expanded)', () => {
    expect(findNearestCity(35.84, 38.55)?.name).toBe('Tabqa');
  });
  it('returns null for remote coordinates', () => {
    expect(findNearestCity(0, 0)).toBeNull();
  });
});

describe('linkRiver with bbox optimization (REV-3)', () => {
  it('returns null for facility outside any river bbox', () => {
    expect(linkRiver(25.0, 55.0)).toBeNull();
  });
  it('RIVER_BBOXES has at least one entry', () => {
    expect(RIVER_BBOXES.length).toBeGreaterThan(0);
  });
  it('each river bbox has valid bounds', () => {
    for (const bbox of RIVER_BBOXES) {
      expect(bbox.minLat).toBeLessThanOrEqual(bbox.maxLat);
      expect(bbox.minLng).toBeLessThanOrEqual(bbox.maxLng);
      expect(bbox.vertices.length).toBeGreaterThan(0);
    }
  });
});

describe('reservoir filtering (REV-2 wikidata fallback)', () => {
  it('keeps named reservoir in priority country without wikidata', () => {
    const el = {
      type: 'node' as const,
      id: 700,
      lat: 33.2,
      lon: 43.7,
      tags: { natural: 'water', water: 'reservoir', name: 'Tharthar Lake' },
    };
    expect(normalizeWaterElement(el, stressLookup)).not.toBeNull();
  });
  it('rejects unnamed reservoir even in priority country', () => {
    const el = {
      type: 'node' as const,
      id: 701,
      lat: 33.2,
      lon: 43.7,
      tags: { natural: 'water', water: 'reservoir' },
    };
    expect(normalizeWaterElement(el, stressLookup)).toBeNull();
  });
});

describe('holistic filtering (REV-1)', () => {
  it('rejects facility with score below MIN_NOTABILITY_SCORE', () => {
    const el = {
      type: 'node' as const,
      id: 800,
      lat: 24.0, // Saudi Arabia, non-priority
      lon: 47.0,
      tags: { waterway: 'dam' }, // No name, no wikidata, no operator
    };
    expect(normalizeWaterElement(el, stressLookup)).toBeNull();
  });
});

describe('normalized facility includes notabilityScore', () => {
  it('attaches notabilityScore to passing facilities', () => {
    const el = {
      type: 'node' as const,
      id: 900,
      lat: 33.2,
      lon: 43.7,
      tags: { waterway: 'dam', name: 'Test Dam', operator: 'Iraq', wikidata: 'Q1' },
    };
    const result = normalizeWaterElement(el, stressLookup);
    expect(result?.notabilityScore).toBeGreaterThanOrEqual(70);
  });
});
