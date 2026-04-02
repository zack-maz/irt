---
phase: 23-threat-density-improvements
plan: 02
subsystem: ui
tags: [deck.gl, bfs, clustering, detail-panel, zustand, react]

requires:
  - phase: 23-threat-density-improvements/01
    provides: ThreatZoneData with eventIds, aggregateToGrid, computeThreatWeight, thermal palette heatmap
provides:
  - mergeClusters BFS function for connected-component grid cell merging
  - ThreatCluster type in ui.ts
  - ThreatClusterDetail component with scrollable event list and fly-to
  - selectedCluster/setSelectedCluster in uiStore with mutual exclusion
  - Cluster picker layer (threat-cluster-picker) replacing cell-level picker
affects: [detail-panel, threat-heatmap, entity-selection, phase-23.1-navigation-stack]

tech-stack:
  added: []
  patterns: [bfs-flood-fill-on-integer-grid, mutual-exclusion-in-zustand-store, cluster-to-entity-drill-down]

key-files:
  created:
    - src/components/detail/ThreatClusterDetail.tsx
    - src/__tests__/ThreatClusterDetail.test.tsx
  modified:
    - src/components/map/layers/ThreatHeatmapOverlay.tsx
    - src/types/ui.ts
    - src/stores/uiStore.ts
    - src/components/layout/DetailPanelSlot.tsx
    - src/components/map/BaseMap.tsx
    - src/__tests__/ThreatHeatmapOverlay.test.tsx

key-decisions:
  - "ThreatCluster type defined in ui.ts (not ThreatHeatmapOverlay) to avoid circular imports"
  - "Integer grid indices (Math.round) for BFS neighbor lookup to avoid floating-point key mismatch"
  - "selectedCluster and selectedEntityId mutually exclusive in uiStore via cross-clearing"
  - "Cluster picker radius proportional to bounding box diagonal with 50km floor"

patterns-established:
  - "Cluster-to-entity drill-down: cluster detail -> event click -> entity detail with fly-to"
  - "Mutual exclusion pattern in Zustand: setter A clears field B, setter B clears field A"
  - "DetailPanelSlot ternary chain: selectedCluster ? cluster : entity ? entity : placeholder"

requirements-completed: [P23-06, P23-07, P23-08]

duration: 7min
completed: 2026-04-02
---

# Phase 23 Plan 02: Cluster Merging & Click Interaction Summary

**BFS connected-component clustering on threat grid with click-through detail panel showing cluster header, scrollable event list, and fly-to-event drill-down**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-02T05:29:52Z
- **Completed:** 2026-04-02T05:36:45Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Adjacent non-empty 0.25-degree grid cells merge into connected-component clusters via BFS flood fill using integer grid indices
- Clicking a threat cluster on the map opens a detail panel with "Threat Cluster -- N events" header and scrollable event list
- Clicking an individual event within the cluster detail flies to it and opens EventDetail
- selectedCluster and selectedEntityId are mutually exclusive in uiStore
- Cluster picker layer uses bounding-box-proportional radius for accurate click targeting
- 47 new/updated tests (40 ThreatHeatmapOverlay + 7 ThreatClusterDetail), full suite 1055/1056 pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mergeClusters and ThreatCluster type, update picker layer** (TDD)
   - `ed34008` test: add failing tests for mergeClusters and cluster picker layer
   - `17e8c87` feat: add mergeClusters BFS function and cluster picker layer

2. **Task 2: Wire cluster click to detail panel with ThreatClusterDetail** (TDD)
   - `21d6b68` test: add failing tests for ThreatClusterDetail component
   - `da0965c` feat: wire cluster click to detail panel with ThreatClusterDetail

## Files Created/Modified
- `src/types/ui.ts` - Added ThreatCluster interface and selectedCluster/setSelectedCluster to UIState
- `src/stores/uiStore.ts` - Added selectedCluster state with mutual exclusion against selectedEntityId
- `src/components/map/layers/ThreatHeatmapOverlay.tsx` - Added mergeClusters BFS function, updated picker layer to cluster-level
- `src/components/detail/ThreatClusterDetail.tsx` - New cluster detail component with event list and fly-to
- `src/components/layout/DetailPanelSlot.tsx` - Added cluster detail rendering before entity detail
- `src/components/map/BaseMap.tsx` - Updated handleDeckClick/handleDeckHover for threat-cluster-picker layer
- `src/__tests__/ThreatHeatmapOverlay.test.tsx` - Added mergeClusters test suite, updated picker layer tests
- `src/__tests__/ThreatClusterDetail.test.tsx` - New test suite for cluster detail component

## Decisions Made
- ThreatCluster type defined in ui.ts to avoid circular imports between ui.ts and ThreatHeatmapOverlay
- Integer grid indices (Math.round) used for BFS neighbor lookup to avoid floating-point key mismatch (per research pitfall 1)
- selectedCluster and selectedEntityId use cross-clearing for mutual exclusion (setting one always nulls the other)
- Cluster picker radius uses bounding box diagonal / 2 with 50km floor for single-cell clusters

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Test for boundingBox initially used diagonal (non-adjacent) cells which formed separate clusters under 4-connected BFS -- fixed by using L-shaped test data

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Threat heatmap is now fully interactive: clusters are clickable and drill down to individual events
- Phase 23.1 (navigation stack) can build on the selectedCluster/selectedEntityId mutual exclusion pattern
- Phase 24 (political boundaries) has no dependencies on this plan

## Self-Check: PASSED

All files exist, all 4 commits verified in git log.

---
*Phase: 23-threat-density-improvements*
*Completed: 2026-04-02*
