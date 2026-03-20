# Iran Conflict Monitor

## Project Context

Personal real-time intelligence dashboard for monitoring the Iran conflict. 2.5D map with live data from public APIs. Numbers over narratives.

## Conventions

- **TypeScript strict mode** — always enabled
- **Zustand stores** — curried `create<T>()()` pattern for type inference
- **Zustand selectors** — `s => s.field` pattern to minimize re-renders
- **Tailwind CSS v4** — CSS-first `@theme` configuration, no tailwind.config.js
- **Z-index** — scale defined as CSS custom properties for consistent overlay layering
- **Commits** — conventional commits format (`feat(phase):`, `fix(phase):`, `docs(phase):`)
- **Branches** — one feature branch per phase (`feature/XX-description`), never commit to main directly
- **Phase boundaries** — before starting a new phase: commit, push, merge previous phase to main, update all docs, then create new branch from main
- **TypeScript** — pinned to ~5.9.3 to avoid TS 6.0 breaking changes

## Map Patterns

- **DeckGLOverlay** wraps MapboxOverlay via `useControl` hook from react-maplibre
- **Style customization** — imperative in `onLoad` with `getLayer()` guards, never pre-fetch/modify CARTO style.json
- **CompassControl** — renders null (behavior-only) using `useMap` hook and DOM querySelector
- **Terrain** — AWS Terrarium S3 tiles, `tiles` array + `encoding` prop pattern for raster-dem sources
- **Map mocks** — maplibre-gl and @deck.gl/mapbox mocked via `vite.config.ts` test.alias for jsdom

## Testing

- **Framework**: Vitest with jsdom (frontend), node (server)
- **Run**: `npx vitest run` (all), `npx vitest run server/` (server only)
- **Mocks**: `src/test/__mocks__/` for WebGL-dependent libraries
- **Stubs**: `it.todo()` for unimplemented test stubs

## Key Files

- `src/components/map/constants.ts` — map configuration (terrain, bounds, styles)
- `src/components/map/BaseMap.tsx` — main map component with all overlays
- `src/components/layout/AppShell.tsx` — root layout shell (wires all three polling hooks)
- `src/components/ui/StatusPanel.tsx` — HUD status panel (visible entity counts + connection dots)
- `src/components/layout/LayerTogglesSlot.tsx` — layer toggle panel (8 rows)
- `src/components/layout/DetailPanelSlot.tsx` — right-side detail panel (360px slide-out)
- `src/hooks/useSelectedEntity.ts` — cross-store entity lookup with lost contact tracking
- `src/components/map/EntityTooltip.tsx` — hover/click tooltip for all entity types
- `src/stores/mapStore.ts` — map state (loaded, cursor position)
- `src/stores/uiStore.ts` — UI state (panels, toggles)
- `src/stores/flightStore.ts` — flight data state (entities, connection health, metadata)
- `src/hooks/useFlightPolling.ts` — 5s recursive setTimeout with tab visibility awareness

## Data Model (Phase 3+)

- **MapEntity** — discriminated union with minimal shared fields (`id`, `type`, `lat`, `lng`, `timestamp`, `label`) + nested type-specific data
- **Entity types**: `flight`, `ship`, plus 11 `ConflictEventType` values
- **FlightEntity.data** — includes `unidentified: boolean` flag for hex-only/no-callsign flights
- **API endpoints**: `/api/flights`, `/api/ships`, `/api/events` (separate, independent caching)
- **IRAN_BBOX** — covers Greater Middle East (south:15, north:42, west:30, east:70), not just Iran
- **IRAN_CENTER** — (30.0, 50.0) with 500 NM radius for ADS-B queries

## Flight Data Patterns (Phase 4+)

- **Polling** — recursive `setTimeout` (not `setInterval`) to avoid overlapping async fetches
- **Tab visibility** — polling pauses on `document.visibilitychange` hidden, immediate fetch on visible
- **Cache-first route** — server checks Redis cache before upstream call to conserve API credits
- **Connection state** — `ConnectionStatus` type: `'connected' | 'stale' | 'error' | 'loading'`
- **Stale threshold** — 60s of no fresh data → clear flights entirely (prevents showing dangerously outdated positions)
- **Full replace** — each poll replaces entire flights array atomically (no merge-by-ID)
- **Ground traffic filtering** — moved from server to client-side (`useEntityLayers` filters by `showGroundTraffic` toggle)
- **RateLimitError** — OpenSky adapter throws `RateLimitError` on 429 responses (consistent with ADS-B Exchange pattern)

