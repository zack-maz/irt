# Feature Landscape: v1.1 Intelligence Layer

**Domain:** OSINT conflict monitoring dashboard — infrastructure overlay, news feed, notification center, oil markets tracker, global search
**Researched:** 2026-03-19
**Prior milestone:** v0.9 MVP (flights, ships, events, filters, detail panel, counters)

---

## Table Stakes

Features that users of OSINT/intelligence dashboards expect. Missing any of these makes the v1.1 milestone feel incomplete relative to comparable tools.

### 1. Key Infrastructure Sites Overlay

| Feature                                             | Why Expected                                                                                                                                                                          | Complexity | Notes                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| Static site markers on map (nuclear, military, oil) | Every OSINT dashboard shows strategic infrastructure. World Monitor has 220+ military bases, nuclear facilities, ports. Without this the map lacks context for flight/ship movements. | Medium     | Overpass API is the correct source: free, no auth, comprehensive OSM data              |
| Distinct icon per site type (6 types)               | Visual differentiation is table stakes for any multi-layer map. Users need to distinguish nuclear from naval at a glance.                                                             | Low        | 6 icons: nuclear, oil, naval, airbase, dam, port. Match existing icon atlas pattern.   |
| Click-to-inspect on sites                           | Consistency with existing entity click behavior. Every map marker should be inspectable.                                                                                              | Low        | Reuses existing detail panel + `useSelectedEntity` hook pattern                        |
| Per-type toggle visibility                          | Users already have per-type toggles for flights, ships, 4 event categories. Sites need the same granularity.                                                                          | Medium     | Adds ~7 rows to LayerTogglesSlot (parent + 6 sub-toggles). Overflow becomes a problem. |
| 24h cache with lazy polling                         | OSM data changes slowly. Polling every 5s like flights would waste bandwidth and hit Overpass rate limits.                                                                            | Low        | Redis 24h TTL, fetch once at startup, matches design spec                              |

**Integration dependencies:**

- Extends `MapEntity` discriminated union with `'site'` type
- Extends `useSelectedEntity` to search new `siteStore`
- Extends `useEntityLayers` with new `IconLayer` for sites
- Extends `LayerTogglesSlot` with site toggle rows (triggers overflow issue)

### 2. Multi-Source News Feed

| Feature                                     | Why Expected                                                                                                                                                                                  | Complexity | Notes                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Aggregated news from 2+ sources             | Single-source feeds miss coverage. GDELT DOC + BBC RSS + Al Jazeera RSS gives breadth (GDELT: 65-language machine-translated global coverage; BBC/AJ: editorial quality, regional authority). | Medium     | Server-side merge, deduplicate by URL, sort by timestamp                                                               |
| Conflict relevance filtering                | Raw feeds are noisy. A Middle East RSS includes sports, culture, weather. Must filter to conflict-relevant titles.                                                                            | Medium     | Keyword whitelist (Iran, Iraq, Israel, Syria, Gaza, airstrike, missile, military, etc.) applied to title + description |
| Time-sorted article list                    | Recency is critical in conflict monitoring. Most recent first.                                                                                                                                | Low        | Sort by `publishedAt` descending                                                                                       |
| URL deduplication                           | Same story appears in multiple sources. Showing duplicates wastes attention.                                                                                                                  | Low        | Hash article URL for dedup key                                                                                         |
| No standalone UI (feeds into notifications) | The news feed is infrastructure for the notification center. A standalone news ticker contradicts "numbers over narratives".                                                                  | Low        | `newsStore` holds data; Phase 17 notification drawer consumes it                                                       |

**Integration dependencies:**

- New `newsStore.ts` Zustand store (follows existing store pattern)
- New `useNewsPolling` hook (15min recursive setTimeout)
- New `/api/news` endpoint with Redis 15min cache
- Consumed by notification center in Phase 17 (not rendered directly)

### 3. Notification Center with Severity Scoring

