# Architecture Patterns: v1.1 Intelligence Layer Integration

**Domain:** Real-time intelligence dashboard -- new data pipelines + UI panels
**Researched:** 2026-03-19
**Confidence:** HIGH (direct codebase analysis + approved design spec)

## Scope

This document covers how the five v1.1 features integrate with the existing Express adapter/route + Zustand store + polling hook + Deck.gl layer architecture. It identifies every new component, every modified file, and the dependency-driven build order. The validated v0.9/v1.0 architecture is unchanged -- all new features follow the established patterns.

---

## Existing Architecture (Reference)

```
[Upstream API] -> server/adapters/*.ts -> server/routes/*.ts -> Upstash Redis
                                                                     |
                                                             /api/{resource}
                                                                     |
                                                      src/stores/*Store.ts (Zustand 5)
                                                                     |
                                                     src/hooks/use*Polling.ts
                                                                     |
                                                    src/hooks/useEntityLayers.ts -> Deck.gl layers
                                                                     |
                                                      BaseMap.tsx / AppShell.tsx
```

Each data domain (flights, ships, events) is fully independent: own adapter, own route, own store, own polling hook, own layer(s). This isolation is the project's greatest architectural strength and the pattern all new features must follow.

**Current stores (6):** mapStore, uiStore, flightStore, shipStore, eventStore, filterStore
**Current routes (4):** /api/flights, /api/ships, /api/events, /api/sources
**Current hooks (6):** useFlightPolling, useShipPolling, useEventPolling, useEntityLayers, useFilteredEntities, useSelectedEntity
**Current adapters (7):** opensky, adsb-exchange, adsb-lol, adsb-v2-normalize, aisstream, gdelt, acled

---

## v1.1 Architecture Extension

```
                        v1.1 Additions
                        ==============

Overpass API -----> /api/sites --------> Redis(24h) -----> siteStore -------> IconLayer (map)
(OSM infra)         overpass.ts                            useSitePolling     + SiteDetail (panel)
                                                                              + LayerTogglesSlot

GDELT DOC API --+
BBC ME RSS -----+-> /api/news ---------> Redis(15min) ---> newsStore -------> [no direct UI]
AJ RSS ---------+   news.ts                                useNewsPolling     consumed by P17

eventStore -----+
newsStore ------+-> /api/notifications -> (computed) -----> notificationStore -> Bell + Drawer
siteStore ------+   notifications.ts                        + proximityAlerts    NotificationCard
(+ haversine)                                               (client-side)

Yahoo Finance ----> /api/markets ------> Redis(60s) -----> marketStore ------> MarketsPanelSlot
(v8 chart API)      yahoo-finance.ts                        useMarketPolling    SparklineChart

All stores -------> searchStore -------> (client-side) --> SearchBarSlot
(fuse.js index)                                             results dropdown
```

---

## New vs. Modified: Complete File Map

### New Files (by phase)

| Phase | File                                                | Purpose                                                            |
| ----- | --------------------------------------------------- | ------------------------------------------------------------------ |
| 15    | `server/adapters/overpass.ts`                       | Overpass QL fetch + whitelist filter + normalize to SiteEntity[]   |
| 15    | `server/routes/sites.ts`                            | Cache-first route for site data (24h TTL)                          |
| 15    | `src/stores/siteStore.ts`                           | Zustand store: sites[], connectionStatus                           |
| 15    | `src/hooks/useSitePolling.ts`                       | 24h recursive setTimeout, conditional tab-resume                   |
| 15    | `src/components/detail/SiteDetail.tsx`              | Detail panel content for type='site'                               |
| 16    | `server/adapters/news.ts`                           | GDELT DOC + BBC RSS + AJ RSS fetch, merge, dedup, noise filter     |
| 16    | `server/routes/news.ts`                             | Cache-first route for news (15min TTL)                             |
| 16    | `src/stores/newsStore.ts`                           | Zustand store: items[], connectionStatus                           |
| 16    | `src/hooks/useNewsPolling.ts`                       | 15min recursive setTimeout                                         |
| 17    | `server/routes/notifications.ts`                    | Score events from Redis cache, return top 10                       |
| 17    | `src/stores/notificationStore.ts`                   | Server-scored events + client-side proximity alerts + unread count |
| 17    | `src/components/layout/NotificationDrawer.tsx`      | 360px right slide-out drawer                                       |
| 17    | `src/components/notifications/NotificationCard.tsx` | Individual notification card with news links                       |
| 18    | `server/adapters/yahoo-finance.ts`                  | Fetch 5 symbols from v8/finance/chart, normalize to MarketQuote[]  |
| 18    | `server/routes/markets.ts`                          | Cache-first route for market quotes (60s TTL)                      |
| 18    | `src/stores/marketStore.ts`                         | Zustand store: quotes[], connectionStatus                          |
| 18    | `src/hooks/useMarketPolling.ts`                     | 60s recursive setTimeout (hourly when markets closed)              |
| 18    | `src/components/layout/MarketsPanelSlot.tsx`        | Bottom-left collapsible OverlayPanel, 5 ticker rows                |
| 18    | `src/components/markets/SparklineChart.tsx`         | 20-line SVG polyline component                                     |
| 19    | `src/stores/searchStore.ts`                         | Zustand store: query, results, isOpen                              |
| 19    | `src/components/layout/SearchBarSlot.tsx`           | Top-center floating input + results dropdown                       |

