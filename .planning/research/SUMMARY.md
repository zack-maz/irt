# Project Research Summary

**Project:** Iran Conflict Monitor v1.1 Intelligence Layer
**Domain:** OSINT real-time intelligence dashboard -- infrastructure overlay, news feed, notification center, oil markets tracker, global search
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

The v1.1 Intelligence Layer extends the validated v0.9/v1.0 OSINT monitoring dashboard with five features that transform it from a passive data display into an active intelligence tool. The existing architecture -- Express adapter/route pipelines feeding Zustand stores via recursive setTimeout polling, rendered through Deck.gl layers on a MapLibre basemap -- is sound and extensible. All five new features (key sites overlay, multi-source news feed, severity-scored notification center, oil markets tracker, global search bar) follow the established patterns exactly. Only two new npm dependencies are needed: `fast-xml-parser` for RSS parsing and `fuse.js` for fuzzy search, both zero-dependency and serverless-safe, adding a combined 116KB to the project.

The recommended approach is a strict dependency-driven build order: sites first (extends the MapEntity type system, enables proximity alerts), news second (infrastructure for notification matching, no UI), notification center third (the highest-value feature -- severity scoring plus proximity alerts plus news-event correlation), oil markets fourth (fully independent, follows proven patterns), and search/filter cleanup last (needs all stores to exist). This order is not arbitrary -- Phase 17 (notifications) depends on both Phase 15 (site positions for proximity) and Phase 16 (news items for headline matching). The critical path is 15 -> 16 -> 17, with Phase 18 parallelizable alongside 16.

The primary risks are: Overpass API timeouts on the large Middle East bounding box (mitigate by splitting queries per site type with staggered execution), Yahoo Finance unofficial endpoint instability (mitigate with provider interface pattern and graceful degradation), panel stacking/Escape key conflicts between the notification drawer and detail panel (mitigate with a centralized LIFO panel manager in uiStore), and the subtle `DEFAULT_EVENT_WINDOW_MS` constant that must be a module constant, never a store field, to avoid breaking the existing custom-range behavior. All four are well-understood with clear prevention strategies documented in the research.

## Key Findings

### Recommended Stack

The existing stack (React 19, TypeScript ~5.9.3, Vite 6, Zustand 5, Deck.gl 9, MapLibre GL 5, Tailwind CSS 4, Express 5, Upstash Redis) is unchanged. Two new production dependencies are needed:

**New dependencies:**

- **fast-xml-parser ^5.5.6**: Parse BBC and Al Jazeera RSS XML -- zero dependencies, 104KB, pure JS, serverless-safe, TypeScript types included
- **fuse.js ^7.1.0**: Client-side fuzzy search across all entity stores -- zero dependencies, 12KB, weighted multi-key search for ranking callsigns higher than location strings

**No dependency needed for:**

- Overpass API (direct fetch, same pattern as GDELT adapter)
- Yahoo Finance v8 chart endpoint (direct fetch with User-Agent header)
- GDELT DOC 2.0 API (returns JSON natively)
- Haversine distance (10-line inline function)
- SVG sparklines (20-line React component using `<polyline>`)
- Severity scoring (pure `Math.log()` formula)

**Key risk:** Yahoo Finance v8 chart API is unofficial (MEDIUM confidence). Graceful degradation (empty array on failure) is the required mitigation. The endpoint has been stable for years and does not require crumb authentication unlike the v7 quote endpoint that Yahoo locked down in April 2024.

### Expected Features

**Must have (table stakes):**

- Key infrastructure sites overlay (nuclear, military, oil, ports, dams, airbases) with per-type toggles and click-to-inspect
- Multi-source news feed (GDELT DOC + BBC RSS + Al Jazeera RSS) with conflict keyword filtering and URL deduplication
- Notification center with bell icon, unread badge, severity-scored event ranking, and 24h rolling window
- Oil markets tracker (Brent, WTI, XLE, USO, XOM) with 5-day sparklines and market-closed awareness
- Global search bar with Cmd+K shortcut, fuzzy matching across all entity types, grouped results, and fly-to-entity

**Should have (differentiators):**

- Proximity alerts (flight/ship within 50km of key site) with cooldown deduplication
- News-event correlation per notification card (temporal + geographic/keyword matching)
- Oil-conflict visual correlation (co-locate markets and events; user draws conclusions)
- Logarithmic severity scoring that compresses the long tail of media coverage

