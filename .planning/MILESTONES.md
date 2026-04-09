# Milestones

## v1.3 Data Quality & Layers (Shipped: 2026-04-09)

**Phases completed:** 11 phases, 36 plans, 77 tasks

**Key accomplishments:**

- Concentric ring dispersion for stacked centroid events, config-driven filter thresholds, and pipeline audit types for the GDELT event pipeline
- Bellingcat RSS as 6th news source with three-gate corroboration boost (+0.2 confidence) wired into the GDELT event pipeline end-to-end
- CLI event audit dump with full pipeline trace and fixture-based regression tests locking 3 true positive and 5 false positive GDELT event behaviors
- Relocated disperseEvents from per-batch parseAndFilter to single-pass post-merge in events route, with shared CENTROID_TOLERANCE constant
- Ref-guarded camera fly-to in useQuerySync prevents re-centering when editing non-near: search terms
- 8-stop FLIR Ironbow thermal palette with P90 normalization, no temporal decay, 0.25-degree grid, and eventIds tracking for cluster detail panel
- BFS connected-component clustering on threat grid with click-through detail panel showing cluster header, scrollable event list, and fly-to-event drill-down
- PanelView type, navigation stack store actions with mutual-exclusion bypass, CSS slide animations, and shared breadcrumb label helper
- Radial gradient shader extension with 4-stop thermal palette, additive blending, pixel-based spread encoding, zoom-dependent z-order, and hover dimming for threat cluster circles
- Nominatim reverse geocoding with Redis caching, event type breakdown bars, geographic context, and weight-sorted event lists in ThreatClusterDetail
- PoliticalOverlay component with faction-colored country fills, disputed territory hatching, hover labels, and discrete legend using Natural Earth static GeoJSON
- GeoEPR-2021 ethnic boundary extraction producing 139KB GeoJSON with 9 groups + 23 overlap zones, plus ethnicGroups.ts 10-group config and @deck.gl/extensions installed
- Backfilled during v1.3 milestone audit cleanup (2026-04-09). Plan 02 was executed but SUMMARY.md was never written at the time. This backfill is derived from the plan spec, git history (commit `83d355b feat(25-02)` + follow-up `f9b961e fix(25)`), and the current codebase state.
- Water stress types, color interpolation utility, and static data files from WRI Aqueduct 4.0 and Natural Earth 10m rivers
- Surgical removal of desalination from SiteType union, Overpass adapter, and all client UI (toggles, counters, labels, icons) -- preparing for re-addition under Water layer in Plan 03
- Overpass water adapter (5 facility types), country-centroid basin stress lookup, Open-Meteo 30-day precipitation adapter, and /api/water routes with Redis caching
- Zustand water store with precipitation merge, one-time facility fetch + 6h precip polling hooks, and deck.gl river lines / facility icons with stress-based color tinting
- Full water layer integration: detail panel, counters, search, proximity alerts, legend, and toggle UI wired across all app systems
- Fixed water facility visibility (dark-purple color floor + 30s API timeout) and river stress differentiation (per-river compositeHealth + wider lines)
- Tiered Overpass queries with treatment_plant support, priority-country notability filtering, Vercel cron daily cache refresh, and 7-day Redis TTL
- Expanded water stress to 0-10 scale with Destroyed state and added 4 canvas icons (dam, reservoir, treatment, desalination) to 544px atlas
- Type-specific water facility icons (dam/reservoir/treatment/desalination) with destroyed-state blackout from GDELT events, plus desalination coverage audit and test fixes
- Deleted 6 Phase 26.2 NLP files, surgically reverted 6 modified files to pre-26.2 state, and cleaned up unused imports for zero-error server compilation
- Pino structured logger replacing console.log/error across 21 server modules, with X-Request-ID tracing on every HTTP response
- Zod-validated server config with single config.ts source of truth and validateQuery middleware on all 7 API routes
- AppError class with consistent { error, code, statusCode, requestId } JSON envelope, gzip compression for local dev, and SIGTERM graceful shutdown
- Enabled `noUncheckedIndexedAccess` on server, cleared ~124 accumulated TypeScript errors across the codebase, documented every per-endpoint rate limiter with JSDoc rationale, and published a 1164-line hand-written OpenAPI 3.0.3 spec for all 14 API endpoints.
- Installed @vitest/coverage-v8 with V8 provider, pinned coverage thresholds at the current baseline as a regression ratchet, confirmed zero it.todo() stubs remain anywhere in src/ or server/, and auto-fixed six pre-existing test/source drift bugs to leave the full 1241-test suite green with coverage reporting on every run.
- Installed Prettier 3 + knip 5, formatted 600+ files, removed all pre-existing lint errors, deleted 3 dead source files + 2 dead dependencies + 7 dead exports, and added an .env.example drift checker that will keep 18 env keys honest going forward.
- Wired GitHub Actions CI (lint + test + coverage + audit) and CodeQL security analysis, installed husky + lint-staged + gitleaks for a sub-2s pre-commit ratchet, and verified the secret-scanning hook catches planted AWS keys before they reach the staging area.
- Pino redaction for secrets, type-coverage CI gate at 97% baseline, Redis-death chaos test with a 2000ms cache-op timeout to close the graceful-degradation gap, and zod sendValidated response helper wired into flights/events/water routes.
- README rewritten as a 564-line portfolio-grade hero document with a 1354 KB Playwright-captured hero GIF, 6 layer screenshots, a globally-wired public rate-limit tier (6 req/min per-IP), and public/robots.txt — all produced by a permanent agentic capture script (`npm run capture:hero`) that survives UI changes and replaces manual screen recording.
- 10 markdown files under `docs/architecture/` documenting system context, per-source data flows, frontend composition, Vercel deployment, and a four-file ontology deep dive — 21 Mermaid diagrams total, all rendering natively on GitHub, reflecting the as-built system with TODO(26.2) tech debt labeled inline.
- 12 new markdown files totaling 2672 lines — an 8-ADR Nygard short-format decision record, a 676-line SRE-style operations runbook with 9 real failure modes, a 303-line layered graceful degradation contract, and README.md updated with an Engineering Documentation subsection plus an ADR-0005 highlight in the retrospective section. ADR-0005 (Phase 26.2 NLP scrap) is the highest-portfolio-signal artifact in this phase at 300 lines of honest retrospective.