| Feature                                 | Why Expected                                                                                                                                  | Complexity | Notes                                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Bell icon with unread badge             | Universal notification pattern. Users need a persistent visual cue for new events without cluttering the map.                                 | Low        | Top-right, red unread count, resets on drawer open                                                                                            |
| Severity-scored event ranking           | Not all events are equal. An airstrike with 50 media mentions outranks a minor border skirmish. Without scoring, the user drowns in noise.    | High       | `score = type_weight * log(1+mentions) * log(1+sources) * recency_decay`. 11 type weights, 5 recency tiers.                                   |
| Notification drawer (360px right panel) | Dedicated space for prioritized alerts. Must coexist with existing detail panel.                                                              | Medium     | Panel stacking: drawer pushes detail panel left via CSS offset. LIFO Escape key dismiss.                                                      |
| News headline matching per event        | Linking GDELT events to actual news articles bridges "what happened" (data) with "what's being reported" (context). Key intelligence pattern. | High       | Match by temporal proximity (2h) + geographic/keyword overlap. 1-3 headlines per card.                                                        |
| Proximity alerts (entity near key site) | The whole point of showing infrastructure sites AND moving entities. Flight approaching a nuclear site at low altitude is high-signal.        | High       | Client-side haversine distance, 50km threshold, 30min cooldown per site+entity pair                                                           |
| 24h rolling event window default        | Without a default window, every GDELT event since WAR_START shows up. This drowns the signal in weeks of accumulated noise.                   | Medium     | `DEFAULT_EVENT_WINDOW_MS` constant (86,400,000ms). Applied as soft lower bound when `dateStart === null`. Does NOT trigger custom-range mode. |

**Integration dependencies:**

- Depends on Phase 15 (sites for proximity alerts) and Phase 16 (news for headline matching)
- Extends `uiStore` with `isNotificationDrawerOpen` state
- Extends `filterStore` with `DEFAULT_EVENT_WINDOW_MS` constant
- Modifies `useEntityLayers` to apply 24h window when `dateStart` is null
- Modifies `DetailPanelSlot` to respect `--notification-drawer-offset` when both panels open

### 4. Oil Markets Tracker

| Feature                                   | Why Expected                                                                                                                                                                 | Complexity | Notes                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Brent + WTI crude prices                  | Oil prices are the primary economic indicator for Middle East conflict escalation. A monitoring dashboard without oil prices is missing the most obvious correlation signal. | Medium     | Yahoo Finance unofficial API: free, no auth, real-time quotes                                  |
| 5-day sparkline per instrument            | Price alone is not enough. Trend direction (rising/falling/flat) over a few days gives context for whether current conflict is moving markets.                               | Medium     | SVG `<polyline>` in a 60x20px viewport. No dependency needed (hand-roll with `<svg>` element). |
| Color-coded % change (green up, red down) | Instant visual signal for market direction. Universal financial UX convention.                                                                                               | Low        | Ternary on `changePct` sign                                                                    |
| 5 instruments (BZ=F, CL=F, XLE, USO, XOM) | Brent (international benchmark, most Middle East sensitive), WTI (US benchmark), XLE (sector ETF), USO (oil fund), XOM (company proxy). Covers the oil exposure spectrum.    | Low        | Parallel fetch, single endpoint                                                                |
| Market closed state                       | Oil futures don't trade 24/7. Showing stale prices without context misleads.                                                                                                 | Low        | `marketOpen: boolean` flag, dim UI state with "Markets closed" label                           |
| Collapsible overlay panel                 | Matches existing CountersSlot and LayerTogglesSlot pattern. User can hide if not interested.                                                                                 | Low        | Reuse `OverlayPanel` component, bottom-left position                                           |

**Integration dependencies:**

- New `marketStore.ts` Zustand store
- New `useMarketPolling` hook (60s, hourly when markets closed)
- New `/api/markets` endpoint with Redis 60s cache
- New `MarketsPanelSlot` component in AppShell
- New `SparklineChart` SVG component (no external charting library)
- Independent of all other v1.1 features (can be built in any order)

### 5. Global Search Bar

| Feature                                | Why Expected                                                                                                                                                                                | Complexity | Notes                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cmd+K / Ctrl+K shortcut to focus       | Command palette pattern is now standard (VS Code, Slack, Notion, PowerToys, WordPress). Users expect keyboard-first search in power-user tools.                                             | Low        | `useEffect` with `keydown` listener                                                                                                                   |
| Fuzzy matching across all entity types | Heterogeneous search (flights by callsign, ships by MMSI/name, events by location, sites by name) from one input. Without this, finding a specific entity means scrolling/scanning the map. | Medium     | Fuse.js is the right choice: weighted multi-field search, proven at scale, 28KB gzipped. microfuzz is too lightweight for multi-type weighted search. |
| Results grouped by entity type         | Users need to know what they found. A flat list of mixed types is confusing. Group headers (Flights, Ships, Events, Sites) with counts.                                                     | Low        | Group by `entity.type` in results dropdown                                                                                                            |
| Click result: fly-to + select entity   | The purpose of search is navigation. Finding an entity should take you there and open its detail panel.                                                                                     | Medium     | Map `flyTo()` + `selectEntity()` + `openDetailPanel()`                                                                                                |
| Floating position, top-center          | Standard placement for global search in map applications. Non-obstructive when collapsed, prominent when active.                                                                            | Low        | Absolute positioned, z-index above map controls                                                                                                       |

