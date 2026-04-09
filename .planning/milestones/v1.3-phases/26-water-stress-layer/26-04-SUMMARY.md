---
phase: 26-water-stress-layer
plan: 04
subsystem: ui, data
tags: [zustand, deck-gl, geojson, water-stress, polling, visualization]

# Dependency graph
requires:
  - phase: 26-water-stress-layer
    provides: WaterFacility types, stressToRGBA color interpolation, compositeHealth formula, rivers.json
provides:
  - waterStore Zustand store with facility lifecycle and precipitation merge
  - useWaterFetch one-time facility fetch hook
  - useWaterPrecipPolling 6-hour precipitation polling hook
  - useWaterLayers deck.gl rendering (river lines, river labels, facility icons)
  - WaterTooltip component for hover display
  - PrecipitationData interface for precip polling
affects: [26-05-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [water-store-precipitation-merge, stress-colored-river-rendering, italic-serif-river-labels]

key-files:
  created:
    - src/stores/waterStore.ts
    - src/hooks/useWaterFetch.ts
    - src/hooks/useWaterPrecipPolling.ts
    - src/hooks/useWaterLayers.ts
    - src/components/map/layers/WaterOverlay.tsx
    - src/__tests__/waterStore.test.ts
    - src/__tests__/WaterOverlay.test.tsx
  modified: []

key-decisions:
  - 'PrecipitationData interface defined in waterStore (not server/types.ts) since server-side plan 26-03 not yet executed'
  - 'Water facility icons use existing atlas entries as placeholders (diamond, siteDesalination) pending dedicated water icons'
  - 'River labels use serif italic font to distinguish from ethnic overlay sans-serif labels'
  - 'Precipitation polling errors logged but do not clear facilities (stale precip is acceptable)'

patterns-established:
  - 'Water store precipitation merge: match by lat/lng proximity (0.01 deg threshold), recompute compositeHealth'
  - 'Italic serif font for hydrographic labels (distinct from sans-serif ethnic labels)'

requirements-completed: [WAT-05, WAT-06]

# Metrics
duration: 31min
completed: 2026-04-03
---

# Phase 26 Plan 04: Water Map Layer (Client) Summary

**Zustand water store with precipitation merge, one-time facility fetch + 6h precip polling hooks, and deck.gl river lines / facility icons with stress-based color tinting**

## Performance

- **Duration:** 31 min
- **Started:** 2026-04-03T05:03:33Z
- **Completed:** 2026-04-03T05:34:34Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- waterStore manages full facility lifecycle (idle -> loading -> connected/error) with precipitation merge recomputing compositeHealth
- useWaterFetch fetches /api/water once on mount following useSiteFetch pattern
- useWaterPrecipPolling polls /api/water/precip every 6 hours with tab visibility awareness
- useWaterLayers returns 3 deck.gl layers: river GeoJsonLayer (stress-colored lines), river TextLayer (italic serif labels), facility IconLayer (stress-tinted markers)
- WaterTooltip displays facility name, type, stress level, health percentage, and precipitation anomaly
- 17 tests passing across waterStore and WaterOverlay test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Water store and fetch/polling hooks (TDD)**
   - `e3020da` (test: failing tests for water store)
   - `94611df` (feat: implement water store and fetch/polling hooks)

2. **Task 2: Water rendering layers and tooltip** - `875721f` (feat)

## Files Created/Modified

- `src/stores/waterStore.ts` - Zustand store with facilities, connectionStatus, precipitation merge with compositeHealth recomputation
- `src/hooks/useWaterFetch.ts` - One-time /api/water fetch on mount (follows useSiteFetch pattern)
- `src/hooks/useWaterPrecipPolling.ts` - 6-hour recursive setTimeout polling with tab visibility awareness
- `src/hooks/useWaterLayers.ts` - deck.gl layer hook: river GeoJsonLayer + river TextLayer + facility IconLayer
- `src/components/map/layers/WaterOverlay.tsx` - WaterTooltip component and behavior-only WaterOverlay
- `src/__tests__/waterStore.test.ts` - 8 tests for store state, setWaterData, updatePrecipitation, error/loading
- `src/__tests__/WaterOverlay.test.tsx` - 9 tests for tooltip rendering and layer hook behavior

## Decisions Made

- **PrecipitationData defined locally:** The `PrecipitationData` interface is defined in `waterStore.ts` rather than `server/types.ts` because plan 26-03 (server routes) has not yet been executed. When 26-03 runs, the type can be consolidated.
- **Placeholder icons:** Water facility icons reuse existing atlas entries (`diamond` for dam/treatment/canal, `siteDesalination` for reservoir/desalination) since dedicated water icons don't exist yet. Plan notes these can be refined in a follow-up.
- **Serif italic river labels:** River labels use `fontFamily: 'serif'` with `fontStyle: 'italic'` to create clear visual distinction from ethnic overlay labels which use `Inter, sans-serif`.
- **Graceful precip failure:** Precipitation polling errors are logged but do not clear facility data, since stale precipitation is preferable to no facilities.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing failing test `server/__tests__/adapters/overpass-water.test.ts` from plan 26-03 TDD RED phase (imports `overpass-water.js` which does not exist yet). Not caused by this plan's changes. Out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Client-side water infrastructure complete and ready for integration (Plan 05)
- Hooks consume `/api/water` and `/api/water/precip` endpoints that Plan 03 will create
- All 1151 existing tests passing (excluding pre-existing 26-03 RED-phase test)
- TypeScript compiles cleanly

## Self-Check: PASSED
