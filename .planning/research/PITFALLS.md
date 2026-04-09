# Domain Pitfalls: v1.1 Intelligence Layer

**Domain:** Adding infrastructure overlays, news feeds, notification center, market data, and search/filter to an existing real-time map monitoring application
**Researched:** 2026-03-19
**Context:** Existing app has 3 entity types, 3 polling hooks, 6 stores, 8 Deck.gl layers, 5 overlay panels, and a 5-level z-index scale

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or major UX breakage.

### Pitfall 1: Overpass API Timeout on Large Bounding Box Queries

**What goes wrong:** The IRAN_BBOX covers a massive area (15-42N, 30-70E) -- roughly 3000km x 4000km. Overpass API queries for multiple tag types (`military=*`, `man_made=petroleum_well`, `waterway=dam`, `harbour=yes`) across this region can easily exceed the default 180-second server timeout and hit memory limits (512 MiB default). The query either times out silently (returning partial results) or returns a 429 rate limit error. Since the app only fetches once per 24h, a failed initial fetch means a blank sites layer for an entire day.

**Why it happens:** Overpass queries scan the full OSM database within the bounding box. Combining multiple tag filters via `union` (`;`) multiplies the scan work. The Greater Middle East bbox contains dense OSM data for Turkey, Israel, and the Gulf states. The public Overpass server limits concurrent queries per IP and applies rate limiting after query execution (wasting the compute even on rejected requests).

**Consequences:** Sites layer shows nothing. No proximity alerts fire (Phase 17 depends on site positions). User sees empty toggle rows and assumes the feature is broken.

**Prevention:**

- Split the query into 6 separate Overpass requests (one per site type) executed sequentially with 2-second delays between them, rather than one massive union query
- Set explicit `[timeout:300][maxsize:536870912]` (5 min, 512 MiB) on each query
- Cache the raw Overpass response in Redis with a 48h hard TTL (not just 24h logical) so a failed refresh still serves yesterday's data
- Use `out center;` instead of `out body;` to get centroid coordinates for ways/relations instead of full geometry, drastically reducing response size
- Implement retry with the alternate Overpass endpoint (`https://overpass.kumi.systems/api/interpreter`) as fallback
- Log query execution time server-side so degradation is visible before it becomes a complete failure

**Detection:** Sites count is 0 in status panel. Server logs show Overpass 429 or timeout errors. `/api/sites` returns empty array.

**Phase to address:** Phase 15 (Key Sites Overlay)

---

### Pitfall 2: Yahoo Finance Unofficial Endpoint Breaks Without Warning

**What goes wrong:** The `query1.finance.yahoo.com/v8/finance/chart/{symbol}` endpoint is unofficial and undocumented. Yahoo has a history of throttling, blocking, or changing these endpoints without notice. The endpoint may start returning 401/403 errors, require cookies/consent headers, or change its JSON response schema. Since there is no API key or contract, there is no SLA and no migration path.

**Why it happens:** Yahoo Finance explicitly does not offer a free public API. The v8 endpoint is an internal endpoint that third-party tools (yfinance, yahoo-finance2) reverse-engineered. Yahoo periodically tightens access controls, adds consent cookie requirements, or changes URL patterns. Serverless functions from cloud IPs are more likely to be blocked than residential IPs because Yahoo detects automated traffic.

**Consequences:** Markets panel shows stale prices or "Markets unavailable" indefinitely. If the response schema changes silently, the normalizer produces NaN/undefined prices that render as broken UI.

**Prevention:**

- Design the markets adapter with a `MarketDataProvider` interface so the Yahoo implementation can be swapped for an alternative (Alpha Vantage free tier, Twelve Data, or Financial Modeling Prep) without touching the route or store
- Return empty array (not error) from `/api/markets` on any Yahoo failure -- the spec already prescribes this, enforce it strictly
- Validate response shape before normalizing: check that `chart.result[0].meta.regularMarketPrice` exists and is a number; if not, skip that symbol rather than crashing the whole response
- Set a `User-Agent` header mimicking a browser to avoid bot detection
- Cache aggressively (60s logical TTL, 600s hard TTL) so a brief outage is invisible to the user
- Add a `marketSource` field to `MarketQuote` so if you swap providers, the UI can show attribution correctly

