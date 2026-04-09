---
phase: 22-gdelt-event-quality-osint-integration
plan: 02
subsystem: api
tags: [gdelt, bellingcat, osint, rss, corroboration, confidence]

# Dependency graph
requires:
  - phase: 22-01
    provides: eventScoring module, config-driven thresholds, pipeline foundation
provides:
  - Bellingcat as 6th RSS news feed source
  - checkBellingcatCorroboration function with 3-gate matching
  - extractBellingcatGeo city-name-to-coordinate mapper
  - Bellingcat corroboration boost wired into GDELT parseAndFilter pipeline
affects: [22-03, notification-center, threat-heatmap]

# Tech tracking
tech-stack:
  added: []
  patterns: [three-gate-corroboration, opportunistic-cache-lookup]

key-files:
  created: []
  modified:
    - server/adapters/rss.ts
    - server/lib/eventScoring.ts
    - server/adapters/gdelt.ts
    - server/routes/events.ts
    - server/__tests__/adapters/rss.test.ts
    - server/__tests__/lib/eventScoring.test.ts
    - server/__tests__/gdelt.test.ts

key-decisions:
  - 'RSS_FEEDS changed from const assertion to typed array for extensibility when adding Bellingcat'
  - 'haversineKm imported from src/lib/geo.js into server module (cross-boundary import bundled by tsup)'
  - 'Events route uses cacheGetSafe with logicalTtlMs=0 to read news cache regardless of staleness'

patterns-established:
  - 'Three-gate corroboration: temporal AND geographic AND keyword must ALL pass for confidence boost'
  - 'Opportunistic cache lookup: Bellingcat articles fetched from news cache, graceful fallback to empty array on failure'

requirements-completed: [EQ-05, EQ-06]

# Metrics
duration: 6min
completed: 2026-04-01
---

# Phase 22 Plan 02: Bellingcat OSINT Integration Summary

**Bellingcat RSS as 6th news source with three-gate corroboration boost (+0.2 confidence) wired into the GDELT event pipeline end-to-end**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T23:40:08Z
- **Completed:** 2026-04-01T23:46:13Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Bellingcat added as 6th RSS feed source, articles flow through existing keyword filter, relevance scoring, and dedup/clustering pipeline
- Three-gate corroboration function (temporal +-24h, geographic <=200km, keyword >=2 matches) prevents false positive boosts
- GDELT parseAndFilter pipeline wired end-to-end: events route fetches Bellingcat articles from news cache, passes to parseAndFilter, matched events get +0.2 confidence boost (clamped to 1.0)
- Full TDD: 20 new tests across 3 test files (10 corroboration, 5 geo extraction, 5 pipeline integration)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Bellingcat RSS feed to news pipeline** - `f0f95f7` (feat)
2. **Task 2: Bellingcat corroboration boost for GDELT event confidence** - `bae5f1b` (feat) - TDD: `fa06746` (test) -> `bae5f1b` (feat)
3. **Task 3: Wire Bellingcat corroboration into GDELT event pipeline** - `54dbf77` (feat) - TDD: `4172f8e` (test) -> `54dbf77` (feat)

## Files Created/Modified

- `server/adapters/rss.ts` - Added Bellingcat as 6th RSS feed entry with Netherlands country
- `server/lib/eventScoring.ts` - Added checkBellingcatCorroboration (3-gate matching) and extractBellingcatGeo (city name to coordinate mapper)
- `server/adapters/gdelt.ts` - parseAndFilter accepts optional bellingcatArticles, applies corroboration boost after confidence threshold
- `server/routes/events.ts` - Fetches Bellingcat articles from news cache and passes to fetchEvents
- `server/__tests__/adapters/rss.test.ts` - Updated feed count tests, added Bellingcat-specific assertions
- `server/__tests__/lib/eventScoring.test.ts` - 10 new tests for corroboration logic and geo extraction
- `server/__tests__/gdelt.test.ts` - 5 new tests for corroboration pipeline integration

## Decisions Made

- Changed `RSS_FEEDS` from `as const` to typed array (`{ url: string; name: string; country: string }[]`) since the const narrowing is not used downstream, and it makes adding entries cleaner.
- Used cross-boundary import (`../../src/lib/geo.js`) for haversineKm in server code -- tsup bundles this correctly for the serverless function.
- Events route fetches news cache with `logicalTtlMs=0` so it reads whatever Bellingcat articles are available regardless of cache age. This is intentional: the corroboration is opportunistic, and articles from any recent cache are valid for matching.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Bellingcat corroboration fully wired and tested, ready for Plan 03 (audit-first filter tuning)
- 117 tests pass across the 3 modified test files (10 RSS + 39 eventScoring + 68 GDELT)
- Pre-existing timeout in security.test.ts (unrelated to this plan's changes)

## Self-Check: PASSED

All 7 modified files verified on disk. All 5 task commits (f0f95f7, fa06746, bae5f1b, 4172f8e, 54dbf77) verified in git log.

---

_Phase: 22-gdelt-event-quality-osint-integration_
_Completed: 2026-04-01_