**Defer to v1.2+:**

- AI-generated situation briefs (Claude API)
- Historical replay / event timeline
- Trajectory arcs / flight path rendering
- Desktop push notifications
- Mobile-responsive layout
- Configurable severity weights

### Architecture Approach

All five features replicate the established pipeline: upstream API -> server adapter -> Express route -> Redis cache -> Zustand store -> polling hook -> UI component/Deck.gl layer. The project grows from 6 stores to 11, from 4 API routes to 8, and from 3 polling hooks to 6. The only structural type change is adding `SiteEntity` to the `MapEntity` discriminated union -- news items and market quotes are separate types that never flow through the entity pipeline. The notification center is the only cross-store consumer, reading from siteStore, newsStore, flightStore, and shipStore for proximity and headline matching.

**Major components:**

1. **Overpass adapter + siteStore** -- static infrastructure sites (24h cache), new IconLayer with 6 site-type icons
2. **News adapter + newsStore** -- merged GDELT DOC + RSS articles (15min cache), no standalone UI, consumed by notifications
3. **Notification route + notificationStore** -- server-side severity scoring, client-side proximity alerts, drawer panel with news-matched cards
4. **Yahoo Finance adapter + marketStore** -- 5 oil/energy symbols (60s cache), collapsible bottom-left panel with sparklines
5. **searchStore + SearchBarSlot** -- fuse.js fuzzy search across all entity stores, fly-to-entity on result click

### Critical Pitfalls

1. **Overpass API timeout on large bounding box** -- Split into 6 separate queries (one per site type) with 2s delays, use 48h hard cache TTL so a failed refresh still serves yesterday's data, add fallback to `overpass.kumi.systems`
2. **Yahoo Finance endpoint instability** -- Design with a `MarketDataProvider` interface for swappability, validate response shape before normalizing, return empty array (not error) on failure
3. **Panel stacking and Escape key conflicts** -- Implement centralized panel manager in uiStore with `panelStack: string[]` for LIFO Escape routing, define `--z-drawer: 25` in CSS custom property scale, use `--notification-drawer-offset` CSS variable for detail panel positioning
4. **DEFAULT_EVENT_WINDOW_MS breaking custom range** -- Must be a module-level constant in filterStore.ts, never set in any `set()` call, consumed only in useFilteredEntities as a filter predicate for events when `dateStart === null`
5. **useSelectedEntity missing site entities** -- Add siteStore as fourth store in the search chain with `sites` in the useMemo dependency array; write a regression test that selecting a site returns `isLost: false`
6. **Six polling hooks causing visibility resume stampede** -- Stagger resume fetches with random 0-2s delays, skip low-frequency sources (sites, markets when closed) on tab resume

## Implications for Roadmap

### Phase 15: Key Sites Overlay