---

## v0.9 MVP (Shipped: 2026-03-19)

**Phases:** 13 (1-12 + 8.1) | **Plans:** 25/28 complete | **Commits:** 229
**Lines of code:** 12,262 TypeScript/CSS | **Timeline:** 6 days (2026-03-13 → 2026-03-18)
**Git range:** c4d3055..9238f98

**Key accomplishments:**

1. Interactive 2.5D dark map with 3D terrain, pan/zoom/rotate (Deck.gl + MapLibre + AWS Terrarium DEM)
2. Multi-source flight tracking (OpenSky, ADS-B Exchange, adsb.lol) with tab-aware recursive polling
3. Ship tracking (AIS) + GDELT v2 conflict event data with CAMEO classification and 11 event types
4. Entity rendering with zoom-responsive icons, hover tooltips, and click-to-inspect detail panel
5. Smart filters (country, speed, altitude, proximity, date range) with proximity circle visualization
6. Analytics counters dashboard with visibility-aware counts and delta animations

### Known Gaps

3 plans were not formally executed (features delivered through alternate phases):

- **06-03**: SourceSelector UI dropdown — superseded by StatusPanel HUD (Phase 8)
- **08-02**: HUD status panel — delivered as part of Phase 8 execution
- **09-02**: LayerTogglesSlot UI panel — delivered as part of Phase 9 execution

---

## v1.0 Deployment (Shipped: 2026-03-20)

**Phases:** 2 (13-14) | **Plans:** 6/6 complete | **Commits:** 35
**Lines of code:** 13,637 TypeScript/CSS | **Timeline:** 2 days (2026-03-19 → 2026-03-20)
**Git range:** 266d6cb..b5e37dd

**Key accomplishments:**

1. Upstash Redis cache replacing all in-memory caches for serverless compatibility
2. AISStream on-demand connection model (connect-collect-close per request)
3. GDELT backfill with lazy on-demand historical data loading
4. Vercel deployment with serverless functions + CDN-served SPA
5. Rate limiting and graceful degradation for missing API keys

---

## v1.1 Intelligence Layer (Shipped: 2026-03-22)

**Phases:** 8 (15-19.2) | **Tests:** 851 passing | **Commits:** 146
**Lines of code:** 25,842 TypeScript/CSS | **Timeline:** 3 days (2026-03-20 → 2026-03-22)
**Git range:** b97baf3..932358a

**Key accomplishments:**

1. Key infrastructure sites overlay (nuclear, naval, oil, airbase, desalination, port) from Overpass/OSM with attack status detection
2. News feed aggregation (GDELT DOC + 5 RSS feeds) with Jaccard dedup/clustering
3. Severity-scored notification center with proximity alerts (50km) and news headline matching
4. Oil markets tracker (Brent, WTI, XLE, USO, XOM) with sparkline charts and delta animations
5. Tag-based search language (~25 prefixes) with bidirectional filter sync and autocomplete
6. Counter entity dropdowns with fly-to and proximity sorting
7. All 29 v1.1 requirements complete

---

## v1.2 Visualization & Hardening (Shipped: 2026-03-29)

**Phases:** 7 (20-21.3) | **Tests:** 958 passing | **Commits:** 129
**Lines of code:** ~30,000 TypeScript/CSS | **Timeline:** 7 days (2026-03-23 → 2026-03-29)
**Git range:** b5c0df9..0bd040e

**Key accomplishments:**

1. Visualization layer architecture (geographic elevation/contour, weather heatmap/wind barbs, threat density heatmap)
2. GDELT news relevance filtering with NLP-based scoring (replacing keyword whitelist)
3. GDELT event quality pipeline (geo-validation, composite confidence scoring, CAMEO 180/192 exclusion)
4. Production hardening (Helmet CSP, per-endpoint rate limiting, structured logging, Redis fallback)
5. Multi-user load testing (k6 501 VUs + Playwright 3 workers, 100% pass rate, p95 153ms)

---
