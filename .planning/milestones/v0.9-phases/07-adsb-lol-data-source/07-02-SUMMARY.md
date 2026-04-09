---
phase: 07-adsb-lol-data-source
plan: 02
subsystem: ui
tags: [adsb-lol, flight-source, source-selector, polling, zustand, react]

# Dependency graph
requires:
  - phase: 07-adsb-lol-data-source
    provides: Server-side adsb.lol adapter, /api/sources endpoint, 3-source flight dispatch
  - phase: 06-ads-b-exchange-data-source
    provides: SourceSelector component, FlightSource type, useFlightPolling hook
provides:
  - FlightSource type extended with 'adsblol' (3 values)
  - Default source changed to adsblol (zero-config)
  - 30s polling interval for adsblol via Record-based INTERVAL_MAP
  - 3-option SourceSelector with disabled state for unconfigured sources
  - /api/sources fetch on mount for per-source configuration status
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      Record-based interval map replacing ternary,
      optimistic defaults before API response,
      aria-disabled for unconfigured sources,
    ]

key-files:
  created: []
  modified:
    - src/types/ui.ts
    - src/stores/flightStore.ts
    - src/hooks/useFlightPolling.ts
    - src/components/ui/SourceSelector.tsx
    - src/__tests__/flightStore.test.ts
    - src/__tests__/useFlightPolling.test.ts
    - src/__tests__/SourceSelector.test.tsx

key-decisions:
  - 'Record-based INTERVAL_MAP for polling intervals instead of ternary chain -- exhaustive by type, easy to extend'
  - 'Optimistic defaults (all sources enabled) until /api/sources responds -- dropdown works immediately'
  - 'aria-disabled attribute on unconfigured source options for accessibility'

patterns-established:
  - 'Source config fetch: useEffect on mount fetching /api/sources, null state for optimistic defaults'
  - 'Disabled option pattern: aria-disabled + cursor-not-allowed + onClick guard + hint text'

requirements-completed: [DATA-04]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 7 Plan 02: Frontend adsb.lol Integration Summary

**3-option SourceSelector with adsblol default, 30s polling interval via Record-based INTERVAL_MAP, and disabled-state treatment for unconfigured sources fetched from /api/sources**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T19:45:05Z
- **Completed:** 2026-03-16T19:48:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Extended FlightSource type with 'adsblol' and changed default from 'opensky' to 'adsblol' for zero-config experience
- Added 30s polling interval for adsblol with Record-based INTERVAL_MAP replacing ternary chain
- Updated SourceSelector to show 3 options with disabled state (aria-disabled, cursor-not-allowed, "(API key required)" hint) for unconfigured sources
- Added /api/sources fetch on mount with optimistic defaults before response arrives
- Full test coverage: 114 frontend tests passing across 13 test files

## Task Commits

Each task was committed atomically (TDD: test then feat):

1. **Task 1: Extend FlightSource type, update store default, add polling interval**
   - `846abae` (test: add failing tests for adsblol source support)
   - `f53efd7` (feat: extend FlightSource with adsblol, update default and polling interval)
2. **Task 2: Update SourceSelector with 3 options, disabled state, and /api/sources fetch**
   - `19e7c56` (test: add failing tests for 3-option SourceSelector with disabled state)
   - `967ede7` (feat: update SourceSelector with 3 options, disabled state, and /api/sources fetch)

## Files Created/Modified

- `src/types/ui.ts` - FlightSource type extended to 'opensky' | 'adsb' | 'adsblol'
- `src/stores/flightStore.ts` - Default source changed to 'adsblol', loadPersistedSource recognizes all 3 values
- `src/hooks/useFlightPolling.ts` - ADSBLOL_POLL_INTERVAL (30s), Record-based INTERVAL_MAP replacing ternary
- `src/components/ui/SourceSelector.tsx` - 3 options, /api/sources fetch, disabled state for unconfigured sources
- `src/__tests__/flightStore.test.ts` - Added adsblol default, persistence, and setActiveSource tests
- `src/__tests__/useFlightPolling.test.ts` - Added adsblol fetch URL and 30s interval tests
- `src/__tests__/SourceSelector.test.tsx` - Added 3-option, disabled state, optimistic defaults tests

## Decisions Made

- Used Record-based INTERVAL_MAP for polling intervals instead of growing ternary chain -- exhaustive by FlightSource type, easy to extend
- Optimistic defaults (all sources enabled) until /api/sources responds -- dropdown works immediately on mount without waiting for network
- aria-disabled attribute on unconfigured source options for accessibility best practices

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - adsb.lol requires no API key or external configuration.

## Next Phase Readiness

- Phase 7 (adsb.lol Data Source) fully complete: server-side adapter + frontend integration
- 3 flight data sources available: OpenSky (5s poll), ADS-B Exchange (260s poll), adsb.lol (30s poll, default)
- Ready for next phase in roadmap

## Self-Check: PASSED

All 7 modified files verified on disk. All 4 commit hashes verified in git log.

---

_Phase: 07-adsb-lol-data-source_
_Completed: 2026-03-16_