**Rationale:** Must come first -- it is the only phase that extends the MapEntity type system, which is a structural change that ripples through useSelectedEntity, useEntityLayers, DetailPanelSlot, and all switch statements. Phase 17 depends on siteStore for proximity alerts.
**Delivers:** 6 site types on the map with per-type toggles, click-to-inspect detail panel, 24h cached Overpass data
**Addresses:** Key infrastructure overlay (table stakes), toggle panel structure
**Avoids:** Overpass timeout (#1) via split queries; useSelectedEntity gap (#5) via explicit siteStore wiring; switch statement gaps (#13) via dedicated site IconLayer; toggle overflow (#7) via overflow-y-auto stopgap
**Stack:** No new dependencies (direct fetch to Overpass API)

### Phase 16: News Feed

**Rationale:** Independent of Phase 15 (no code dependencies), but must precede Phase 17 (notification center needs newsStore for headline matching). Quick to build -- 1 adapter, 1 route, 1 store, 1 hook, zero UI.
**Delivers:** Server-side news pipeline merging GDELT DOC + BBC RSS + Al Jazeera RSS, deduplication, conflict keyword filtering
**Addresses:** Multi-source news feed (table stakes)
**Avoids:** RSS parsing fragility (#8) via per-feed try/catch and independent failure handling; GDELT stemming noise (#9) via theme: filters and pre-dedup noise filtering
**Stack:** fast-xml-parser (new dependency)

### Phase 17: Notification Center

**Rationale:** The highest-value feature in v1.1 -- transforms the dashboard from passive display to active intelligence. Depends on both Phase 15 (site positions for proximity alerts) and Phase 16 (news items for headline matching). Also introduces the 24h event default, a cross-cutting change best landed in one focused phase.
**Delivers:** Bell icon with unread badge, severity-scored notification drawer, proximity alerts (50km threshold), news-event correlation per card, 24h rolling event window default
**Addresses:** Notification center (table stakes), proximity alerts (differentiator), news-event correlation (differentiator)
**Avoids:** Panel stacking conflicts (#3) via centralized LIFO panel manager; DEFAULT_EVENT_WINDOW_MS regression (#4) via module constant pattern; proximity alert spam (#10) via per-entity cooldown and cluster grouping; news matching false positives (#14) via requiring both location AND keyword overlap
**Stack:** No new dependencies (haversine is inline, scoring is Math.log)

### Phase 18: Oil Markets Tracker

**Rationale:** Fully independent of Phases 15-17 -- no interaction with entity stores, layers, or other panels. Placed after notifications so panel layout patterns are proven. Follows the established store/polling/panel pattern exactly.
**Delivers:** 5 oil/energy ticker rows with price, % change, 5-day sparklines, market-closed state, collapsible bottom-left panel
**Addresses:** Oil markets tracker (table stakes), oil-conflict visual correlation (differentiator)
**Avoids:** Yahoo Finance instability (#2) via provider interface pattern and strict response validation; polling stampede (#6) via staggered resume; Redis budget (#12) via mget() for batch symbol reads; sparkline NaN (#15) via null filtering before SVG generation
**Stack:** No new dependencies (direct fetch, inline SVG sparkline)

### Phase 19: Search, Filter & UI Cleanup

**Rationale:** Cross-store search needs all entity stores to exist (Phases 15-18). UI cleanup (toggle overflow redesign, filter panel grouping, z-index audit) should assess the final state of all panels. This is the polish phase.
**Delivers:** Global search bar with Cmd+K, fuzzy matching across all types, fly-to-entity; filter panel redesign with grouped sections and Reset All; scrollable/collapsible layer toggles; minute granularity removal; StatusPanel extended to 6 feed lines
**Addresses:** Global search (table stakes), filter improvements (table stakes)
**Avoids:** Search index rebuild overhead (#11) via per-type Fuse instances and debounced rebuilds; Cmd+K conflicts (#17) via preventDefault and / as fallback; AppShell god component (#18) via PollingProvider extraction
**Stack:** fuse.js (new dependency)

### Phase 20: Production Review

**Rationale:** Verification-only, must be last. Full E2E test matrix covering all panel combinations, Vercel deployment validation, git tag v1.1.
**Delivers:** Production-ready v1.1 deployment
**Addresses:** All integration pitfalls surface in production testing
**Avoids:** Redis budget exhaustion (#12) via command audit; all accumulated integration edge cases

### Phase Ordering Rationale

- **Dependency-driven:** The critical path is 15 -> 16 -> 17. Notification center cannot be built without sites (proximity) and news (matching).
- **Type system first:** Phase 15 is the only phase that modifies the MapEntity discriminated union. Every subsequent phase benefits from the type system being settled.
- **Infrastructure before UI:** Phase 16 creates a data pipeline with no UI, keeping scope tight and testable. The UI consumers come in Phase 17.
- **Independent features are ordered, not blocked:** Phase 18 has zero code dependencies on 15-17 and could theoretically be built in any order, but placing it after notifications means panel layout and CSS offset patterns are proven.
- **Polish last:** Phase 19 audits the final layout and wires up cross-store search. Doing cleanup before all features exist means rework.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 17:** Notification center is the most complex phase (severity scoring formula tuning, panel coexistence CSS, proximity alert deduplication logic, 24h event window integration). Needs phase-level research for the panel manager pattern and proximity clustering algorithm.
- **Phase 18:** Yahoo Finance endpoint behavior needs validation at implementation time -- test from Vercel's IP range to confirm the v8 chart endpoint is accessible from serverless functions without crumb auth.

Phases with standard patterns (skip research-phase):

- **Phase 15:** Overpass API is well-documented (10+ year stability), and the adapter/store/layer pattern is identical to existing event handling. Split-query mitigation is straightforward.
- **Phase 16:** RSS parsing with fast-xml-parser is a solved problem. GDELT DOC API is from the same project already used for events. No novel patterns.
- **Phase 19:** fuse.js has comprehensive documentation. Search bar, filter grouping, and scrollable panels are standard UI patterns.
- **Phase 20:** Verification only, no research needed.

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                                                                                         |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | Only 2 new deps, both zero-dependency, well-established. Existing stack unchanged. Only Yahoo Finance (MEDIUM) as an unofficial API introduces uncertainty.                                                   |
| Features     | HIGH       | Feature set derived from approved design spec + competitor analysis (World Monitor). Clear table stakes / differentiator / anti-feature classification.                                                       |
| Architecture | HIGH       | Direct codebase analysis confirms all new features replicate existing adapter->route->store->hook->layer pattern. 5 new stores, 4 new routes, no structural changes beyond SiteEntity in MapEntity union.     |
| Pitfalls     | HIGH       | 18 pitfalls identified across 6 phases with concrete prevention strategies. Critical pitfalls (Overpass timeout, Yahoo instability, panel conflicts, event window regression) have multiple mitigations each. |

**Overall confidence:** HIGH

### Gaps to Address

- **Yahoo Finance accessibility from Vercel IPs:** The v8 chart endpoint works from development machines, but Vercel serverless function IPs may be blocked by Yahoo's automated traffic detection. Test during Phase 18 implementation; if blocked, fall back to `yahoo-finance2` npm package or Alpha Vantage free tier.
- **Overpass query execution time for the Middle East bbox:** The split-query-by-site-type mitigation is theoretically sound but has not been tested against the actual bbox. Execution time per query type needs measurement during Phase 15 to calibrate the stagger delay and timeout values.
- **Redis command budget headroom:** Current estimate is 461K/month out of 500K (8% headroom). Actual usage depends on flight source polling frequency (adsb.lol at 30s vs OpenSky at 5s vs ADS-B Exchange at 260s). Monitor during Phase 18 when the 6th polling source is added; upgrade to pay-as-you-go ($0.2/100K) if needed.
- **Proximity alert cluster grouping algorithm:** The 10km cluster radius and per-entity 30-minute cooldown are reasonable defaults but may need tuning based on actual site density in the Persian Gulf. Accept as a tuning exercise during Phase 17, not a design gap.
- **News-event matching quality:** The temporal (2h) + geographic/keyword overlap criteria will produce some false positives. Start with requiring BOTH location AND keyword overlap (not OR) and limit to 1 match per card. Expand to 3 matches only after validating quality in production.

## Sources

### Primary (HIGH confidence)

- Direct codebase analysis of all existing stores, routes, adapters, hooks, and components
- [Overpass API - OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [GDELT DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)
- [fast-xml-parser GitHub](https://github.com/NaturalIntelligence/fast-xml-parser)
- [Fuse.js Official Documentation](https://www.fusejs.io/)
- [Upstash Redis Pricing](https://upstash.com/docs/redis/overall/pricing)
- Approved design spec: `docs/superpowers/specs/2026-03-19-intelligence-layer-design.md`

### Secondary (MEDIUM confidence)

- [Yahoo Finance API Guide - AlgoTrading101](https://algotrading101.com/learn/yahoo-finance-api-guide/) -- v8 chart endpoint stability
- [yahoo-finance2 Crumb Issue #764](https://github.com/gadicc/yahoo-finance2/issues/764) -- crumb auth problems
- [Overpass API timeout for large queries](https://github.com/drolbr/Overpass-API/issues/389) -- bbox size constraints
- [World Monitor OSINT dashboard](https://github.com/MrB4nz4i/worldmonitor-osint) -- competitor feature analysis
- [Carbon Design System: Notification Pattern](https://carbondesignsystem.com/patterns/notification-pattern/) -- severity tiering

### Tertiary (LOW confidence)

- Yahoo Finance v8 chart endpoint long-term stability -- unofficial API with no SLA; needs runtime validation
- Proximity alert cluster grouping thresholds (10km radius, 30min cooldown) -- reasonable defaults, needs production tuning

---

_Research completed: 2026-03-19_
_Ready for roadmap: yes_