**Detection:** All 5 symbols return null/empty in `/api/markets` response. Server logs show non-200 from Yahoo. Price values are NaN in the UI.

**Phase to address:** Phase 18 (Oil Markets Tracker)

---

### Pitfall 3: Panel Stacking and Escape Key Conflicts Cause UX Chaos

**What goes wrong:** The spec introduces a notification drawer (360px, right side) that must coexist with the existing detail panel (360px, right side). Adding the notification drawer means up to 3 right-side panels could conceptually be open (filter panel, detail panel, notification drawer). The Escape key currently closes the detail panel unconditionally. With two competing Escape handlers, both fire on the same keypress, closing both panels simultaneously. The CSS `translate-x` animation for the detail panel must account for the drawer offset, creating a dependency chain where the detail panel's position depends on the drawer's state.

**Why it happens:** The existing `DetailPanelSlot` registers a `window.addEventListener('keydown')` for Escape. The new notification drawer will register its own. JavaScript event listeners fire in registration order, not in any LIFO/priority order. Without a centralized keyboard handler, both fire. The CSS offset (`--notification-drawer-offset`) creates a coupling where the detail panel must re-render when the drawer opens/closes, even though they are independent components.

**Consequences:** User presses Escape expecting to close the notification drawer, but both panels close. Or the detail panel jumps 360px when the drawer opens, creating a jarring animation. Z-index collisions between drawer and detail panel cause one to render behind the other.

**Prevention:**

- Implement a centralized panel manager in `uiStore` that tracks open panel stack order and routes Escape to the most-recently-opened panel (LIFO). Add a `panelStack: string[]` array where panels push on open and pop on close. Escape handler reads the top of the stack
- Use a single `useEffect` in `AppShell` for the Escape handler instead of per-panel handlers
- Define the notification drawer z-index explicitly in the CSS custom property scale (add `--z-drawer: 25` between `--z-panel: 20` and `--z-controls: 30`)
- Use CSS custom properties for the offset chain: `--notification-drawer-offset: 0px` (closed) or `360px` (open), and have the detail panel read this variable in its `right` position calculation
- Test the four panel combination states: both closed, detail only, drawer only, both open

**Detection:** Both panels close on single Escape press. Detail panel renders behind notification drawer. Detail panel position jumps when drawer opens.

**Phase to address:** Phase 17 (Notification Center), with layout audit in Phase 19

---

### Pitfall 4: DEFAULT_EVENT_WINDOW_MS Breaks Existing Custom Range Behavior

**What goes wrong:** Phase 17 introduces `DEFAULT_EVENT_WINDOW_MS = 86_400_000` (24h) as a soft lower bound for event display when `dateStart` is null. The existing `filterStore` treats non-null `dateStart` as "custom range mode" which suppresses flight and ship toggles. If this constant is implemented incorrectly -- say, by setting `dateStart` to `now - 24h` at init instead of keeping it null -- it will activate custom range mode on every page load, hiding all flights and ships by default.

**Why it happens:** The distinction between "no user-specified date filter" (dateStart === null) and "24h rolling window" is subtle. A developer might reasonably implement the 24h default by setting `dateStart = Date.now() - 86_400_000` in the store initializer, not realizing this triggers the `savedToggles` codepath that disables flight/ship toggles. The constant needs to be consumed only at the rendering layer (`useEntityLayers`), never in the store.

**Consequences:** Users open the app and see zero flights and zero ships. The "custom range" lock indicator appears on all layer toggles. Users think the app is broken. This is a silent regression that passes all existing tests because no test checks the initial-load flight visibility.

**Prevention:**

- The spec explicitly prescribes `DEFAULT_EVENT_WINDOW_MS` as a module-level constant in `filterStore.ts`, NOT a store field. Enforce this: the constant must never appear in any `set()` call
- The event rendering layer (`useEntityLayers` or `useFilteredEntities`) applies the 24h window as a filter predicate only for events, only when `dateStart === null`
- Add a regression test: "on initial load with no localStorage, flights and ships are visible and showFlights/showShips are true"
- Add a regression test: "on initial load, events older than 24h are not rendered"
- The `clearAll()` function must NOT interact with `DEFAULT_EVENT_WINDOW_MS` since it is a constant, not a filter value

