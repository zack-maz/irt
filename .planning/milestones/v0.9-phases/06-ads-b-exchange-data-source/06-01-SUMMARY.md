---
phase: 06-ads-b-exchange-data-source
plan: 01
subsystem: api
tags: [adsb-exchange, rapidapi, flight-data, rate-limiting, adapter-pattern]

# Dependency graph
requires:
  - phase: 03-api-proxy
    provides: Express server, EntityCache, FlightEntity type, route patterns
  - phase: 04-flight-data-feed
    provides: OpenSky adapter pattern, flight route, cache-first route pattern
provides:
  - ADS-B Exchange V2 adapter with unit conversion and normalization
  - FlightSource type and RateLimitError class
  - Source-dispatching flight route with per-source caching
  - Rate limit handling with stale cache fallback
  - IRAN_CENTER, ADSB_RADIUS_NM, ADSB_POLL_INTERVAL constants
  - Unit conversion constants (KNOTS_TO_MS, FEET_TO_METERS, FPM_TO_MS)
affects: [06-02 frontend source selector, 06-03 polling hook wiring]

# Tech tracking
tech-stack:
  added: []
  patterns: [source-dispatch route, per-source caching, RateLimitError distinction, inline env var credential pattern]

key-files:
  created:
    - server/adapters/adsb-exchange.ts
    - server/__tests__/adapters/adsb-exchange.test.ts
    - server/__tests__/routes/flights.test.ts
  modified:
    - server/types.ts
    - server/constants.ts
    - server/routes/flights.ts
    - server/__tests__/security.test.ts

key-decisions:
  - "Inline process.env.ADSB_EXCHANGE_API_KEY read instead of config.ts integration -- follows AISStream optional-service pattern"
  - "Separate EntityCache instances per source to prevent cross-contamination between OpenSky and ADS-B data"
  - "260s polling interval (4 min 20 sec) for sustainable 10K requests/month free-tier budget"
  - "Single 250 NM radius query from Iran center (32.5, 53.75) covers core airspace, accepts edge coverage gap"

patterns-established:
  - "Source dispatch pattern: route reads ?source= param and selects adapter + cache pair"
  - "RateLimitError class for structured 429 handling with stale cache fallback"
  - "Module-level mock fn + wrapper pattern for vitest integration tests with vi.resetModules()"

requirements-completed: [DATA-04]

# Metrics
duration: 9min
completed: 2026-03-16
---

# Phase 6 Plan 1: Server-Side ADS-B Exchange Integration Summary

**ADS-B Exchange V2 adapter via RapidAPI with unit conversion, source-dispatching flight route, per-source caching, and rate limit handling**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-16T06:36:21Z
- **Completed:** 2026-03-16T06:45:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- ADS-B Exchange adapter normalizes V2 aircraft data to FlightEntity with correct unit conversions (knots to m/s, feet to meters, ft/min to m/s)
- Flight route dispatches between OpenSky and ADS-B Exchange based on ?source= query param with separate caches
- Rate limit (429) responses distinguished from generic errors, stale cache served with rateLimited flag
- 503 response when ADS-B source requested without API key configured
- No API key leaks verified in security tests

## Task Commits

Each task was committed atomically:

1. **Task 1: ADS-B Exchange adapter with types and constants**
   - `565672d` (test: failing tests for adapter -- TDD RED)
   - `384eebc` (feat: implement adapter, types, constants -- TDD GREEN)
2. **Task 2: Flight route dispatch with per-source caching and rate limit handling**
   - `1d88398` (test: failing tests for route dispatch -- TDD RED)
   - `bd791ce` (feat: implement route dispatch, update security tests -- TDD GREEN)

_TDD tasks each have two commits (test then implementation)_

## Files Created/Modified
- `server/adapters/adsb-exchange.ts` - ADS-B Exchange V2 adapter with normalizeAircraft and fetchFlights
- `server/types.ts` - Added FlightSource type and RateLimitError class
- `server/constants.ts` - Added IRAN_CENTER, ADSB_RADIUS_NM, ADSB_POLL_INTERVAL, unit conversion constants, adsbFlights cache TTL
- `server/routes/flights.ts` - Refactored for source param dispatch with per-source caching and rate limit handling
- `server/__tests__/adapters/adsb-exchange.test.ts` - 14 unit tests for adapter normalization and API calls
- `server/__tests__/routes/flights.test.ts` - 9 integration tests for route dispatch, caching, rate limits
- `server/__tests__/security.test.ts` - Added ADS-B Exchange API key leak prevention test

## Decisions Made
- Used inline `process.env.ADSB_EXCHANGE_API_KEY` read instead of adding to config.ts -- follows the established AISStream optional-service pattern where the key is only needed when the source is requested
- Created separate EntityCache instances per source (openskyCache with 10s TTL, adsbCache with 260s TTL) to prevent serving stale OpenSky data when user switches to ADS-B and vice versa
- Set ADSB_POLL_INTERVAL to 260_000ms (4 min 20 sec) based on 10K requests/month budget calculation
- normalizeAircraft stores original hex (including tilde prefix) in data.icao24 for display, but strips tilde from entity ID to avoid selector issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Test cache isolation: module-level EntityCache instances persisted across vitest tests causing cross-test contamination. Resolved by using `vi.resetModules()` in beforeEach and re-importing the app module for each test, ensuring fresh cache instances per test.
- Mock function timing: `vi.mock()` factory functions run lazily, so mock fns assigned inside factories weren't available at test setup time. Resolved by defining mock fns at module scope and using wrapper functions (`(...args) => mockFn(...args)`) inside `vi.mock()` factories.

## User Setup Required

None - no external service configuration required for this plan. The `ADSB_EXCHANGE_API_KEY` env var is needed at runtime but is handled gracefully (503 when missing).

## Next Phase Readiness
- Server-side ADS-B Exchange integration complete
- `/api/flights?source=adsb` endpoint ready for frontend polling hook (Plan 02)
- `/api/flights?source=opensky` backward compatible (default behavior unchanged)
- FlightSource type and rate limit handling ready for frontend store integration (Plan 02/03)

---
*Phase: 06-ads-b-exchange-data-source*
*Completed: 2026-03-16*
