---
phase: 26-water-stress-layer
plan: 06
subsystem: map, api
tags: [overpass, water-stress, color-ramp, deck.gl, geojson, timeout]

requires:
  - phase: 26-water-stress-layer/05
    provides: "Water layer integration (facilities, rivers, counters, search)"
provides:
  - "Reliable /api/water endpoint with 30s route-level timeout and empty-array fallback"
  - "Batched Overpass queries (12+11 countries) preventing timeout on broad queries"
  - "Visible water facility markers via dark-purple color floor (no more invisible black)"
  - "Per-river compositeHealth enabling distinct stress-based coloring"
  - "Wider river lines visible at regional zoom levels"
affects: [water-stress-layer, visualization-layers]

tech-stack:
  added: []
  patterns: ["Promise.race route-level timeout pattern for unreliable upstream APIs", "Sequential batch splitting for large Overpass queries with partial-success fallback"]

key-files:
  created: []
  modified:
    - server/routes/water.ts
    - server/adapters/overpass-water.ts
    - src/lib/waterStress.ts
    - src/hooks/useWaterLayers.ts
    - src/data/rivers.json
    - server/__tests__/routes/water.test.ts
    - src/__tests__/waterStress.test.ts

key-decisions:
  - "Dark purple [40,20,60] chosen as color floor instead of black -- provides terrain contrast while still reading as stressed"
  - "Core/extended country batch split: core (12) must succeed, extended (11) is best-effort -- partial data preferred over none"
  - "Route-level 30s timeout returns empty array (not 500) on total failure -- client recovers on next poll"

patterns-established:
  - "Promise.race timeout guard: wrap unreliable upstream calls at route level, return degraded response on timeout"
  - "Sequential batch splitting: split large Overpass queries into smaller batches with partial-success semantics"

requirements-completed: [WAT-02, WAT-03, WAT-05]

duration: 7min
completed: 2026-04-03
---

# Phase 26 Plan 06: Water Stress Gap Closure Summary

**Fixed water facility visibility (dark-purple color floor + 30s API timeout) and river stress differentiation (per-river compositeHealth + wider lines)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-03T17:47:50Z
- **Completed:** 2026-04-03T17:54:22Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Water API always responds within 30s via Promise.race timeout with empty-array fallback (never hangs)
- Overpass query split from 23-country monolith into core (12) + extended (11) sequential batches, reducing per-request load
- Color ramp floor raised from pure black [0,0,0] to dark purple [40,20,60], making stressed facilities visible on dark terrain
- Rivers now have per-feature compositeHealth values: Jordan/Nile/Karun/Litani at 0.00 (extreme), Tigris at 0.35, Euphrates at 0.31
- River line width increased to minPixels:2, maxPixels:12 for visibility at regional zoom

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix API reliability and color visibility** - `da6b203` (fix)
2. **Task 2: Add per-river compositeHealth and widen river lines** - `a81e46d` (fix)
3. **Test fix: Update waterStress tests for new color floor** - `cefb3b9` (test)

**Plan metadata:** (pending)

## Files Created/Modified
- `server/routes/water.ts` - Added 30s Promise.race timeout, empty-array fallback on total failure
- `server/adapters/overpass-water.ts` - Split into core/extended country batches with fetchBatch helper, reduced per-batch timeout to 60s
- `src/lib/waterStress.ts` - Changed STRESS_COLORS[0] to dark purple, updated legend stop color
- `src/hooks/useWaterLayers.ts` - Increased lineWidthMinPixels to 2, lineWidthMaxPixels to 12
- `src/data/rivers.json` - Added compositeHealth to all 6 river features
- `server/__tests__/routes/water.test.ts` - Updated no-cache failure test to expect {data:[], stale:true} instead of 500
- `src/__tests__/waterStress.test.ts` - Updated color assertions for new dark-purple floor

## Decisions Made
- Dark purple [40,20,60] as color floor: provides enough contrast on dark terrain while still clearly reading as "stressed" (pure black was invisible)
- Core/extended batch split with partial-success: if extended batch fails, core results still returned (partial > none)
- Route-level timeout returns empty array with stale:true (not HTTP 500): client degrades gracefully, next request retries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated waterStress unit tests for new color values**
- **Found during:** Verification after Task 1+2
- **Issue:** 6 existing tests in src/__tests__/waterStress.test.ts expected old black [0,0,0] color values
- **Fix:** Updated assertions to match new dark-purple [40,20,60] floor and recalculated midpoint colors
- **Files modified:** src/__tests__/waterStress.test.ts
- **Verification:** All 21 waterStress tests pass
- **Committed in:** cefb3b9

---

**Total deviations:** 1 auto-fixed (1 bug fix in tests)
**Impact on plan:** Necessary test updates to match intentional color ramp change. No scope creep.

## Issues Encountered
- Pre-existing test failures in filterStore.test.ts (2 tests) -- out of scope, from uncommitted changes on branch before this plan

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT tests 3 and 5 should now pass (river color differentiation + facility marker visibility)
- UAT tests 6 and 7 (tooltip, detail panel) are unblocked since facility markers are now visible
- Phase 26 water stress layer is functionally complete pending re-verification

---
*Phase: 26-water-stress-layer*
*Completed: 2026-04-03*