**Integration dependencies:**

- Reads from all entity stores (flightStore, shipStore, eventStore, siteStore)
- New `searchStore.ts` for query state and results
- Triggers `selectEntity` + map `flyTo` on result click
- Requires map ref access for `flyTo` (available via `useMap` hook from react-maplibre)

### 6. Filter Panel Improvements

| Feature                                               | Why Expected                                                                                                      | Complexity | Notes                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| Reset All button                                      | With 7+ active filters, clearing them one by one is tedious. Every filter panel needs a "clear all" escape hatch. | Low        | Calls `filterStore.clearAll()`                                        |
| Grouped sections (Flights, Ships, Events, Date Range) | Current flat list of filters becomes unwieldy as filter count grows. Logical grouping reduces cognitive load.     | Medium     | Collapsible sections with headers, collapse empty/inactive by default |
| Remove Minute granularity from date slider            | Minute-level precision on a conflict timeline is false precision. GDELT data is 15-min granularity at best.       | Low        | Remove `minute` from `STEP_MS` record and granularity toggle          |
| Scrollable/collapsible layer toggles panel            | Phase 15 adds ~7 site toggle rows, bringing total to ~15. This overflows at minimum viewport heights.             | Medium     | `max-height` with `overflow-y: auto` or collapsible category sections |

**Integration dependencies:**

- Modifies existing `FilterPanelSlot` and `LayerTogglesSlot`
- Modifies `filterStore` (remove minute granularity, verify clearAll)
- No new stores or endpoints

---

## Differentiators

Features that set this apart from generic OSINT dashboards. Not expected, but valued.

| Feature                                      | Value Proposition                                                                                                                                                                                                                                                | Complexity | Notes                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| Proximity alerts with severity scoring       | World Monitor has geographic convergence scoring, but requires 3+ event types co-occurring. This app's simpler "entity within 50km of key site" threshold is faster to trigger and more tactically relevant for a single-conflict monitor.                       | High       | Client-side haversine, 30min cooldown dedup. Unique to this tool's single-theater focus.                |
| News-event correlation per notification card | Linking a GDELT conflict event to 1-3 BBC/AJ headlines in the same notification card provides both the "what" (quantitative event) and "why" (journalistic context) without abandoning the numbers-first philosophy.                                             | High       | Time-window matching (2h) + geo/keyword overlap. Rare in OSINT dashboards.                              |
| Oil-conflict correlation signal              | Most OSINT dashboards show either geopolitical data OR financial data, not both in the same view. Juxtaposing oil prices with conflict events lets the user visually correlate market reactions to strikes/escalation.                                           | Medium     | No automated correlation (anti-feature). The value is in co-location: user draws their own conclusions. |
| Logarithmic severity scoring                 | The `log(1+NumMentions) * log(1+NumSources)` formula compresses the long tail of media coverage. A story with 500 mentions doesn't score 50x higher than one with 10 mentions — it scores ~2.7x higher. This prevents viral-but-trivial stories from dominating. | Low        | Pure math, server-side. Well-calibrated signal extraction.                                              |
| Markets-closed awareness                     | Showing "Markets closed" with dimmed sparklines on weekends prevents misinterpretation of stale prices. Most amateur dashboards show last known price with no temporal context.                                                                                  | Low        | `marketOpen` flag from Yahoo Finance response                                                           |

---

## Anti-Features

Features to explicitly NOT build in v1.1. Each has a concrete reason.