### Modified Files (by phase)

| Phase | File                                         | Changes                                                                                   |
| ----- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 15    | `server/types.ts`                            | Add `SiteType`, `SiteEntity`, `'site'` to `EntityType`, `SiteEntity` to `MapEntity` union |
| 15    | `src/types/entities.ts`                      | Re-export `SiteEntity`, `SiteType`                                                        |
| 15    | `src/types/ui.ts`                            | Add 7 site toggle fields to `LayerToggles`, defaults to `LAYER_TOGGLE_DEFAULTS`           |
| 15    | `server/index.ts`                            | Register `/api/sites` route                                                               |
| 15    | `src/stores/uiStore.ts`                      | Add 7 site toggle booleans + actions, persist to localStorage                             |
| 15    | `src/hooks/useSelectedEntity.ts`             | Add siteStore search in entity lookup chain                                               |
| 15    | `src/hooks/useEntityLayers.ts`               | Add site IconLayer (6 icons, 3500m sizing), reduce event icon sizing                      |
| 15    | `src/components/layout/LayerTogglesSlot.tsx` | Add Key Sites master toggle + 6 indented sub-toggles                                      |
| 15    | `src/components/layout/AppShell.tsx`         | Wire `useSitePolling()`                                                                   |
| 15    | `src/components/layout/DetailPanelSlot.tsx`  | Add `SiteDetail` type-switch case, extend helper functions                                |
| 16    | `server/index.ts`                            | Register `/api/news` route                                                                |
| 16    | `src/components/layout/AppShell.tsx`         | Wire `useNewsPolling()`                                                                   |
| 17    | `server/index.ts`                            | Register `/api/notifications` route                                                       |
| 17    | `src/stores/filterStore.ts`                  | Add `DEFAULT_EVENT_WINDOW_MS` module constant                                             |
| 17    | `src/stores/uiStore.ts`                      | Add `isNotificationDrawerOpen`, open/close actions                                        |
| 17    | `src/hooks/useFilteredEntities.ts`           | Apply 24h soft lower bound when `dateStart === null`                                      |
| 17    | `src/components/layout/AppShell.tsx`         | Mount NotificationDrawer, add bell icon, set offset CSS var                               |
| 17    | `src/components/layout/DetailPanelSlot.tsx`  | Respect `--notification-drawer-offset` for panel coexistence                              |
| 17    | `src/styles/app.css`                         | Add `--width-notification-drawer`, `--z-notification-bell`                                |
| 18    | `server/index.ts`                            | Register `/api/markets` route                                                             |
| 18    | `src/stores/uiStore.ts`                      | Add `isMarketsCollapsed`, `toggleMarkets`                                                 |
| 18    | `src/components/layout/AppShell.tsx`         | Wire `useMarketPolling()`, mount MarketsPanelSlot                                         |
| 19    | `src/components/layout/AppShell.tsx`         | Mount SearchBarSlot                                                                       |
| 19    | `src/stores/filterStore.ts`                  | Remove `minute` from `STEP_MS` record                                                     |
| 19    | `src/components/filter/DateRangeFilter.tsx`  | Remove Min granularity button                                                             |
| 19    | `src/components/layout/FilterPanelSlot.tsx`  | Add Reset All button, grouped sections                                                    |
| 19    | `src/components/layout/LayerTogglesSlot.tsx` | Add scrollable/max-height for overflow                                                    |
| 19    | `src/components/ui/StatusPanel.tsx`          | Add FeedLine entries for sites, news, markets                                             |

