---
phase: 26-water-stress-layer
plan: 05
subsystem: ui
tags: [water-stress, deck.gl, zustand, detail-panel, counters, search, proximity-alerts, legend]

requires:
  - phase: 26-water-stress-layer-01
    provides: WaterFacility type, waterStress lib, Aqueduct basin data
  - phase: 26-water-stress-layer-03
    provides: Server routes /api/water and /api/water/precip, overpass-water adapter, basin lookup
  - phase: 26-water-stress-layer-04
    provides: waterStore, useWaterFetch, useWaterPrecipPolling, useWaterLayers, WaterTooltip
provides:
  - WaterFacilityDetail component for detail panel
  - Water facilities as first-class entities (click, detail, search, counters, proximity)
  - Water layer toggle (no longer "coming soon")
  - Water health gradient legend
  - Dismissible proximity alerts for water facilities
affects: [phase-27-performance, future-visualization-layers]

tech-stack:
  added: []
  patterns:
    - "Water facility integration gated by layer active state"
    - "Dismissible proximity alerts with 60s cooldown"

key-files:
  created:
    - src/components/detail/WaterFacilityDetail.tsx
  modified:
    - src/components/layout/DetailPanelSlot.tsx
    - src/components/map/BaseMap.tsx
    - src/components/layout/AppShell.tsx
    - src/hooks/useSelectedEntity.ts
    - src/components/counters/useCounterData.ts
    - src/components/layout/CountersSlot.tsx
    - src/hooks/useSearchResults.ts
    - src/hooks/useProximityAlerts.ts
    - src/lib/tagRegistry.ts
    - src/components/map/MapLegend.tsx
    - src/components/layout/LayerTogglesSlot.tsx
    - src/components/map/ProximityAlertOverlay.tsx

key-decisions:
  - "Water facilities use same proximity alert system as sites (waterToSiteLike adapter)"
  - "Proximity alerts now dismissible with 60s cooldown to prevent overwhelm from water facilities"
  - "Alert click selects site/facility (not flight) for detail panel context"

patterns-established:
  - "Visualization layer integration checklist: BaseMap layers, AppShell hooks, DetailPanel, counters, search, proximity, legend, toggle"

requirements-completed: [WAT-08, WAT-09, WAT-10, WAT-11]

duration: 2min
completed: 2026-04-03
---

# Phase 26 Plan 05: Water Integration Summary

**Full water layer integration: detail panel, counters, search, proximity alerts, legend, and toggle UI wired across all app systems**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-03T15:22:41Z
- **Completed:** 2026-04-03T15:24:33Z
- **Tasks:** 2 auto + 1 checkpoint (pending)
- **Files modified:** 24

## Accomplishments

- WaterFacilityDetail panel shows all WRI Aqueduct indicators, precipitation, attack status, satellite thumbnail
- Water facilities integrated into counters (5 facility types), search (type:dam, stress:high, name:, near:), and proximity alerts
- Water health gradient legend (black to light blue) registered in LEGEND_REGISTRY
- Water toggle no longer shows "coming soon" in LayerTogglesSlot
- Proximity alerts enhanced with dismiss functionality (60s cooldown) to handle increased target count

## Task Commits

Each task was committed atomically:

1. **Task 1: WaterFacilityDetail, DetailPanel wiring, BaseMap + AppShell integration** - `0b32221` (feat)
2. **Task 2: Counters, search, proximity, legend, and toggle UI** - `7b078ba` (feat)
3. **Task 2.1: Proximity alert dismiss enhancement** - `1ab6cca` (fix)

## Files Created/Modified

- `src/components/detail/WaterFacilityDetail.tsx` - Detail panel for water facilities with all WRI indicators
- `src/components/layout/DetailPanelSlot.tsx` - Added water entity type rendering
- `src/components/map/BaseMap.tsx` - Water layers in deck.gl stack, water hover/click handling
- `src/components/layout/AppShell.tsx` - Wired useWaterFetch and useWaterPrecipPolling
- `src/hooks/useSelectedEntity.ts` - Cross-store lookup for water facilities
- `src/components/counters/useCounterData.ts` - WaterCounts interface, water entity collection
- `src/components/layout/CountersSlot.tsx` - Water section with 5 facility type counter rows
- `src/hooks/useSearchResults.ts` - Water facility search evaluation (gated by layer active)
- `src/hooks/useProximityAlerts.ts` - Water facilities included in proximity check
- `src/lib/tagRegistry.ts` - Water/stress tags, water facility names in near: suggestions
- `src/components/map/MapLegend.tsx` - Water health gradient legend
- `src/components/layout/LayerTogglesSlot.tsx` - Removed comingSoon from water toggle
- `src/components/map/ProximityAlertOverlay.tsx` - Dismiss functionality with 60s cooldown
- `src/__tests__/MapLegend.test.tsx` - Water legend test
- `src/__tests__/CountersSlot.test.tsx` - Water counter section tests

## Decisions Made

- Water facilities use the same proximity alert system as sites, adapted via `waterToSiteLike` converter
- Alert click now selects the site/facility (not the approaching flight) for detail panel context
- Proximity alerts enhanced with dismiss functionality (60s cooldown) since water facilities significantly increase the number of alertable targets

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added proximity alert dismiss functionality**
- **Found during:** Task 2 (proximity alerts integration)
- **Issue:** Adding ~4300 water facilities to proximity checks would generate overwhelming alerts
- **Fix:** Added dismissible alerts with 60s cooldown, click-to-expand selects facility for detail context
- **Files modified:** src/components/map/ProximityAlertOverlay.tsx
- **Verification:** TypeScript compiles, full test suite passes (1186 tests)
- **Committed in:** 1ab6cca

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** Essential UX improvement for handling water facility proximity scale. No scope creep.

## Issues Encountered

None - all integration points were straightforward wiring following established patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Water stress overlay feature complete pending visual verification (Task 3 checkpoint)
- All 1186 tests pass, TypeScript clean
- Ready for Phase 27 (Performance & Load Testing) after visual approval

---
*Phase: 26-water-stress-layer*
*Completed: 2026-04-03*