| Anti-Feature                               | Why Avoid                                                                                                                                                                                                   | What to Do Instead                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Standalone news ticker/feed panel          | Contradicts "numbers over narratives" core value. A scrolling news feed invites the user to read articles instead of monitoring data. The original v0.9 research explicitly listed this as an anti-feature. | News exists only as metadata within notification cards. No dedicated news panel.       |
| AI-generated situation briefs (Claude API) | Deferred to v1.2 per design spec. Adds API cost, latency, and hallucination risk. Not needed for v1.1 core value.                                                                                           | Manual interpretation by user. The data speaks for itself.                             |
| Automated push/desktop notifications       | User actively monitors the dashboard. Background notifications create false urgency and alert fatigue. The in-app bell icon is sufficient.                                                                  | In-app notification drawer with unread badge. User pulls alerts on their own schedule. |
| Automated oil-conflict correlation         | "Brent spiked 3% because of the Isfahan airstrike" is speculation without classified data. Causal claims from public data are unreliable.                                                                   | Co-locate oil panel and conflict events. User draws correlations visually.             |
| Real-time oil price streaming (WebSocket)  | Yahoo Finance provides REST-only data. WebSocket alternatives (Finnhub, Polygon) require paid tiers. 60s polling is more than adequate for oil prices.                                                      | 60s polling via `/api/markets` with Redis cache                                        |
| Full-text article search                   | Searching within article bodies requires content ingestion/indexing. The news feed only stores title + URL + metadata. Full-text search is a different product (news aggregator).                           | Search by entity attributes only (callsign, MMSI, site name, event location)           |
| Mobile-responsive layout                   | Desktop monitoring tool. Responsive layout for 5 overlay panels + map is extremely complex and low-value for a single-user tool.                                                                            | Minimum 1280px viewport width. No mobile breakpoints.                                  |
| Persistent notification history            | Storing months of scored notifications adds database complexity. The rolling 24h window covers the active monitoring use case.                                                                              | 24h rolling window. Older events age out via recency decay.                            |
| Configurable severity weights              | Exposing 11 type weights + 5 recency tiers as user-configurable settings adds UI complexity for marginal value. Single-user tool; the developer tunes weights directly.                                     | Hardcoded weights in `server/routes/notifications.ts`. Adjust in code if needed.       |
| Multiple map style themes                  | Dark theme is the only appropriate style for a monitoring dashboard used in extended sessions. Light theme adds maintenance cost.                                                                           | Single CARTO Dark Matter basemap.                                                      |

---

## Feature Dependencies

```
Phase 15: Key Sites Overlay
  ├── SiteEntity type (extends MapEntity union)
  ├── siteStore (new Zustand store)
  ├── /api/sites endpoint (Overpass API + Redis 24h cache)
  ├── Site IconLayer in BaseMap
  ├── SiteDetail in DetailPanelSlot
  └── Site toggles in LayerTogglesSlot (triggers overflow)

Phase 16: News Feed
  ├── /api/news endpoint (GDELT DOC + BBC RSS + AJ RSS + Redis 15min cache)
  ├── newsStore (new Zustand store)
  └── useNewsPolling hook (no UI — consumed by Phase 17)

Phase 17: Notification Center  [depends on Phase 15 + 16]
  ├── /api/notifications endpoint (severity scoring)
  ├── notificationStore (new Zustand store)
  ├── Proximity alerts (client-side, needs siteStore from P15)
  ├── News matching (needs newsStore from P16)
  ├── Bell icon + notification drawer UI
  ├── DEFAULT_EVENT_WINDOW_MS constant in filterStore
  └── Panel coexistence with DetailPanelSlot

Phase 18: Oil Markets Tracker  [independent]
  ├── /api/markets endpoint (Yahoo Finance + Redis 60s cache)
  ├── marketStore (new Zustand store)
  ├── useMarketPolling hook
  ├── MarketsPanelSlot (OverlayPanel, bottom-left)
  └── SparklineChart (SVG component)

Phase 19: Search, Filter & UI Cleanup  [depends on all stores existing]
  ├── Global search bar (reads all 5+ stores)
  ├── searchStore (new Zustand store)
  ├── Filter panel redesign (grouped sections, Reset All)
  ├── LayerTogglesSlot overflow fix (scrollable/collapsible)
  ├── Remove Minute granularity
  └── Layout audit (z-index, spacing, 1280px min)

Phase 20: Layer Purpose Refactor  [depends on Phase 19]
  └── TBD — rethink layer toggle purposes and organization

Phase 21: Production Review  [depends on all above]
  └── E2E verification + Vercel deploy + git tag v1.2
```

**Critical path:** Phase 15 -> Phase 16 -> Phase 17 (notification center needs both sites and news).
**Parallel track:** Phase 18 (oil markets) is fully independent and can be built alongside Phase 16.
**Cleanup last:** Phase 19 must follow all feature phases because search needs all stores to exist.

---

## MVP Recommendation

For the v1.1 Intelligence Layer, prioritize in this order:

1. **Key Sites Overlay (P15)** — Foundational. Every subsequent feature benefits from infrastructure context on the map. Proximity alerts (P17) are useless without sites.

2. **News Feed (P16)** — Infrastructure for notifications. No standalone UI, so low risk of scope creep. Must exist before notification center.

3. **Notification Center (P17)** — The highest-value new feature. Severity scoring + proximity alerts + news matching transforms the dashboard from passive display to active intelligence. This is the feature that differentiates v1.1 from v0.9.

4. **Oil Markets Tracker (P18)** — Independent, moderate value. Builds quickly because it follows the established store/polling/panel pattern. Co-locating oil prices with conflict data is a genuine differentiator.

