---
phase: 04-flight-data-feed
plan: 01
subsystem: api
tags: [opensky, flight-data, caching, server, express]

# Dependency graph
requires:
  - phase: 03-api-proxy
    provides: Express server with flights route, EntityCache, OpenSky adapter
provides:
  - onGround filter removing ground traffic from flight data
  - unidentified boolean flag on FlightEntity.data for hex-only flights
  - cache-first route logic preventing redundant upstream API calls
affects: [04-flight-data-feed, frontend-polling, flight-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [cache-first route pattern, adapter-level data filtering, TDD red-green for server features]

key-files:
  created: []
  modified:
    - server/types.ts
    - server/adapters/opensky.ts
    - server/routes/flights.ts
    - server/__tests__/adapters/opensky.test.ts
    - server/__tests__/server.test.ts

key-decisions:
  - 'onGround filter returns null (not filtered post-hoc) for early exit efficiency'
  - 'onGround always set to false in returned data since ground flights are filtered out'
  - 'unidentified flag derived from empty trimmed callsign at adapter level'
  - 'Cache-first check before upstream call conserves OpenSky API credits'

patterns-established:
  - 'Cache-first route pattern: check cache freshness before upstream call, fall back to stale on error'
  - 'Adapter-level data filtering: remove irrelevant entries (ground traffic) before they enter the cache'

requirements-completed: [DATA-01]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 4 Plan 1: Flight Pipeline Fixes Summary

**onGround filter, unidentified flight flag, and cache-first route optimization for the OpenSky flight pipeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T16:19:31Z
- **Completed:** 2026-03-15T16:22:22Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Ground traffic (onGround=true) filtered out at adapter level -- only airborne flights returned
- Flights with empty/blank callsign flagged as unidentified=true in FlightEntity.data
- Flights route now serves fresh cached data without upstream API calls when cache is not stale
- Stale cache served as fallback when upstream API fails
- All 41 server tests pass including 4 new tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Add unidentified flag and onGround filter** - `c8a9de4` (feat)
2. **Task 2: Cache-first flights route with integration test** - `238860d` (feat)

_Both tasks used TDD: RED (failing test) then GREEN (implementation passes)_

## Files Created/Modified

- `server/types.ts` - Added `unidentified: boolean` to FlightEntity.data interface
- `server/adapters/opensky.ts` - onGround filter + unidentified flag in normalizeFlightState
- `server/routes/flights.ts` - Cache-first check before upstream fetchFlights call
- `server/__tests__/adapters/opensky.test.ts` - 3 new tests: ground filter, unidentified true/false
- `server/__tests__/server.test.ts` - 1 new test: cache-first behavior prevents redundant upstream calls

## Decisions Made

- onGround filter implemented as early return (null) in normalizeFlightState for efficiency -- ground flights never enter the pipeline
- `onGround` field set to `false` (constant) in returned data since ground traffic is filtered out -- avoids misleading data
- `unidentified` derived from `callsign === ''` after trim -- blank/whitespace-only callsigns treated as unidentified (hex-only, often military)
- Cache-first route pattern: check `flightCache.get()` freshness at top of handler before any upstream call

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest does not support `-x` flag for bail-on-first-failure; used `--bail 1` instead. No impact on execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Server-side flight pipeline fully optimized: filtered, flagged, and cached
- Ready for Plan 02: frontend polling pipeline to consume clean flight data
- FlightEntity.data.unidentified available for frontend to highlight military/hex-only flights

## Self-Check: PASSED

- All 6 files verified present on disk
- Both task commits verified in git log (c8a9de4, 238860d)
- All 5 must_have artifacts verified (unidentified boolean, onGround filter, cache-first route, adapter tests, server test)
- All 41 server tests passing

---

_Phase: 04-flight-data-feed_
_Completed: 2026-03-15_