**Detection:** Opening the app shows 0 flights and 0 ships. Layer toggles show disabled/locked state. `savedToggles` is non-null in store state on first load.

**Phase to address:** Phase 17 (Notification Center -- 24h Event Default)

---

### Pitfall 5: useSelectedEntity Silently Fails to Find Site Entities

**What goes wrong:** The existing `useSelectedEntity` hook searches three stores sequentially: `flightStore`, `shipStore`, `eventStore`. When Phase 15 adds `siteStore`, clicking a site entity on the map sets `selectedEntityId` in `uiStore`, but `useSelectedEntity` cannot find it because `siteStore` is not in its search chain. The entity appears as "not found," triggering the lost contact state (grayscale overlay, "LOST CONTACT" banner) for a perfectly valid site.

**Why it happens:** The `useSelectedEntity` hook was written for 3 entity types and never designed for extension. Its `useMemo` dependency array includes `[selectedId, flights, ships, events]`. Adding a new store requires modifying both the search logic AND the dependency array. If the dependency array is not updated, the hook will not re-compute when site data loads.

**Consequences:** Clicking a site shows "LOST CONTACT" in the detail panel. The site detail component never renders. If the developer adds `siteStore` to the search but forgets the dependency array, it works intermittently (only when other stores trigger a re-render).

**Prevention:**

- Update `useSelectedEntity` to search `siteStore` as the fourth store in the chain
- Add `sites` to the `useMemo` dependency array
- Add the same pattern for `newsStore` search (Phase 16) if news items become selectable
- Write a test: "selecting a site entity returns entity with type 'site' and isLost false"
- Consider refactoring to a registry pattern where stores self-register their entity arrays, preventing this manual wiring from being needed for future entity types

**Detection:** Clicking any site shows "LOST CONTACT" banner. Detail panel shows empty/gray state for sites. `useSelectedEntity` returns `{ entity: lastKnownRef, isLost: true }` for site IDs.

**Phase to address:** Phase 15 (Key Sites Overlay)

---

### Pitfall 6: Six Concurrent Polling Hooks Cause Visibility Resume Stampede

**What goes wrong:** After Phase 18, `AppShell` will wire 6 polling hooks: `useFlightPolling`, `useShipPolling`, `useEventPolling`, `useSitePolling`, `useNewsPolling`, `useMarketPolling`. Each registers its own `visibilitychange` listener. When the user returns to the tab after it was hidden, ALL 6 hooks fire `fetch()` simultaneously. This creates 6 concurrent HTTP requests to the Express API, which in turn makes 6+ concurrent upstream API calls (Overpass, GDELT DOC, RSS feeds, Yahoo Finance, etc.). On Vercel's serverless infrastructure, this can hit concurrent execution limits and cause some requests to queue or cold-start.

**Why it happens:** Each polling hook independently implements the same visibility-change pattern (pause on hidden, immediate fetch on visible). This pattern is correct for a single hook but creates a thundering herd when multiplied. The problem is compounded on mobile where visibility changes are frequent (app switching).

**Consequences:** Tab resume triggers a burst of 6 API calls that may hit rate limits, cause serverless cold starts, or time out. The user sees a loading state for several seconds on tab resume. If one request is slow (Overpass timeout), it does not block others, but the user perceives the app as "stuck."

**Prevention:**

- Stagger visibility-resume fetches: add a random delay (0-2s) before each hook's immediate fetch on visibility resume, so requests do not all fire in the same event loop tick
- For `useSitePolling` specifically: on visibility resume, check `Date.now() - lastFetchedAt > 24h` before fetching. Do NOT fetch sites on every tab resume -- the data changes once a day
- For `useMarketPolling`: on visibility resume, check if markets are closed (weekend/holiday). If closed, skip the fetch
- Consider a `usePollingCoordinator` that staggers all resume fetches with 500ms delays between them
- Monitor Vercel function concurrency in the observability dashboard

**Detection:** Network tab shows 6 simultaneous requests on tab resume. Some return 429 or timeout. Vercel logs show concurrent function invocations spiking.

**Phase to address:** Phase 18 (when the 6th hook is added) or Phase 19 (UI cleanup)

---

## Moderate Pitfalls

