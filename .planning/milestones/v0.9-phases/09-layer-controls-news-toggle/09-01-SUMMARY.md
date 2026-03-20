---
phase: 09-layer-controls-news-toggle
plan: 01
subsystem: ui, api
tags: [zustand, localStorage, deck.gl, gdelt, layer-toggles]

# Dependency graph
requires:
  - phase: 08.1-gdelt-default-source
    provides: GDELT adapter, ConflictEventEntity, event store
  - phase: 05-entity-rendering
    provides: useEntityLayers hook, IconLayer setup
provides:
  - LayerToggles interface with 7 booleans and LAYER_TOGGLE_DEFAULTS
  - UIState extended with showFlights, showShips, showDrones, showMissiles, showNews
  - localStorage persistence under 'layerToggles' key
  - useEntityLayers conditional layer filtering by toggle state
  - ConflictEventEntity extended with goldsteinScale, locationName, cameoCode
  - GDELT adapter passthrough for Actor1Name, Actor2Name, GoldsteinScale
  - Pickable drone and missile layers for tooltip support
affects: [09-02, layer-controls-ui, news-panel, tooltips]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic localStorage persistence for all 7 layer toggles under single key"
    - "loadPersistedToggles merges stored values with defaults for forward compat"
    - "Independent showFlights + showGroundTraffic filtering (2x2 matrix)"
    - "Conditional layer array with filter(Boolean) for toggle-driven visibility"

key-files:
  created: []
  modified:
    - src/types/ui.ts
    - src/stores/uiStore.ts
    - src/hooks/useEntityLayers.ts
    - server/types.ts
    - server/adapters/gdelt.ts
    - server/adapters/acled.ts
    - src/__tests__/uiStore.test.ts
    - src/__tests__/entityLayers.test.ts
    - server/__tests__/gdelt.test.ts
    - src/__tests__/eventStore.test.ts
    - src/__tests__/useEventPolling.test.ts

key-decisions:
  - "All 7 toggles (showFlights, showShips, showDrones, showMissiles, showGroundTraffic, pulseEnabled, showNews) persist atomically under single 'layerToggles' localStorage key"
  - "showFlights and showGroundTraffic are fully independent (2x2 matrix: both ON, flights-only, ground-only, none)"
  - "showNews defaults to false per CTRL-04, all entity toggles default to true"
  - "Drone and missile layers set pickable=true preemptively for Plan 02 tooltip support"

patterns-established:
  - "LayerToggles interface: canonical shape for all layer visibility booleans"
  - "loadPersistedToggles: spread defaults with stored values for safe migration"
  - "Conditional layer array: [toggle ? layer : null].filter(Boolean)"

requirements-completed: [CTRL-01, CTRL-04]

# Metrics
duration: 12min
completed: 2026-03-18
---

# Phase 09 Plan 01: Layer Toggle State + GDELT Metadata Summary

**5 layer toggle booleans with localStorage persistence, conditional entity layer filtering, and GDELT metadata passthrough (actors, Goldstein scale, location, CAMEO code) for tooltip support**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-18T00:18:04Z
- **Completed:** 2026-03-18T00:30:43Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- UIState extended with showFlights, showShips, showDrones, showMissiles, showNews toggle booleans and actions
- All 7 layer toggles persist atomically to localStorage with corrupted-JSON fallback and missing-key defaults
- useEntityLayers conditionally includes/excludes layers based on toggle state with independent flight/ground traffic control
- ConflictEventEntity extended with goldsteinScale, locationName, cameoCode for rich tooltip content
- GDELT adapter passes through Actor1Name, Actor2Name, GoldsteinScale from CSV columns
- Drone and missile layers set pickable=true for tooltip hover support in Plan 02

## Task Commits

Each task was committed atomically (TDD: test + feat):

1. **Task 1: Extend UIState with layer toggle booleans and localStorage persistence**
   - `5438d72` (test: failing tests for toggle state and localStorage persistence)
   - `24b7810` (feat: add layer toggle state with localStorage persistence)
2. **Task 2: Extend ConflictEventEntity + GDELT adapter + filter entity layers by toggle state**
   - `89c61e4` (test: failing tests for GDELT metadata and layer visibility toggles)
   - `ed8f8ec` (feat: add GDELT metadata passthrough and layer visibility filtering)

## Files Created/Modified
- `src/types/ui.ts` - LayerToggles interface, LAYER_TOGGLE_DEFAULTS, extended UIState
- `src/stores/uiStore.ts` - Toggle actions with localStorage persistence via loadPersistedToggles/persistToggles
- `src/hooks/useEntityLayers.ts` - Conditional layer filtering by toggle state, pickable drone/missile layers
- `server/types.ts` - ConflictEventEntity extended with goldsteinScale, locationName, cameoCode
- `server/adapters/gdelt.ts` - Actor1Name, Actor2Name columns added; metadata passthrough in normalizer
- `server/adapters/acled.ts` - Default values for new fields (type compatibility)
- `src/__tests__/uiStore.test.ts` - 21 tests covering defaults, toggles, localStorage persistence
- `src/__tests__/entityLayers.test.ts` - 8 new tests for visibility toggles and pickable layers
- `server/__tests__/gdelt.test.ts` - 6 new tests for metadata passthrough
- `src/__tests__/eventStore.test.ts` - Updated mock entities with new fields
- `src/__tests__/useEventPolling.test.ts` - Updated mock entities with new fields

## Decisions Made
- All 7 toggles persist atomically under single 'layerToggles' localStorage key (simpler than per-toggle keys)
- showFlights and showGroundTraffic treated as independent 2x2 matrix (flights OFF + ground ON = show only ground aircraft)
- showNews defaults to false per CTRL-04 requirement
- Drone/missile layers set pickable=true preemptively (no perf cost without getTooltip callback)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated ACLED adapter for type compatibility**
- **Found during:** Task 2 (ConflictEventEntity extension)
- **Issue:** ACLED adapter's normalizeEvent missing new required fields (goldsteinScale, locationName, cameoCode)
- **Fix:** Added default values: goldsteinScale=0, locationName from country field, cameoCode=''
- **Files modified:** server/adapters/acled.ts
- **Verification:** Full test suite passes (282 tests)
- **Committed in:** ed8f8ec (Task 2 commit)

**2. [Rule 3 - Blocking] Updated mock entities in eventStore and useEventPolling tests**
- **Found during:** Task 2 (ConflictEventEntity extension)
- **Issue:** Mock ConflictEventEntity objects in test files missing new required fields
- **Fix:** Added goldsteinScale, locationName, cameoCode to all mock entities
- **Files modified:** src/__tests__/eventStore.test.ts, src/__tests__/useEventPolling.test.ts
- **Verification:** Full test suite passes (282 tests)
- **Committed in:** ed8f8ec (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary for TypeScript strict mode compliance after extending ConflictEventEntity. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Toggle state and persistence are complete -- ready for Plan 02's UI toggle panel
- ConflictEventEntity metadata fields populated -- ready for Plan 02's news tooltips
- Pickable layers set -- ready for tooltip hover callbacks

## Self-Check: PASSED

All 6 modified source files verified present. All 4 task commits verified in git log.

---
*Phase: 09-layer-controls-news-toggle*
*Completed: 2026-03-18*