---

## Component Boundaries

| Component                          | Responsibility                                                                                | Communicates With                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `server/adapters/overpass.ts`      | Fetch + parse OSM data via Overpass QL, whitelist filter, normalize to SiteEntity[]           | `server/routes/sites.ts`                                                                       |
| `server/adapters/news.ts`          | Fetch GDELT DOC JSON + parse BBC/AJ RSS XML (via fast-xml-parser), merge, dedup, noise filter | `server/routes/news.ts`                                                                        |
| `server/adapters/yahoo-finance.ts` | Fetch 5 symbols from Yahoo Finance v8 chart endpoint, normalize to MarketQuote[]              | `server/routes/markets.ts`                                                                     |
| `server/routes/notifications.ts`   | Read events + news from Redis, score events by severity, match headlines, return top 10       | Redis (`events:gdelt`, `news:feed` keys directly)                                              |
| `siteStore`                        | Site entity array + connection status                                                         | useSitePolling, useEntityLayers, useSelectedEntity, notificationStore (proximity), searchStore |
| `newsStore`                        | News item array + connection status                                                           | useNewsPolling, notificationStore (headline matching)                                          |
| `notificationStore`                | Server-scored events + client-side proximity alerts + unread count                            | Reads from newsStore, siteStore, flightStore, shipStore                                        |
| `marketStore`                      | Market quotes array + connection status                                                       | useMarketPolling, MarketsPanelSlot                                                             |
| `searchStore`                      | Query string + results + focus state                                                          | Reads from all entity stores (flightStore, shipStore, eventStore, siteStore)                   |
| `NotificationDrawer`               | 360px right-side drawer, notification cards with news headline links                          | notificationStore, uiStore                                                                     |
| `MarketsPanelSlot`                 | Bottom-left collapsible panel, 5 ticker rows with sparklines                                  | marketStore                                                                                    |
| `SearchBarSlot`                    | Top-center floating input, fuzzy search dropdown, fly-to-entity on select                     | searchStore, uiStore, mapStore                                                                 |

---

## Critical Integration Details

### 1. Type System Extension (Phase 15)

`SiteEntity` is the only new entity added to the `MapEntity` discriminated union. This ripples through:

```typescript
// server/types.ts -- changes
export type SiteType = 'nuclear' | 'oil_refinery' | 'naval_base' | 'airbase' | 'dam' | 'port';

export interface SiteEntity extends MapEntityBase {
  type: 'site';
  data: {
    siteType: SiteType;
    osmId: string;
    osmUrl: string;
    operator?: string;
  };
}

export type EntityType = 'flight' | 'ship' | 'site' | ConflictEventType; // 'site' added
export type MapEntity = FlightEntity | ShipEntity | SiteEntity | ConflictEventEntity; // SiteEntity added
```

**Downstream impact of MapEntity change:**

- `useSelectedEntity.ts` -- must search siteStore (code change)
- `useEntityLayers.ts` -- must handle site icon mapping (code change)
- `entityPassesFilters` -- no change needed (sites bypass filter pipeline)
- `DetailPanelSlot` -- must add SiteDetail type-switch case (code change)
- `getDotColor`, `getTypeLabel`, `getEntityName` in DetailPanelSlot -- must add site cases
- `BaseMap.tsx` tooltip gating -- no change (sites are always visible when toggled on)

**NewsItem and MarketQuote are NOT part of MapEntity.** They are separate types with no geographic coordinates and no map rendering. They live in their own stores and never flow through the entity pipeline.

### 2. useSelectedEntity Extension (Phase 15)

```typescript
// Current: searches 3 stores
const found = flights.find(...) ?? ships.find(...) ?? events.find(...) ?? null;

// After Phase 15: searches 4 stores
const sites = useSiteStore((s) => s.sites);
const found = flights.find(...) ?? ships.find(...) ?? events.find(...) ?? sites.find(...) ?? null;
```

The useMemo dependency array adds `sites`. This is the only change to this hook.

### 3. useFilteredEntities -- Sites Are Excluded (Phase 15)

