---
phase: 26-water-stress-layer
plan: 01
subsystem: data
tags: [wri-aqueduct, natural-earth, water-stress, geojson, shapefile, extraction-scripts]

# Dependency graph
requires:
  - phase: none
    provides: none (foundational plan)
provides:
  - WaterFacility, WaterFacilityType, WaterStressIndicators types in server/types.ts
  - stressToRGBA color interpolation (black-to-light-blue 4-stop gradient)
  - compositeHealth formula (75% baseline + 25% precipitation modifier)
  - bwsScoreToLabel WRI label mapping
  - Static rivers.json with 6 GeoJSON river features
  - Static aqueduct-basins.json with 6377 real WRI Aqueduct 4.0 basin entries
affects: [26-02, 26-03, 26-04, 26-05]

# Tech tracking
tech-stack:
  added: [shapefile (devDependency), @types/shapefile (devDependency)]
  patterns: [static-data-extraction-scripts, stress-to-color-interpolation, composite-health-formula]

key-files:
  created:
    - src/lib/waterStress.ts
    - src/__tests__/waterStress.test.ts
    - scripts/extract-rivers.ts
    - scripts/extract-aqueduct-basins.ts
    - src/data/rivers.json
    - src/data/aqueduct-basins.json
  modified:
    - server/types.ts
    - package.json

key-decisions:
  - "Karun and Litani rivers manually defined (not in Natural Earth 10m dataset)"
  - "Geographic bbox validation prevents false river matches (South American Litani filtered out)"
  - "Country matching uses exact equality to prevent substring false positives (Romania/Oman)"
  - "WRI Aqueduct 4.0 actual CSV data used (6377 basins) instead of curated fallback"
  - "compositeHealth formula: baselineHealth + precipModifier with clamp (plan formula authoritative over behavior spec)"

patterns-established:
  - "Static data extraction scripts in scripts/ directory with fallback data"
  - "4-stop stress color gradient: black -> dark blue -> medium blue -> light blue"
  - "Composite health formula: baseline dominates (75%), precipitation adjusts (25%)"

requirements-completed: [WAT-02, WAT-04, WAT-06]

# Metrics
duration: 14min
completed: 2026-04-03
---

# Phase 26 Plan 01: Foundation Data & Types Summary

**Water stress types, color interpolation utility, and static data files from WRI Aqueduct 4.0 and Natural Earth 10m rivers**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-03T04:45:53Z
- **Completed:** 2026-04-03T05:00:18Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- WaterFacility, WaterFacilityType, and WaterStressIndicators types defined in server/types.ts
- stressToRGBA 4-stop gradient interpolation with 21 unit tests passing
- Real WRI Aqueduct 4.0 baseline annual data: 6377 Middle East basins across 29 countries
- Natural Earth 10m rivers: 6 named river features (3.9 KB, well under 200 KB target)

## Task Commits

Each task was committed atomically:

1. **Task 1: Define WaterFacility types and stress utility module (TDD)**
   - `07c579c` (test: failing tests for water stress utilities)
   - `0ede058` (feat: implement water stress types and utility module)

2. **Task 2: Create data extraction scripts and produce static JSON files** - `2006306` (feat)

## Files Created/Modified
- `server/types.ts` - Added WaterFacility, WaterFacilityType, WaterStressIndicators types
- `src/lib/waterStress.ts` - stressToRGBA, compositeHealth, bwsScoreToLabel, STRESS_COLORS, WATER_STRESS_LEGEND_STOPS
- `src/__tests__/waterStress.test.ts` - 21 unit tests for all exported functions
- `scripts/extract-rivers.ts` - One-time Natural Earth river extraction with DP simplification
- `scripts/extract-aqueduct-basins.ts` - One-time WRI Aqueduct 4.0 CSV extraction
- `src/data/rivers.json` - 6 GeoJSON river features (Jordan, Nile, Tigris, Euphrates, Karun, Litani)
- `src/data/aqueduct-basins.json` - 6377 basin entries with stress indicators from 29 ME countries
- `package.json` - Added shapefile and @types/shapefile as devDependencies

## Decisions Made
- **Karun/Litani manual addition**: Neither river is in Natural Earth 10m rivers dataset. Karun added with approximate coordinates from Zagros Mountains to Shatt al-Arab confluence. Litani added with coordinates from Baalbek to Mediterranean.
- **Geographic validation**: Added ME bounding box check to prevent matching same-named rivers on other continents (the NE dataset contains a "Litani" in French Guiana).
- **Exact country matching**: Changed from substring matching to exact equality for country filtering after discovering "Romania" matched "Oman" as a substring.
- **Real WRI data over fallback**: Successfully downloaded and parsed the actual 250 MB WRI Aqueduct 4.0 ZIP. Got 6377 basins (far exceeding the 50+ target) with real indicator values.
- **Formula authority**: The behavior spec and action spec had minor discrepancies for compositeHealth. Used the formula from the action section (authoritative implementation spec).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Filtered out South American "Litani" river**
- **Found during:** Task 2 (river extraction)
- **Issue:** Natural Earth 10m dataset contains a "Litani" river in French Guiana (lng -54, lat 2-3), not the Lebanese Litani
- **Fix:** Added ME bounding box geographic validation before accepting name matches; added manual Litani coordinates for Lebanon
- **Files modified:** scripts/extract-rivers.ts
- **Verification:** Output rivers.json has correct Litani with coordinates in Lebanon (lng ~35, lat ~33)
- **Committed in:** 2006306

**2. [Rule 1 - Bug] Fixed substring country matching false positive**
- **Found during:** Task 2 (aqueduct extraction)
- **Issue:** "Romania" matched "Oman" via substring check, including 326 Romanian basins in Middle East data
- **Fix:** Changed from `.includes()` to exact `Set.has()` matching for country names
- **Files modified:** scripts/extract-aqueduct-basins.ts
- **Verification:** Output has 29 legitimate ME countries, no Romania
- **Committed in:** 2006306

**3. [Rule 3 - Blocking] Added manual Karun river data**
- **Found during:** Task 2 (river extraction)
- **Issue:** Karun River (Iran's largest) is not in Natural Earth 10m rivers dataset
- **Fix:** Added manual LineString coordinates from Zagros Mountains source to Shatt al-Arab confluence
- **Files modified:** scripts/extract-rivers.ts
- **Verification:** Output has all 6 target rivers including Karun
- **Committed in:** 2006306

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for data correctness. No scope creep.

## Issues Encountered
- WRI Aqueduct CSV has no lat/lng columns for basin centroids; filtering falls back to country name matching only. Basin-to-coordinate mapping will need to use the GeoPackage in a future plan if point-in-polygon is needed.
- WRI uses sentinel values 9999 and -9999 for no-data; handled by treating values >= 9998 or <= -9998 as -1.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Types are ready for waterStore (Plan 02/03)
- Static data files ready for basin lookup and river rendering (Plan 03/04)
- Color interpolation ready for facility markers and river lines (Plan 04)
- All 1134 existing tests still passing

## Self-Check: PASSED

All 6 created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 26-water-stress-layer*
*Completed: 2026-04-03*
