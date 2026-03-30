# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.9 — MVP

**Shipped:** 2026-03-19
**Phases:** 13 | **Plans:** 25/28 | **Timeline:** 6 days

### What Was Built
- 2.5D intelligence map with 3D terrain covering Greater Middle East
- Multi-source flight tracking (OpenSky, ADS-B Exchange, adsb.lol)
- Ship tracking via AIS + GDELT v2 conflict events (11 CAMEO types)
- Zoom-responsive entity rendering with canvas icon atlas
- Layer toggles, hover tooltips, click-to-inspect detail panels
- Smart filters (country, speed, altitude, proximity, date range)
- Analytics counters dashboard with delta animations

### What Worked
- Recursive setTimeout polling pattern avoided race conditions across all data sources
- Adapter pattern for flight sources made adding adsb.lol trivial (shared V2 normalizer)
- Canvas icon atlas with mask mode enabled runtime color tinting without multiple PNGs
- Zustand curried store pattern provided excellent type inference
- Phase-per-feature branching kept changes isolated and reviewable
- Average plan execution of ~4.7 minutes kept momentum high

### What Was Inefficient
- 3 plans were superseded by later work (06-03, 08-02, 09-02) — features delivered through alternate phases but original plans never formally closed
- Roadmap plan checkboxes drifted from disk state (roadmap showed unchecked plans that had summaries on disk)
- ACLED was built in Phase 8 then immediately replaced by GDELT in Phase 8.1 — could have gone straight to GDELT
- Some phases had UAT gap closure plans that could have been caught earlier with stricter criteria

### Patterns Established
- Shared normalizer pattern for similar data sources (adsb-v2-normalize.ts)
- Tab visibility-aware polling (pause on hidden, immediate fetch on visible)
- Cache-first server routes to conserve API credits
- localStorage persistence with atomic key + try/catch guards
- Pure filter predicates: non-applicable filters include (not exclude)
- Lost contact tracking via useRef to survive store updates

### Key Lessons
1. Plan for data source pivots — building adapter abstractions early pays off when sources change (ACLED -> GDELT)
2. Keep roadmap state and disk state in sync — drifted checkboxes caused confusion during milestone completion
3. Free-tier APIs with no auth (adsb.lol, GDELT) provide better out-of-box experience than credentialed sources
4. Meter-based icon sizing with min/max pixel bounds is the right pattern for zoom-responsive maps

### Cost Observations
- 229 commits over 6 days
- ~2 hours total plan execution time
- Stable ~4-5min per plan throughout

---

## Milestone: v1.0 — Deployment

**Shipped:** 2026-03-20
**Phases:** 2 (13-14) | **Plans:** 6/6 | **Timeline:** 2 days

### What Was Built
- Upstash Redis cache replacing all in-memory caches for serverless compatibility
- AISStream on-demand connection model (connect-collect-close per request)
- GDELT backfill with lazy on-demand historical data loading
- Vercel deployment with serverless functions + CDN-served SPA
- Rate limiting and graceful config degradation

### What Worked
- CacheEntry<T> pattern with `{data, fetchedAt}` cleanly separated staleness logic from cache mechanics
- Ship merge/prune and events accumulator patterns preserved data across polling cycles in stateless serverless
- Lazy backfill with cooldown key avoided redundant GDELT historical downloads
- `createApp()` factory pattern made the Express app testable and Vercel-compatible simultaneously
- tsup bundling to CJS solved Vercel's module format requirements cleanly

### What Was Inefficient
- AISStream's on-demand model (connect, collect N ms, close) adds latency per request — a persistent WebSocket would be faster but incompatible with serverless
- Had to add graceful config fallbacks for every API key since Vercel env vars aren't always present during build

### Patterns Established
- Cache-first routes with hard Redis TTL = 10x logical TTL
- `loadConfig()` with safe defaults instead of throwing on missing env vars
- tsup for server bundling alongside Vite for frontend

### Key Lessons
1. Serverless means rethinking any persistent state — WebSocket connections, in-memory caches, and polling loops all need alternatives
2. Ship merge/prune is essential when cache is shared across requests — stale ships need active pruning
3. Separate build pipelines (Vite + tsup) are worth the complexity for correct module formats

---

## Milestone: v1.1 — Intelligence Layer

**Shipped:** 2026-03-22
**Phases:** 8 (15-19.2) | **Plans:** 22/22 | **Timeline:** 3 days

### What Was Built
- Key infrastructure sites (nuclear, naval, oil, airbase, desalination, port) from Overpass/OSM
- News aggregation (GDELT DOC + 5 RSS feeds) with Jaccard dedup/clustering
- Severity-scored notification center with proximity alerts and news matching
- Oil markets tracker (Brent, WTI, XLE, USO, XOM) with sparkline charts
- Tag-based search language (~25 prefixes) with bidirectional filter sync and autocomplete
- Counter entity dropdowns with fly-to and proximity sorting