Sites are static infrastructure. They have no speed, altitude, country, or meaningful timestamp. They must NOT flow through `entityPassesFilters` because:

- All filter predicates would pass-through (wasteful computation)
- Sites should remain visible regardless of filter state (they are reference points)

Sites get visibility control only through toggle gating in `useEntityLayers`.

### 4. 24h Event Default (Phase 17)

This is the most delicate cross-cutting change. The existing `filterStore` treats any non-null `dateStart` as "custom range mode" which hides flights and ships. The 24h default must NOT trigger this side-effect.

**Solution:** Module-level constant, not a store field.

```typescript
// src/stores/filterStore.ts
export const DEFAULT_EVENT_WINDOW_MS = 86_400_000; // 24h

// src/hooks/useFilteredEntities.ts -- event filtering changes
import { DEFAULT_EVENT_WINDOW_MS } from '@/stores/filterStore';

const events = useMemo(() => {
  // When dateStart is null (no user-set range), apply 24h default window
  // When dateStart is set (custom range mode), use user's value
  const effectiveStart = filters.dateStart ?? Date.now() - DEFAULT_EVENT_WINDOW_MS;
  return rawEvents.filter((e) => {
    if (e.timestamp < effectiveStart) return false;
    if (filters.dateEnd !== null && e.timestamp > filters.dateEnd) return false;
    return entityPassesFilters(e, filters);
  });
}, [rawEvents, filters]);
```

Key properties:

- `filterStore.dateStart` stays `null` at init -- no custom-range suppression
- Flights and ships are completely unaffected
- `clearAll()` resets user filters only; the constant is immune
- The notification drawer's 24h scope is consistent with this default

### 5. Panel Coexistence (Phase 17)

Three panels can be open simultaneously on the right side. The stacking strategy:

```
                    Map
|                                          |
|                                          | <-- NotificationDrawer (360px, z-panel)
|                                          |     slides from right edge
|                              |           |
|                              | <---------| <-- DetailPanel (360px, z-panel)
|                              |           |     translates left when drawer open
```

Implementation via CSS custom property:

```typescript
// AppShell.tsx
const isDrawerOpen = useUIStore((s) => s.isNotificationDrawerOpen);
// Set CSS custom property on root or pass as inline style
style={{ '--notification-drawer-offset': isDrawerOpen ? '360px' : '0px' }}

// DetailPanelSlot.tsx
className={`... right-[var(--notification-drawer-offset)] ...`}
// replaces current `right-0`
```

**Escape key LIFO:** Track open order. First Escape closes the most recently opened panel (notification drawer or detail panel).

**Filter panel shift:** FilterPanelSlot already shifts when detail panel is open (via `right-[calc(var(--width-detail-panel)+1rem)]`). It must now account for both panels:

```
right = (detailOpen ? 360px : 0) + (drawerOpen ? 360px : 0) + 1rem
```

### 6. Fly-To (Phase 19)

Search result selection needs to trigger a map camera transition. The recommended approach:

```typescript
// mapStore.ts -- add pending fly-to state
interface MapState {
  // ... existing fields
  pendingFlyTo: { lng: number; lat: number; zoom: number } | null;
  flyToEntity: (lat: number, lng: number) => void;
  clearPendingFlyTo: () => void;
}

// BaseMap.tsx -- consume pending fly-to
const pendingFlyTo = useMapStore((s) => s.pendingFlyTo);
const clearPendingFlyTo = useMapStore((s) => s.clearPendingFlyTo);

useEffect(() => {
  if (pendingFlyTo && mapRef.current) {
    mapRef.current.flyTo({ center: [pendingFlyTo.lng, pendingFlyTo.lat], zoom: pendingFlyTo.zoom });
    clearPendingFlyTo();
  }
}, [pendingFlyTo, clearPendingFlyTo]);
```

This avoids fighting with Deck.gl's viewport management by using the imperative `map.flyTo()` API through a ref.

### 7. StatusPanel Extension (Phase 19)

StatusPanel currently shows 3 FeedLines (flights, ships, events). After v1.1 it should show 6:

```typescript
<FeedLine status={flightStatus} count={visibleFlights} label="flights" />
<FeedLine status={shipStatus} count={visibleShips} label="ships" />
<FeedLine status={eventStatus} count={visibleEvents} label="events" />
<FeedLine status={siteStatus} count={siteCount} label="sites" />      // NEW
<FeedLine status={newsStatus} count={newsCount} label="news" />       // NEW
<FeedLine status={marketStatus} count={quoteCount} label="markets" /> // NEW
```

---

## Cache TTLs (New Routes)

| Route                | Redis Key        | Logical TTL        | Redis Hard TTL | Rationale                                     |
| -------------------- | ---------------- | ------------------ | -------------- | --------------------------------------------- |
| `/api/sites`         | `sites:osm`      | 24h (86,400,000ms) | 10d (864,000s) | OSM data changes rarely                       |
| `/api/news`          | `news:feed`      | 15min (900,000ms)  | 2.5h (9,000s)  | Matches event poll interval                   |
| `/api/markets`       | `markets:quotes` | 60s (60,000ms)     | 10min (600s)   | Real-time price sensitivity                   |
| `/api/notifications` | None             | N/A                | N/A            | Computed per request from event + news caches |

---

## Patterns to Follow

### Pattern 1: Cache-First Route

Every new server route replicates the established cache-first pattern from `server/routes/flights.ts`:

```typescript
const cached = await cacheGet<T[]>(KEY, LOGICAL_TTL_MS);
if (cached && !cached.stale) return res.json(cached);
try {
  const fresh = await fetchUpstream();
  await cacheSet(KEY, fresh, REDIS_TTL_SEC);
  res.json({ data: fresh, stale: false, lastFresh: Date.now() });
} catch (err) {
  if (cached)
    res.json(cached); // stale fallback
  else throw err; // Express 5 error handler
}
```

### Pattern 2: Curried Zustand Store

All new stores use `create<T>()()` for type inference. Each store has `connectionStatus`, `lastFetchAt`, and atomic setters matching the `CacheResponse<T>` shape.

### Pattern 3: Recursive setTimeout Polling

All new polling hooks use `setTimeout` (not `setInterval`) with cancelled flag, tab visibility pause/resume, and `setLoading()` before initial fetch.

### Pattern 4: OverlayPanel Widget

MarketsPanel reuses the collapsible `OverlayPanel` pattern from CountersSlot and LayerTogglesSlot with header toggle button.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Sites in Filter Pipeline

**What:** Running sites through `entityPassesFilters` in `useFilteredEntities`.
**Why bad:** Sites are static reference points with no filterable attributes. They should remain visible regardless of speed/altitude/country/date filters.
**Instead:** Toggle-only visibility in `useEntityLayers`.

### Anti-Pattern 2: News as MapEntity

**What:** Adding `NewsItem` to the `MapEntity` discriminated union.
**Why bad:** News has no coordinates. It pollutes every entity-iterating function.
**Instead:** Separate type in separate store, consumed only by notificationStore.

### Anti-Pattern 3: Server-Side Proximity Alerts

**What:** Computing proximity on the server.
**Why bad:** Server caches positions with varying staleness. Client has the freshest data from all polling hooks. Proximity depends on the exact moment of comparison.
**Instead:** Client-side haversine in notificationStore against current store data.

### Anti-Pattern 4: Charting Library for Sparklines

**What:** Adding recharts/Victory for 5 tiny sparkline charts.
**Why bad:** 50-200KB for something that needs a single SVG `<polyline>`.
**Instead:** 20-line `SparklineChart` component using raw SVG.

### Anti-Pattern 5: Re-Scoring Server Events Client-Side

**What:** Receiving raw events and re-applying severity scoring on the client.
**Why bad:** Duplicates logic, creates divergence risk, wastes CPU.
**Instead:** Server returns pre-scored, pre-sorted top 10. Client displays as-is.

### Anti-Pattern 6: Full-Text Search Library

**What:** Using MiniSearch, Lunr, or ElasticSearch for entity search.
**Why bad:** Overkill for ~5K entities with 2-3 searchable fields. These engines require document indexing infrastructure.
**Instead:** fuse.js with weighted keys. Rebuild index from store arrays on change.

---

## Build Order (Dependency-Driven)