## Multi-Source Flight Data (Phase 6-7)

- **Three flight sources**: OpenSky, ADS-B Exchange (RapidAPI), adsb.lol (free, default)
- **FlightSource type** — defined in `src/types/ui.ts` to avoid circular imports with server types
- **Polling intervals** — OpenSky 5s, ADS-B Exchange 260s, adsb.lol 30s
- **V2 normalizer** — shared normalizer in `server/adapters/adsb-v2-normalize.ts` for ADS-B Exchange and adsb.lol
- **StatusPanel** — replaces SourceSelector, shows 3-line HUD (flights/ships/events with colored health dots)
- **/api/sources** — returns per-source configuration status
- **Persistence** — selected flight source stored in `localStorage`

## Ship & Event Data (Phase 8+)

- **Ship store** — `src/stores/shipStore.ts` with 120s stale threshold
- **Event store** — `src/stores/eventStore.ts` with no stale clearing (historical data)
- **Polling hooks** — `useShipPolling` (30s), `useEventPolling` (900s / 15 min)
- **AppShell** — wires all three: `useFlightPolling()`, `useShipPolling()`, `useEventPolling()`
- **Entity colors** — flights yellow (#eab308), unidentified red (#ef4444), ships gray (#9ca3af), airstrikes bright red (#ff3b30), ground combat red (#ef4444), targeted dark red (#8b1e1e), other conflict red (#ef4444)
- **Entity icons** — flights/ships use chevron, airstrikes use starburst, ground combat uses explosion, targeted uses crosshair, other conflict uses xmark
- **Icon sizing** — flights/ships 8000m base (minPixels:24, maxPixels:160); events 5000m base (minPixels:16, maxPixels:120)

## Conflict Event Data (Phase 8.1+)

- **GDELT v2** — default conflict event source (free, no auth, 15-min updates)
- **ACLED** — adapter preserved in `server/adapters/acled.ts` but not active (requires account approval)
- **GDELT adapter** — `server/adapters/gdelt.ts`, fetches lastupdate.txt → downloads ZIP → parses CSV → filters Middle East conflicts
- **GDELT endpoint** — `http://data.gdeltproject.org/gdeltv2/lastupdate.txt` (HTTP, not HTTPS — TLS cert issues)
- **ConflictEventType** — 11 CAMEO-based types: `airstrike`, `ground_combat`, `shelling`, `bombing`, `assassination`, `abduction`, `assault`, `blockade`, `ceasefire_violation`, `mass_violence`, `wmd`
- **classifyByBaseCode** — maps CAMEO EventBaseCode (3-digit) → ConflictEventType, with root code fallback
- **CONFLICT_TOGGLE_GROUPS** — 4 groups: showAirstrikes (`airstrike`), showGroundCombat (`ground_combat`, `shelling`, `bombing`), showTargeted (`assassination`, `abduction`), showOtherConflict (rest)
- **isConflictEventType** — type guard derived from CONFLICT_TOGGLE_GROUPS (single source of truth)
- **EVENT_TYPE_LABELS** — human-readable display labels for all 11 types
- **FIPS codes** — GDELT uses FIPS 10-4 (IZ=Iraq, TU=Turkey, IS=Israel), not ISO
- **adm-zip** — required for ZIP decompression (Node zlib only handles gzip/deflate)
- **Deduplication** — GDELT rows deduplicated by date+CAMEO+lat/lng, keeping highest NumMentions row

## Layer Controls & Tooltips (Phase 9-10)

- **LayerTogglesSlot** — `src/components/layout/LayerTogglesSlot.tsx`, 8 toggle rows in OverlayPanel
- **Toggle rows** — Flights, Ground (indented), Unidentified (indented), Ships, Airstrikes, Ground Combat, Targeted, Other Conflict
- **Toggle behavior** — opacity dims to 40% when OFF, smooth transition, persisted to localStorage
- **Layer visibility** — `useEntityLayers` sets `visible` prop per toggle; ground/airborne filtering in `useMemo`
- **Unidentified filter precedence** — unidentified flights stay visible when Ground is OFF (if pulse toggle ON)
- **Conflict toggle gating** — per-category toggles gate tooltips (replaces old showNews toggle)
- **EntityTooltip** — `src/components/map/EntityTooltip.tsx`, renders per-type content (flight metadata, ship AIS, GDELT event data with source link)
- **Hover/highlight** — glow (2x, alpha 60) + highlight (1.2x, full alpha) layers with `pickable: false` to prevent blink
- **Active entity dimming** — non-active entities dim to alpha 80; active entity stays full opacity (no alpha=0)
- **StatusPanel counts** — derived from actual entity arrays filtered by toggle state and entity type
- **Zoom controls** — NavigationControl showZoom enabled
- **localStorage migration** — old showDrones/showMissiles/showNews keys auto-detected and reset to new defaults

## Detail Panel (Phase 10)

- **DetailPanelSlot** — `src/components/layout/DetailPanelSlot.tsx`, 360px right-side slide-out
- **Per-type content** — FlightDetail, ShipDetail, EventDetail with section headings
- **FlightDetail** — dual units (ft/m, kn/m-s, ft-min/m-s), data source from flightStore.activeSource
- **ShipDetail** — name, MMSI, speed, course, heading, "AISStream" source
- **EventDetail** — type label (EVENT_TYPE_LABELS), CAMEO code, Goldstein scale, actors, "GDELT v2" source, "View source" link
- **DetailValue** — `src/components/detail/DetailValue.tsx`, reusable value cell with flash-on-change animation
- **useSelectedEntity** — `src/hooks/useSelectedEntity.ts`, cross-store lookup with lost contact tracking via useRef
- **Dismiss** — Close button (×) and Escape key both call closeDetailPanel + selectEntity(null)
- **Copy coordinates** — clipboard button with 2s "Copied!" feedback
- **Lost contact** — grayscale + opacity-50 overlay with "LOST CONTACT" banner when entity disappears
- **Relative timestamp** — "Updated Xs ago" ticking every second
- **Instant swap** — content changes on entity switch, slide animation only on open/close

## Analytics Counters (Phase 12)

- **CountersSlot** — `src/components/layout/CountersSlot.tsx`, collapsible OverlayPanel with Flights + Events sections
- **CounterRow** — `src/components/counters/CounterRow.tsx`, label + value with fixed-width label column (w-24) for vertical alignment, green +N delta with 3s fade animation
- **useCounterData** — `src/components/counters/useCounterData.ts`, derives visible-only counts from filtered entities + toggle state
- **Visibility-aware** — counters reflect only visible entities (smart filters + toggle gating matching useEntityLayers logic)
- **Flight counters** — Iranian (originCountry === 'Iran'), Unidentified (data.unidentified flag); gated by showFlights/showGroundTraffic/pulseEnabled
- **Event counters** — Airstrikes, Ground Combat, Targeted, Fatalities; gated by showEvents + per-category toggles
- **Delta animation** — `@keyframes delta-fade` in app.css, 3s ease-out forwards via `animate-delta` class

## Serverless Cache (Phase 13)

- **Upstash Redis** — REST-based client (`@upstash/redis`) for serverless compatibility
- **CacheEntry<T>** — stores `{data, fetchedAt}` for staleness computation; hard Redis TTL = 10x logical TTL
- **Cache keys** — `flights:SOURCE`, `ships:ais`, `events:gdelt`
- **Redis module** — `server/cache/redis.ts` exports `cacheGet<T>`, `cacheSet<T>`, `redis` instance
- **AISStream on-demand** — connect, collect for N ms, close per request (no persistent WebSocket)
- **Ship merge/prune** — fresh ships merged with cached by MMSI, 10 min stale threshold
- **Events accumulator** — merge-by-ID upsert with WAR_START pruning
- **GDELT backfill** — lazy on-demand via `backfillEvents()` on cache miss; direct URL construction (4 files/day sampling), batched concurrent downloads; `?backfill=true` query param forces re-run
- **Backfill cooldown** — 1 hour via `events:backfill-ts` Redis key
- **parseSqlDate** — uses `Date.UTC()` (not local time) for consistent timestamp comparisons

## Date Range Filter (Phase 11+13)

- **filterStore** — `dateStart: null` and `dateEnd: null` defaults (no filtering)
- **Custom range mode** — activates when either dateStart or dateEnd becomes non-null; saves and suppresses flight/ship toggles
- **Deactivation** — both must return to null (via Clear button or slider reset)
- **Lo slider at WAR_START** — sends `null` dateStart (no lower bound)
- **Hi slider at "now"** — sends `null` dateEnd (NOW_THRESHOLD_MS = 60s snap)
- **DateRangeFilter** — custom pointer-based dual-thumb slider with granularity toggle (Min/Hr/Day)
- **Granularity** — `STEP_MS` record, `snapToStep` floors timestamps to step boundary