### What Worked
- Overpass API with fallback mirror provided reliable infrastructure data at zero cost
- Jaccard similarity (0.8 threshold, 5-token min) was a pragmatic dedup strategy that avoided NLP complexity
- Severity scoring formula (typeWeight × log mentions × log sources × recencyDecay) produced intuitively correct rankings
- Bidirectional sync between search tags and sidebar toggles via `useQuerySync` kept two UI paths coherent
- Phase 19 combined search + filter + layout cleanup into one pass — reduced thrash from incremental UI changes

### What Was Inefficient
- RSS feed parsing required per-feed country tagging that could have been structured from the start
- The search query parser went through a full recursive descent AST which was overkill for implicit-OR evaluation — a simpler tag-list approach would have sufficed
- Proximity alert radius (50km) was a guess that hasn't been validated against real operational needs

### Patterns Established
- Discriminated union search AST with tag evaluators per entity type
- Proximity sorting by reference point per category (Tehran for flights, Strait of Hormuz for ships)
- Accordion expansion pattern for counter rows with fly-to wiring
- sourceCountry tagging on news articles for downstream filtering

### Key Lessons
1. Clustering before display is essential — without dedup, GDELT DOC returns dozens of near-identical articles
2. Bidirectional UI sync is fragile — `useQuerySync` needed careful memoization to avoid infinite update loops
3. Combining related UI changes into one phase (19) is better than spreading them across phases that each touch the same components
4. Yahoo Finance's unofficial API is unreliable — needs fallback strategy for production

---

## Milestone: v1.2 — Visualization & Hardening

**Shipped:** 2026-03-29
**Phases:** 7 (20-21.3) | **Plans:** 19/19 | **Timeline:** 7 days

### What Was Built
- Visualization layer architecture (geographic, weather, threat) independent from entity toggles
- Elevation tinting with contour lines, geographic feature labels
- Weather heatmap (bilinear interpolation on terrain) with wind barbs
- Threat density heatmap with compound weight formula
- NLP-based news relevance scoring replacing keyword whitelist
- GDELT event quality pipeline (geo-validation, confidence scoring, CAMEO 180/192 exclusion)
- Production hardening (Helmet CSP, rate limiting, structured logging, Redis fallback)
- Multi-user load testing (k6 501 VUs + Playwright 3 workers, 100% pass)

### What Worked
- Separating entity filters from visualization layers eliminated the confusion of "toggling off flights" vs "showing a weather overlay"
- Compound threat weight formula (type × mentions × sources × fatalities × Goldstein × decay) produced meaningful heatmaps without manual tuning
- Bilinear interpolation for weather heatmap produced smooth temperature gradients from sparse grid data
- GDELT event geo-validation against country polygons caught significant false positives (events geocoded to wrong countries)
- k6 + Playwright load testing gave both API throughput and real browser validation in one pass
- CAMEO base code exclusion list (180, 192) was the simplest effective filter for noisy event categories

### What Was Inefficient
- Phases 20.3-20.5 (political boundaries, satellite imagery, infrastructure focus) were planned but deferred — could have scoped v1.2 tighter from the start
- Weather overlay required a separate `/api/weather` endpoint and polling loop for data that updates slowly — could have been fetched less frequently
- NLP relevance scoring added the `compromise` library (~1MB) for marginal improvement over a well-tuned keyword filter
- Phase 21 (production hardening) was planned as one big phase but executed as 21 + 21.1 + 21.2 + 21.3 — should have been scoped as separate phases from the start

### Patterns Established
- Layer stacking order: weather → threat → entities (threat picks supersede weather)
- `EXCLUDED_BASE_CODES` set for filtering noisy CAMEO categories at the adapter level
- Composite confidence scoring with configurable threshold for event quality gating
- maplibre-contour for dynamic contour line generation from DEM tiles
- MapLibre image source with canvas rendering for custom heatmap overlays

### Key Lessons
1. Visualization layers and data filters are orthogonal concerns — mixing them confuses users and complicates code
2. GDELT data quality requires active filtering at multiple levels (CAMEO exclusion, geo-validation, confidence threshold, NumSources ≥ 2)
3. Production hardening should be continuous, not a final phase — CSP headers and rate limits are easier to add incrementally
4. Load testing early would have caught the rate limit configuration issues found in Phase 21 sooner
5. Deferred phases (20.3-20.5) show that not every planned feature needs to ship — scope pruning is healthy

---

## Cross-Milestone Trends

| Metric | v0.9 | v1.0 | v1.1 | v1.2 |
|--------|------|------|------|------|
| Phases | 13 | 2 | 8 | 7 |
| Plans | 25/28 | 6/6 | 22/22 | 19/19 |
| Days | 6 | 2 | 3 | 7 |
| LOC | 12,262 | 13,637 | 25,842 | ~30,000 |
| Commits | 229 | 35 | 146 | 129 |
| Tests | — | — | 851 | 958 |