```
Phase 15: Key Sites Overlay          <-- independent, no deps on other new features
    |
Phase 16: News Feed                  <-- independent, no deps on sites
    |
    v
Phase 17: Notification Center        <-- depends on Phase 15 (sites for proximity)
    |                                     AND Phase 16 (news for headline matching)
    |
Phase 18: Oil Markets Tracker        <-- independent of 15-17, but ordered after
    |                                     notification center so panel layout is settled
    |
Phase 19: Search, Filter & UI Cleanup  <-- depends on all stores existing (15-18)
    |                                       for cross-store search + layout audit
    |
Phase 20: Production Review           <-- depends on all above
```

**Why this order:**

1. **Sites first (15):** Extends the type system (MapEntity union) -- the only structural type change in v1.1. Phase 17 needs siteStore for proximity alerts. Gives a visible, testable map feature early.

2. **News second (16):** Independent pipeline with no UI in this phase. Quick to build (1 adapter, 1 route, 1 store, 1 hook). Creates the store Phase 17 needs for headline matching.

3. **Notifications third (17):** Most complex feature. Depends on both sites (proximity) and news (headlines). Also introduces the 24h event default -- a cross-cutting change best landed in one focused phase. Panel coexistence CSS is established here.

4. **Markets fourth (18):** Fully isolated. No interaction with entity stores, layers, or other panels. Could be built any time, but placing it after notifications means the panel layout patterns are already proven.

5. **Search/cleanup last (19):** Cross-store search needs all entity stores. UI cleanup should audit the final state of all panels, z-indices, spacing. Removing Min granularity and adding Reset All are safe cleanup changes.

6. **Deploy sync (20):** Verification-only. Must be last.

**Parallelism note:** Phases 15 and 16 have zero code dependencies on each other and could be built in parallel by two developers. However, the project's sequential phase-per-branch workflow makes sequential execution cleaner.

---

## Scalability Considerations

| Concern                 | Current (~100s of entities)   | At 10K entities            | At 100K entities       |
| ----------------------- | ----------------------------- | -------------------------- | ---------------------- |
| Entity search (fuse.js) | O(n) fuzzy match, instant     | ~50ms (fine)               | Consider web worker    |
| Proximity alerts        | O(flights \* sites), trivial  | O(10K \* 100) = ~50ms      | Spatial index needed   |
| Notification scoring    | Top 10 from ~200 events       | Server caps at 10, fast    | No change needed       |
| Deck.gl layers          | 9 layers after sites added    | Deck.gl handles this well  | Millions of points OK  |
| Zustand re-renders      | Per-selector pattern, minimal | No degradation             | No degradation         |
| Redis cache reads       | ~7 keys per request cycle     | Same keys, larger payloads | Redis handles natively |

None of these thresholds are expected to be reached. The monitoring area is a fixed geographic region, and entity counts are bounded by data source limits.

---

## Store Count Summary

| Store             | Phase  | Purpose                                       | Cross-Store Reads                                   |
| ----------------- | ------ | --------------------------------------------- | --------------------------------------------------- |
| mapStore          | v0.9   | Map loaded state, cursor, pending fly-to      | None                                                |
| uiStore           | v0.9   | Panel state, toggles, selection/hover         | None                                                |
| flightStore       | v0.9   | Flight entities, connection status            | None                                                |
| shipStore         | v0.9   | Ship entities, connection status              | None                                                |
| eventStore        | v0.9   | Event entities, connection status             | None                                                |
| filterStore       | v0.9   | All filter state, date range, proximity       | Reads uiStore (for toggle save/restore)             |
| siteStore         | **15** | Site entities, connection status              | None                                                |
| newsStore         | **16** | News items, connection status                 | None                                                |
| notificationStore | **17** | Scored events, proximity alerts, unread count | Reads siteStore, flightStore, shipStore, newsStore  |
| marketStore       | **18** | Market quotes, connection status              | None                                                |
| searchStore       | **19** | Search query, results, focus state            | Reads flightStore, shipStore, eventStore, siteStore |

**Total after v1.1:** 11 stores (6 existing + 5 new)

---

## Sources

- Direct codebase analysis of all existing stores, routes, adapters, hooks, and components (HIGH confidence)
- [Overpass API - OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [GDELT DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)
- [Yahoo Finance API Guide](https://algotrading101.com/learn/yahoo-finance-api-guide/)
- [Fuse.js Documentation](https://www.fusejs.io/)
- Approved design spec: `docs/superpowers/specs/2026-03-19-intelligence-layer-design.md`
