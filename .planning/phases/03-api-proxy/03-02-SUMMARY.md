---
phase: 03-api-proxy
plan: 02
subsystem: api
tags: [opensky, aisstream, acled, oauth2, websocket, express-routes, data-normalization]

# Dependency graph
requires:
  - phase: 03-api-proxy
    provides: Express 5 server, MapEntity types, EntityCache, config, constants
provides:
  - OpenSky flight adapter with OAuth2 client credentials auth and state vector normalization
  - ACLED conflict event adapter with OAuth2 password grant and missile/drone classification
  - AISStream WebSocket adapter with auto-reconnect and MMSI-keyed ship Map
  - Three Express routes: /api/flights, /api/ships, /api/events
  - CacheResponse format with staleness metadata on all endpoints
  - Stale cache fallback when upstream APIs are unavailable
affects: [04-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [adapter-pattern, oauth2-token-caching, websocket-push-with-map-cache, stale-cache-fallback]

key-files:
  created:
    - server/adapters/opensky.ts
    - server/adapters/acled.ts
    - server/adapters/aisstream.ts
    - server/routes/flights.ts
    - server/routes/ships.ts
    - server/routes/events.ts
    - server/__tests__/adapters/opensky.test.ts
    - server/__tests__/adapters/acled.test.ts
    - server/__tests__/adapters/aisstream.test.ts
    - server/__tests__/security.test.ts
  modified:
    - server/index.ts

key-decisions:
  - "UTC date formatting in ACLED adapter to avoid timezone-dependent date drift"
  - "Mock adapter modules in security tests instead of mocking fetch globally, to test actual HTTP responses"
  - "AISStream reconnect uses simple 5s setTimeout (not exponential backoff) matching plan spec"

patterns-established:
  - "OAuth2 token caching: module-level { token, expiresAt } with safe TTL margin"
  - "Adapter pattern: each upstream API isolated with fetch/normalize/export functions"
  - "Stale cache fallback: try upstream, on error serve cached, on no cache re-throw to errorHandler"
  - "WebSocket push adapter: in-memory Map keyed by unique ID, staleness from last message time"

requirements-completed: [INFRA-01]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 3 Plan 2: Data Adapters Summary

**Three upstream API adapters (OpenSky OAuth2 flights, AISStream WebSocket ships, ACLED OAuth2 conflict events) with Express routes, cache fallback, and credential security validation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T03:43:19Z
- **Completed:** 2026-03-15T03:48:19Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- OpenSky adapter with OAuth2 client credentials, 25-minute token cache, state vector array normalization to FlightEntity
- ACLED adapter with OAuth2 password grant, 23-hour token cache, missile/drone classification from sub_event_type
- AISStream adapter with native WebSocket, auto-reconnect on close, MMSI-keyed in-memory Map for live ship positions
- All three routes mounted at /api/flights, /api/ships, /api/events returning CacheResponse with staleness metadata
- Security tests verify no API credentials leak in any endpoint response body
- All 67 tests pass (37 server + 30 frontend), TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OpenSky and ACLED adapters with routes and tests** - `5c5eab0` (test) + `e70cd70` (feat)
2. **Task 2: Create AISStream WebSocket adapter with ships route, wire all routes, and add security tests** - `48f5134` (feat)

_Note: TDD Task 1 has separate RED (test) and GREEN (feat) commits_

## Files Created/Modified
- `server/adapters/opensky.ts` - OpenSky OAuth2 token management, state vector normalization, bbox flight fetching
- `server/adapters/acled.ts` - ACLED OAuth2 password grant, event classification (missile/drone), 7-day Iran data query
- `server/adapters/aisstream.ts` - AISStream WebSocket connection, PositionReport normalization, auto-reconnect, MMSI Map
- `server/routes/flights.ts` - GET /api/flights with EntityCache and stale fallback
- `server/routes/ships.ts` - GET /api/ships serving live WebSocket data with time-based staleness
- `server/routes/events.ts` - GET /api/events with EntityCache and stale fallback
- `server/index.ts` - Updated with all three route mounts and connectAISStream() at startup
- `server/__tests__/adapters/opensky.test.ts` - 6 tests: normalization, null filtering, auth, caching, credential safety, callsign fallback
- `server/__tests__/adapters/acled.test.ts` - 6 tests: normalization, classification, date range, auth caching, credential safety
- `server/__tests__/adapters/aisstream.test.ts` - 6 tests: subscription, normalization, multi-ship, upsert, timestamps, reconnect
- `server/__tests__/security.test.ts` - 3 tests: no credential leaks in flights, ships, events responses

## Decisions Made
- Used UTC date methods (getUTCFullYear, getUTCMonth, getUTCDate) in ACLED date formatting to prevent timezone-dependent date drift in test environments
- Mocked adapter modules directly in security tests rather than global fetch, allowing real HTTP requests to test server while isolating upstream API calls
- AISStream reconnect uses simple 5-second setTimeout rather than exponential backoff, matching the plan specification for this phase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed timezone-dependent date formatting in ACLED adapter**
- **Found during:** Task 1 (ACLED adapter tests)
- **Issue:** `formatDate()` used local timezone methods (getFullYear, getMonth, getDate) causing dates to shift by one day when system timezone differs from UTC
- **Fix:** Changed to UTC methods (getUTCFullYear, getUTCMonth, getUTCDate)
- **Files modified:** server/adapters/acled.ts
- **Verification:** All ACLED date range tests pass consistently
- **Committed in:** e70cd70 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor timezone correctness fix. No scope creep.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration before endpoints return real data.** Users must have the following environment variables set in `.env`:
- `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` - OAuth2 client from OpenSky dashboard
- `AISSTREAM_API_KEY` - API key from AISStream.io
- `ACLED_EMAIL` / `ACLED_PASSWORD` - ACLED account credentials

See `.env.example` for detailed instructions on where to obtain each credential.

## Next Phase Readiness
- All three API proxy endpoints are functional and tested
- Phase 3 (API Proxy) is fully complete
- Frontend can now integrate via fetch to /api/flights, /api/ships, /api/events
- Each endpoint returns `{ data, stale, lastFresh }` format ready for UI consumption

## Self-Check: PASSED

All 11 created/modified files verified on disk. All 3 task commits (5c5eab0, e70cd70, 48f5134) verified in git log.

---
*Phase: 03-api-proxy*
*Completed: 2026-03-14*