5. **Search, Filter & UI Cleanup (P19)** — Polish phase. Should NOT be started until P15-P18 are stable. Global search is meaningless with only 3 entity types; it becomes valuable only with 5+ (flights, ships, events, sites, plus news/notifications as secondary hits).

**Defer to v1.2:**

- AI situation briefs (Claude API integration)
- Historical replay / event timeline
- Trajectory arcs / flight path rendering
- Force posture overlays (carrier groups, air defense zones)

---

## Complexity Budget

| Phase              | New Files | Modified Files | New Store         | New Endpoint       | Estimated LOC | Risk                                                                |
| ------------------ | --------- | -------------- | ----------------- | ------------------ | ------------- | ------------------------------------------------------------------- |
| P15: Key Sites     | ~5        | ~8             | siteStore         | /api/sites         | ~600          | Low — follows existing patterns exactly                             |
| P16: News Feed     | ~4        | ~2             | newsStore         | /api/news          | ~400          | Medium — RSS parsing, GDELT DOC API reliability                     |
| P17: Notifications | ~4        | ~5             | notificationStore | /api/notifications | ~800          | High — severity scoring tuning, panel coexistence, proximity alerts |
| P18: Oil Markets   | ~6        | ~2             | marketStore       | /api/markets       | ~500          | Medium — Yahoo Finance API stability (unofficial)                   |
| P19: Search/UI     | ~3        | ~6             | searchStore       | none               | ~500          | Medium — Fuse.js integration, layout overflow fixes                 |
| P20: Deploy        | 0         | 0              | none              | none               | ~0            | Low — verification only                                             |
| **Total**          | **~22**   | **~23**        | **4 new**         | **4 new**          | **~2800**     |                                                                     |

---

## Sources

- [OpenStreetMap Key:military wiki](https://wiki.openstreetmap.org/wiki/Key:military) — OSM military tag documentation
- [Overpass API wiki](https://wiki.openstreetmap.org/wiki/Overpass_API) — Overpass API documentation and rate limits
- [Security Force Monitor: OSM for military locations](https://securityforcemonitor.org/2018/07/06/openstreetmap-is-sometimes-a-handy-database-of-national-security-locations-heres-how-to-see-them/) — Patterns for querying military infrastructure from OSM
- [GDELT DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) — DOC API parameters, modes, response format
- [GDELT Hybrid Relevance Mode](https://blog.gdeltproject.org/new-hybrid-relevance-mode-for-doc-2-0-api/) — News ranking improvements
- [World Monitor OSINT dashboard](https://github.com/MrB4nz4i/worldmonitor-osint) — Competitor analysis: 35+ layers, 220+ military bases, deck.gl + MapLibre stack
- [Smashing Magazine: Notification UX Guidelines](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/) — Severity tiering, alert fatigue prevention
- [Smashing Magazine: Real-Time Dashboard UX](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/) — Information hierarchy, sparklines, visual feedback patterns
- [NN/g: Alert Fatigue in User Interfaces](https://www.nngroup.com/videos/alert-fatigue-user-interfaces/) — Why notification centers need scoring/filtering
- [Carbon Design System: Notification Pattern](https://carbondesignsystem.com/patterns/notification-pattern/) — High/medium/low severity tiering, panel design
- [Signal Detection Theory in UX](https://www.ux-bulletin.com/signal-detection-theory-in-ux/) — Balancing alert signal vs noise
- [Fuse.js documentation](https://www.fusejs.io/) — Fuzzy search library for weighted multi-field search
- [microfuzz](https://github.com/Nozbe/microfuzz) — Lightweight alternative (rejected: insufficient for multi-type weighted search)
- [Command Palette UX Patterns](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1) — Cmd+K shortcut, modal overlay, keyboard-first interaction
- [UX Patterns: Command Palette](https://uxpatterns.dev/patterns/advanced/command-palette) — Dashboard search best practices
- [Search UX Best Practices 2026](https://www.designmonks.co/blog/search-ux-best-practices) — Fuzzy matching, grouped results, highlighted keywords
- [DEV: Sparkline component in React](https://dev.to/gnykka/how-to-create-a-sparkline-component-in-react-4e1) — Dependency-free SVG sparkline pattern
- [react-sparklines](https://github.com/borisyankov/react-sparklines) — Considered but rejected (adds dependency for trivial SVG)
- [rss-parser npm](https://www.npmjs.com/package/rss-parser) — RSS feed parsing for BBC/AJ feeds
- [yahoo-finance2](https://github.com/gadicc/yahoo-finance2) — Unofficial Yahoo Finance API (considered but raw fetch is simpler for 1 endpoint)
- [Overpass API rate limits](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) — Slot-based rate limiting, 180s default timeout
