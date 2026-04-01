# Phase 22: GDELT Event Quality & OSINT Integration - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate false positives/negatives in the conflict event pipeline, add Bellingcat as an OSINT gap-filter (both news source and event confidence booster), fix event location stacking via concentric ring dispersion, and produce a comprehensive event audit trail. Specific filter tuning is audit-driven — dump first, review, then tune based on findings.

</domain>

<decisions>
## Implementation Decisions

### Event Stacking Fix
- Use concentric ring dispersion for city-level centroid events (ActionGeo_Type=3)
- Ring 1: 6 positions at ~3km radius, Ring 2: 12 at ~6km, Ring 3: 18 at ~9km
- Deterministic positioning: events sorted by timestamp, assigned to ring slots in order — stable across reloads
- Dispersion computed server-side in the adapter — coordinates modified before caching
- Store BOTH original centroid coordinates and dispersed coordinates on each event for audit purposes
- City-level events are kept (not rejected or downranked) — dispersion is the solution, not filtering

### GDELT Filter Tuning
- Audit-first approach: dump all events (passed + rejected) before making any filter changes
- Compare against manual review — user will scan the dump and flag false positives/negatives
- Corrections fed back via config-driven thresholds (adjustable confidence threshold, CAMEO exclusion list, NumSources min, centroid penalty) — no code changes needed per adjustment
- Auto-audit cross-referencing deferred to potential Phase 22.1

### Bellingcat Integration
- Dual role: RSS news feed source (6th feed in existing pipeline) AND event confidence booster
- As news feed: flows through existing keyword filter, relevance scoring, and dedup/clustering — appears in notification center
- As confidence booster: +0.2 to GDELT event confidence score when corroborated by a Bellingcat article
- Tighter matching criteria for corroboration (since boost is strong): ±24h temporal window AND require BOTH geographic AND keyword overlap (not OR)
- Reuses newsMatching.ts approach but with stricter parameters

### Event Audit Output
- CLI script: `npx tsx scripts/audit-events.ts`
- JSON format, well-structured and easy to read
- Includes both accepted AND rejected events with rejection reason (e.g., rejected:low_confidence, rejected:excluded_cameo, rejected:single_source)
- Metadata per event includes:
  - Pipeline trace: which Phase A/B checks passed/failed, confidence sub-scores (media, sources, actors, geo, goldstein, cameo), final composite score
  - Original GDELT columns: raw fields we currently ignore (ActionGeo_Type, FeatureID, EventGeo_*, QuadClass, etc.)
  - Bellingcat match: flag + article title/URL if corroborated
  - Dispersion info: original centroid coords + dispersed coords + ring position
  - Any other audit-relevant data
- Two modes: `--fresh` triggers full backfill from WAR_START; default dumps from Redis cache
- Output to local JSON file (not deployed as API route)

### Claude's Discretion
- Exact ring angle offsets and event-to-slot assignment algorithm
- JSON output structure and field naming
- How to surface ActionGeo_Type in the existing pipeline (currently ignored column)
- Backfill sampling strategy for --fresh mode (may need more than 4 files/day for audit completeness)
- Bellingcat RSS feed URL discovery and polling interval

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/adapters/gdelt.ts`: Two-phase parseAndFilter pipeline, backfillEvents() with direct URL construction, 4-files/day sampling
- `server/lib/geoValidation.ts`: detectCentroid (42 cities at ±0.01°), isGeoValid cross-validation
- `server/lib/eventScoring.ts`: computeEventConfidence (6-signal composite), applyGoldsteinSanity
- `server/lib/newsMatching.ts`: temporal + geographic/keyword matching for news-event correlation — reusable for Bellingcat corroboration (with tighter params)
- `server/adapters/rss.ts`: RSS feed fetching with per-feed country tagging — extend for Bellingcat
- `server/lib/newsFilter.ts`: filterAndScoreArticles with relevance scoring — Bellingcat articles flow through this

### Established Patterns
- Adapter → route → Redis cache → Zustand store → polling hook (all data sources follow this)
- CacheEntry<T> with {data, fetchedAt} for staleness computation
- Config-driven thresholds via loadConfig() with safe defaults
- EXCLUDED_BASE_CODES set for CAMEO filtering
- Per-event confidence scoring with weighted signals

### Integration Points
- `server/adapters/gdelt.ts` parseAndFilter() — add ActionGeo_Type parsing, dispersion logic, pipeline trace metadata
- `server/routes/events.ts` — no changes needed if dispersion happens in adapter
- `server/adapters/rss.ts` RSS_FEEDS array — add Bellingcat entry
- `server/lib/eventScoring.ts` — add Bellingcat corroboration boost signal
- `server/config.ts` — add configurable thresholds for tuning
- New file: `scripts/audit-events.ts` — CLI audit script

</code_context>

<specifics>
## Specific Ideas

- Phase ordering within 22 should be: audit dump first → user reviews → tune filters → verify with tests
- "Keep it easy to read and structured" — audit JSON should have clear sections per event, not a flat blob
- Config-driven tuning means the user can iterate on thresholds without code changes or rebuilds

</specifics>

<deferred>
## Deferred Ideas

- Auto-audit cross-referencing (compare GDELT against Wikipedia conflict timeline, Bellingcat investigations automatically) — potential Phase 22.1
- GDELT BigQuery adapter for richer querying — deferred to v1.4
- Telegram/GramJS monitoring for OSINT early-warning — deferred to v1.4

</deferred>

---

*Phase: 22-gdelt-event-quality-osint-integration*
*Context gathered: 2026-04-01*
