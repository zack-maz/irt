---
phase: 07-adsb-lol-data-source
plan: 01
subsystem: api
tags: [adsb-lol, flight-data, express, adapter, normalization]

# Dependency graph
requires:
  - phase: 06-ads-b-exchange-data-source
    provides: ADS-B Exchange adapter with V2 normalizer, flight route dispatch, FlightSource type
provides:
  - Shared V2 normalizer (adsb-v2-normalize.ts) with AdsbAircraft/AdsbResponse types
  - adsb.lol adapter (adsb-lol.ts) fetching from api.adsb.lol without auth
  - GET /api/sources config endpoint returning per-source configuration status
  - 3-source flight route dispatch with adsblol as default
  - FlightSource type extended with 'adsblol'
affects: [07-02 frontend integration, polling intervals, source selector UI]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared normalizer extraction, 3-source dispatch with helper functions, credential-free adapter]

key-files:
  created:
    - server/adapters/adsb-v2-normalize.ts
    - server/adapters/adsb-lol.ts
    - server/routes/sources.ts
    - server/__tests__/adapters/adsb-v2-normalize.test.ts
    - server/__tests__/adapters/adsb-lol.test.ts
    - server/__tests__/routes/sources.test.ts
  modified:
    - server/adapters/adsb-exchange.ts
    - server/types.ts
    - server/constants.ts
    - server/routes/flights.ts
    - server/index.ts
    - server/__tests__/adapters/adsb-exchange.test.ts
    - server/__tests__/routes/flights.test.ts
    - server/__tests__/server.test.ts

key-decisions:
  - "Extracted shared V2 normalizer into adsb-v2-normalize.ts to avoid code duplication between adsb-exchange and adsb-lol adapters"
  - "adsblol as default flight source (no API key required, best out-of-box experience)"
  - "30s cache TTL for adsb.lol (respectful of community API)"
  - "parseSource/getCache/getFetcher helper pattern for clean 3-source dispatch"

patterns-established:
  - "Shared normalizer pattern: common response format extracted to shared module, imported by multiple adapters"
  - "Credential-free adapter: adsb-lol calls fetch(url) with no options object (no headers)"
  - "Source config endpoint: GET /api/sources returns { source: { configured: boolean } } per source"

requirements-completed: [DATA-04]

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 7 Plan 01: Server-side adsb.lol Integration Summary

**Shared V2 normalizer extracted from ADS-B Exchange adapter, adsb.lol adapter fetching from api.adsb.lol without auth, 3-source flight route dispatch with adsblol as default, and /api/sources config endpoint**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T19:36:24Z
- **Completed:** 2026-03-16T19:41:30Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Extracted shared V2 normalizer (normalizeAircraft, AdsbAircraft, AdsbResponse) into dedicated module -- both adsb-exchange and adsb-lol import from it
- Created adsb.lol adapter that fetches from api.adsb.lol with no auth headers and no trailing slash
- Extended flight route to dispatch across 3 sources (opensky, adsb, adsblol) with adsblol as the new default
- Added /api/sources endpoint returning configuration status per source (adsblol always true)
- Added OpenSky credential check (503 when OPENSKY_CLIENT_ID/SECRET missing)
- Full test coverage: 81 server tests passing across 12 test files

## Task Commits

Each task was committed atomically (TDD: test then feat):

1. **Task 1: Extract shared V2 normalizer and create adsb-lol adapter**
   - `c6705cf` (test: add failing tests for shared V2 normalizer and adsb.lol adapter)
   - `2813a13` (feat: extract shared V2 normalizer and create adsb.lol adapter)
2. **Task 2: Extend flight route dispatch, add /api/sources endpoint, wire into server**
   - `f71f3d6` (test: add failing tests for 3-source dispatch and /api/sources endpoint)
   - `07cc801` (feat: extend flight dispatch to 3 sources, add /api/sources endpoint)

## Files Created/Modified
- `server/adapters/adsb-v2-normalize.ts` - Shared V2 normalizer with AdsbAircraft/AdsbResponse types and normalizeAircraft function
- `server/adapters/adsb-lol.ts` - adsb.lol adapter: fetches from api.adsb.lol without auth, uses shared normalizer
- `server/adapters/adsb-exchange.ts` - Refactored to import shared normalizer (no local copy)
- `server/routes/sources.ts` - GET /api/sources returning per-source configuration status
- `server/routes/flights.ts` - 3-source dispatch with parseSource/getCache/getFetcher helpers
- `server/types.ts` - FlightSource extended with 'adsblol'
- `server/constants.ts` - Added adsblolFlights: 30_000 cache TTL
- `server/index.ts` - Wired sourcesRouter at /api/sources
- `server/__tests__/adapters/adsb-v2-normalize.test.ts` - Shared normalizer unit tests (9 tests)
- `server/__tests__/adapters/adsb-lol.test.ts` - adsb.lol adapter tests (6 tests)
- `server/__tests__/adapters/adsb-exchange.test.ts` - Simplified to fetch-only tests (normalizer tests moved)
- `server/__tests__/routes/flights.test.ts` - Updated for 3-source dispatch with adsblol default
- `server/__tests__/routes/sources.test.ts` - Config status tests (7 tests)
- `server/__tests__/server.test.ts` - Updated for new default source

## Decisions Made
- Extracted shared V2 normalizer into `adsb-v2-normalize.ts` to avoid code duplication between adapters
- Changed default flight source from 'opensky' to 'adsblol' (no API key required, best out-of-box experience)
- Set 30s cache TTL for adsb.lol (respectful of community API with dynamic rate limits)
- Used parseSource/getCache/getFetcher helper pattern for clean, exhaustive 3-source dispatch
- adsb.lol adapter calls `fetch(url)` with no second argument (no options/headers) for zero-auth simplicity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated pre-existing server.test.ts for new default source**
- **Found during:** Task 2 (flight route dispatch refactor)
- **Issue:** `server/__tests__/server.test.ts` had a cache-first test calling `/api/flights` without `?source=` param, expecting OpenSky dispatch. With adsblol as the new default, this test broke.
- **Fix:** Added mocks for adsb-exchange and adsb-lol adapters, changed test URL to `?source=opensky` explicitly, added credential env vars.
- **Files modified:** `server/__tests__/server.test.ts`
- **Verification:** All 81 server tests pass
- **Committed in:** `07cc801` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix due to default source change. No scope creep.

## Issues Encountered
None

## User Setup Required
None - adsb.lol requires no API key or external configuration.

## Next Phase Readiness
- Server-side adsb.lol integration complete with full test coverage
- Ready for Plan 02: Frontend integration (source selector, polling intervals, disabled-state UI for unconfigured sources)
- `/api/sources` endpoint ready for frontend to query configuration status

## Self-Check: PASSED

All 6 created files verified on disk. All 4 commit hashes verified in git log.

---
*Phase: 07-adsb-lol-data-source*
*Completed: 2026-03-16*