### Pitfall 7: Layer Toggle Panel Overflow at 15+ Rows

**What goes wrong:** Phase 15 adds 7 new toggle rows (1 "Key Sites" parent + 6 sub-toggles: Nuclear, Oil, Naval, Airbase, Dam, Port) to the existing 8 rows, totaling ~15 rows. On a 1280px viewport height (the project's minimum), the left-side panel stack (Title + Status + Counters + Layer Toggles) overflows the viewport. The toggles panel is not scrollable -- it is a fixed-height `OverlayPanel` that grows with content. Overflowing content is clipped by the viewport and unreachable.

**Prevention:**

- Add `max-h-[calc(100vh-Xpx)] overflow-y-auto` to the LayerTogglesSlot inner content, where X accounts for Title + Status + Counters height above it
- Group site toggles under a collapsible sub-section (collapsed by default) so the common case shows the existing 8 rows plus a "Key Sites" header
- The spec defers this fix to Phase 19, but the issue will be visible immediately in Phase 15. At minimum, add the `overflow-y-auto` in Phase 15 as a stopgap

**Phase to address:** Phase 15 (stopgap), Phase 19 (proper redesign)

---

### Pitfall 8: RSS Feed Parsing Fragility and Format Variation

**What goes wrong:** BBC and Al Jazeera RSS feeds have different XML structures, namespace handling, and encoding. BBC uses `<media:thumbnail>` for images while Al Jazeera uses `<enclosure>`. RSS date formats vary (RFC 822 vs ISO 8601). Some feeds include HTML entities in titles that need decoding. The XML parser may choke on malformed RSS (which is common with news feeds that include special characters in Arabic/Farsi content).

**Prevention:**

- Use a battle-tested RSS parser library (`rss-parser` for Node.js) rather than raw XML parsing. It handles namespace differences, date normalization, and entity decoding
- Wrap each feed parse in try/catch independently so one broken feed does not fail the entire `/api/news` response
- Normalize all dates to Unix timestamps immediately after parsing, not during rendering
- Strip HTML tags from title and description fields before storing
- Set a 10-second fetch timeout per RSS source to prevent one slow feed from blocking the response
- Return partial results: if BBC fails but Al Jazeera succeeds, return Al Jazeera articles rather than an error

**Phase to address:** Phase 16 (News Feed)

---

### Pitfall 9: GDELT DOC API Keyword Stemming Returns Irrelevant Articles

**What goes wrong:** The GDELT DOC API uses word stemming, which means a search for "military" also returns articles about "militia" and "militant," and a search for "strike" returns articles about "labor strikes" and "bowling strikes." The noise filter in the spec checks for conflict keywords in title+description, but if the GDELT query itself returns 250 articles (max) dominated by irrelevant stemmed matches, legitimate conflict articles may be pushed out of the results.

**Prevention:**

- Use GDELT `theme:` filters (e.g., `theme:MILITARY_STRIKE`) in addition to keyword queries -- themes are pre-classified and more precise than keyword matching
- Apply the noise filter server-side BEFORE deduplication, not after, to maximize the pool of relevant articles
- Request `maxrecords=250` (the maximum) from GDELT to get the largest pool for post-filtering
- Consider using GDELT DOC `mode=timelinevol` first to check if there are results, then `mode=artlist` to fetch them -- this avoids wasting the artlist quota on empty queries
- Log the pre/post-filter article count ratio to detect when the noise filter is too aggressive or too permissive

**Phase to address:** Phase 16 (News Feed)

---

### Pitfall 10: Proximity Alerts Spam From Dense Site Clusters

**What goes wrong:** Phase 17 fires a proximity alert when any flight or ship comes within 50km of any key site. The Persian Gulf has dense clusters of oil infrastructure (refineries, ports, petroleum wells) within a few km of each other. A single commercial flight passing over the Gulf coast triggers 10-20 proximity alerts simultaneously (one per nearby site), flooding the notification drawer with duplicate-seeming alerts.

**Prevention:**

- The spec includes a `siteId + entityId` deduplication with 30-minute cooldown, but this only prevents repeat alerts for the SAME entity-site pair. Cluster spam needs additional logic
- Implement site cluster grouping: if multiple sites are within 10km of each other, treat them as a single alert zone. Fire one alert for the cluster, not one per site
- Add a per-entity cooldown: once entity X triggers ANY proximity alert, suppress further proximity alerts for that entity for 30 minutes regardless of which site is nearby
- Cap proximity alerts to 5 visible at a time in the drawer, with a "show N more" expander
- Consider increasing the proximity threshold for low-value sites (ports, dams) to 25km while keeping 50km for high-value sites (nuclear, military)

**Phase to address:** Phase 17 (Notification Center)

---

### Pitfall 11: Search Index Rebuilds on Every Poll Update

**What goes wrong:** Phase 19's global search bar fuzzy-matches across all entity stores. If the search index is rebuilt every time any store updates (flights every 5-30s, ships every 30s, events every 15min, sites every 24h, news every 15min), the index rebuilds at the flight polling frequency. With 1000+ flights, 100+ ships, 200+ events, 50+ sites, and 50 news items, rebuilding a Fuse.js index every 5 seconds creates measurable CPU overhead and GC pressure.

**Prevention:**

- Debounce index rebuilds: rebuild at most once every 5 seconds, batching multiple store updates
- Use separate Fuse instances per entity type rather than one massive index. This way, only the flight index rebuilds when flights update (most frequent), while the site index stays stable
- Use `fuzzysort` instead of `Fuse.js` for better performance with large datasets -- it is optimized for real-time search scenarios
- Only index searchable fields (callsign, hex, name, MMSI, site name, event location) -- do not index the full entity object
- Pre-filter by type before searching when the user selects a type filter in the search dropdown

**Phase to address:** Phase 19 (Search, Filter & UI Cleanup)

---

### Pitfall 12: Upstash Redis Command Budget Exhaustion

**What goes wrong:** The free tier allows 500K commands/month. Current v1.0 usage: flights poll at ~30s intervals (2 commands per poll: GET + conditional SET), ships at 30s, events at 15min. That is roughly `2 * (2880 + 2880 + 96) = ~11,712 commands/day = ~351K/month` for existing sources. Adding sites (2/day), news (192/day), notifications (192/day), and markets (1440/day) adds ~3,660 commands/day (~110K/month). Total: ~461K/month, leaving only 8% headroom. A traffic spike, backfill operation, or debugging session with repeated manual refreshes could push past the 500K limit.

**Prevention:**

- Audit Redis command usage by endpoint before Phase 18. The `redis.get()` in cache-first routes is the biggest consumer
- Use `redis.mget()` for the markets endpoint (fetch all 5 symbols in one command instead of 5 separate gets)
- For `/api/notifications`, compute scores from the already-fetched event cache data -- do NOT make an additional Redis read for notifications if events are already in memory from the same request
- Consider upgrading to Upstash pay-as-you-go ($0.2 per 100K commands beyond 500K) if usage grows
- Add a Redis command counter to server logging so you can track monthly burn rate

**Phase to address:** Phase 18 (Oil Markets) and Phase 20 (Production Review)

---

### Pitfall 13: getIconForEntity and getColorForEntity Exhaustive Switch Gaps

**What goes wrong:** The existing `useEntityLayers.ts` has `getIconForEntity` and `getColorForEntity` functions with switch statements over entity types. These currently handle `flight`, `ship`, and all 11 conflict event types. When `SiteEntity` is added with `type: 'site'`, these functions fall through to the `default` case, rendering site entities with the wrong icon (`xmark`) and wrong color (groundCombat red). The TypeScript compiler does not catch this because the `default` branch handles the fall-through silently.

**Prevention:**

- When adding `'site'` to the `EntityType` union, add explicit `case 'site':` branches to ALL switch statements in `useEntityLayers.ts`, `DetailPanelSlot.tsx` (`getDotColor`, `getTypeLabel`, `getEntityName`), and `EntityTooltip.tsx`
- Use an exhaustive switch helper (`assertNever`) in the default branch so that missing cases become compile-time errors
- Site entities should NOT share the entity layer icon system at all -- they should have their own dedicated `IconLayer` in `useEntityLayers` with distinct icons per site type (nuclear, oil, naval, airbase, dam, port), not go through `getIconForEntity`
- Add the icon atlas entries for 6 new site icons to the canvas icon atlas

**Phase to address:** Phase 15 (Key Sites Overlay)

---

### Pitfall 14: Notification Drawer News Matching Produces False Positives

**What goes wrong:** Phase 17 matches news headlines to notification events using "country code match OR shared keyword in title" within a +/-2h window. This is extremely broad. A generic headline like "Iran warns of consequences" matches EVERY event from Iran in the past 2 hours. A headline about "Israel military operations" matches every airstrike, ground combat, and targeted event in Israel. The notification cards end up with the same 3 headlines repeated across every card.

**Prevention:**

- Tighten the matching criteria: require BOTH location overlap AND keyword overlap (not OR)
- Use specific location matching: compare GDELT event ActionGeo (city/region) to the article's geographic context, not just the country
- Limit to 1 news match per notification card in the first implementation. Expand to 3 only after validating match quality
- Add a "relevance score" to matches and only show matches above a threshold, rather than showing all matches
- Accept that news matching is inherently fuzzy and design the UI to make matches feel supplementary (small text, "Related" label) rather than authoritative

**Phase to address:** Phase 17 (Notification Center)

---

## Minor Pitfalls

### Pitfall 15: Sparkline SVG Rendering with Missing Market Data

**What goes wrong:** Yahoo Finance returns 5-day OHLC data, but on market holidays or data gaps, the sparkline array may have fewer than 5 points or contain null values. An SVG `<path>` with `NaN` coordinates renders as invisible or causes React rendering errors.

**Prevention:**

- Filter null/undefined values from sparkline arrays before generating SVG path data
- If fewer than 2 data points, show a flat line or "No data" placeholder instead of an empty sparkline
- Use `polyline` with explicit `points` attribute rather than `path` with `d` attribute -- polyline handles sparse data more gracefully

**Phase to address:** Phase 18 (Oil Markets Tracker)

---

### Pitfall 16: localStorage Toggle Migration for New Site Toggles

**What goes wrong:** The existing `loadPersistedToggles` function in `uiStore.ts` includes migration logic that resets toggles when old keys (`showDrones`, `showMissiles`, `showNews`, `showOtherConflict`) are detected. Phase 15 adds 7 new toggle keys for sites. Users who have existing persisted toggles will get the new defaults merged in (via `{ ...LAYER_TOGGLE_DEFAULTS, ...parsed }`), which is correct. But if a future migration needs to reset site toggles, the migration check will need updating -- and forgetting to update it is a recurring pattern (it already happened once with `showOtherConflict`).

**Prevention:**

- Add a `schemaVersion` number to the persisted toggles object. On load, if the version is less than the current version, reset to defaults. This replaces the fragile key-checking migration
- Set `schemaVersion: 2` for v1.1 (v1 being the current format without site toggles)

**Phase to address:** Phase 15 (Key Sites Overlay)

---

### Pitfall 17: Cmd+K Search Shortcut Conflicts with Browser DevTools

**What goes wrong:** The spec assigns `Cmd+K` / `Ctrl+K` as the keyboard shortcut for the global search bar. On Chrome, `Cmd+K` focuses the URL bar. On Firefox, `Cmd+K` opens the web search bar. The shortcut will either not reach the app (browser captures it first) or cause unexpected browser behavior alongside the search bar opening.

**Prevention:**

- Use `Cmd+K` with `preventDefault()` -- this works in Chrome and Safari because the event reaches the page before the browser acts on it
- Test in Firefox specifically, where `Cmd+K` may not be preventable. Consider `/` as a fallback shortcut (used by GitHub, YouTube, Gmail for search focus)
- Do not use `Ctrl+K` on Windows/Linux as it conflicts with creating hyperlinks in contenteditable contexts (not relevant here, but good practice)
- Show the shortcut hint in the search bar placeholder text: "Search... (Cmd+K)"

**Phase to address:** Phase 19 (Search, Filter & UI Cleanup)

---

### Pitfall 18: AppShell Grows Into a God Component

**What goes wrong:** `AppShell` currently renders 5 child components and wires 3 polling hooks. After v1.1, it will render 8+ child components (adding SearchBar, NotificationDrawer, MarketsPanel), wire 6 polling hooks, and manage CSS custom properties for panel offsets. The component becomes the single point of coordination for all UI state, making it hard to modify any panel without risking regressions in others.

**Prevention:**

- Extract a `PollingProvider` component that contains all `useXxxPolling()` calls but renders `{children}` -- this separates data fetching concerns from layout
- Keep `AppShell` focused on layout: grid/flex positioning of slots, z-index layering, and CSS custom properties
- Each new panel (NotificationDrawer, MarketsPanel, SearchBar) should manage its own open/close state via `uiStore`, not through props passed from AppShell

**Phase to address:** Phase 17 or Phase 19 (refactor opportunity)

---

## Phase-Specific Warnings

| Phase    | Likely Pitfall                                | Mitigation                                                            |
| -------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Phase 15 | Overpass timeout on large bbox (#1)           | Split queries by site type, use fallback endpoint, generous cache TTL |
| Phase 15 | useSelectedEntity missing site search (#5)    | Add siteStore to search chain + dependency array                      |
| Phase 15 | Switch statement gaps for site type (#13)     | Add explicit 'site' cases everywhere, use assertNever                 |
| Phase 15 | Toggle panel overflow (#7)                    | Add overflow-y-auto as stopgap                                        |
| Phase 16 | RSS format variation (#8)                     | Use rss-parser library, independent try/catch per feed                |
| Phase 16 | GDELT stemming noise (#9)                     | Use theme: filters, apply noise filter before dedup                   |
| Phase 17 | Panel stacking and Escape conflicts (#3)      | Centralized panel manager with LIFO stack                             |
| Phase 17 | DEFAULT_EVENT_WINDOW_MS regression (#4)       | Keep as module constant, never in store set() calls                   |
| Phase 17 | Proximity alert spam from site clusters (#10) | Cluster grouping, per-entity cooldown                                 |
| Phase 17 | News matching false positives (#14)           | Require both location AND keyword overlap                             |
| Phase 18 | Yahoo Finance endpoint instability (#2)       | Provider interface pattern, strict response validation                |
| Phase 18 | Polling stampede on tab resume (#6)           | Stagger resume fetches, skip low-frequency sources                    |
| Phase 18 | Redis command budget (#12)                    | Use mget(), audit command usage, consider pay-as-you-go               |
| Phase 19 | Search index rebuild overhead (#11)           | Per-type indices, debounce rebuilds, use fuzzysort                    |
| Phase 19 | Cmd+K shortcut conflicts (#17)                | preventDefault, test in Firefox, offer / as fallback                  |
| Phase 20 | All integration pitfalls surface in prod      | Full E2E test matrix covering all panel combinations                  |

---

## Sources

- [Overpass API rate limiting and timeouts](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)
- [Overpass API Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Overpass API timeout for large queries](https://github.com/drolbr/Overpass-API/issues/389)
- [Why yfinance keeps getting blocked](https://medium.com/@trading.dude/why-yfinance-keeps-getting-blocked-and-what-to-use-instead-92d84bb2cc01)
- [yahoo-finance2 unofficial API](https://github.com/gadicc/yahoo-finance2)
- [GDELT DOC API rate limiting](https://blog.gdeltproject.org/ukraine-api-rate-limiting-web-ngrams-3-0/)
- [GDELT DOC API updates](https://blog.gdeltproject.org/updates-doc-2-0-api/)
- [Deck.gl performance optimization](https://deck.gl/docs/developer-guide/performance)
- [Deck.gl too many layers performance](https://github.com/visgl/deck.gl/discussions/7021)
- [Deck.gl too many pickable layers](https://github.com/visgl/deck.gl/discussions/6729)
- [Zustand multiple stores discussion](https://github.com/pmndrs/zustand/discussions/2496)
- [RSS feed CORS proxy solutions](https://github.com/dan-mba/rss2json-proxy)
- [Upstash Redis pricing and limits](https://upstash.com/docs/redis/overall/pricing)
- [Vercel serverless cold start optimization](https://vercel.com/kb/guide/how-can-i-improve-serverless-function-lambda-cold-start-performance-on-vercel)
- [Fuse.js and alternatives comparison](https://npm-compare.com/elasticlunr,flexsearch,fuse.js,minisearch)
- [Z-index layering best practices](https://medium.com/@gbalu72/z-index-a-7-layer-design-system-for-better-ux-ae937208de29)
