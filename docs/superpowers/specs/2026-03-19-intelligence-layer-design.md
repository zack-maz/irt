# v1.1 Intelligence Layer — Design Spec

**Date:** 2026-03-19
**Milestone:** v1.1
**Status:** Approved

## Overview

Four-phase milestone adding key infrastructure sites, news ingestion, a notification center, and UI/search/filter cleanup to the Iran Conflict Monitor.

```
Phase 15: Key Sites Overlay
Phase 16: News Feed
Phase 17: Notification Center + 24h Event Default
Phase 18: Search, Filter & UI Cleanup
```

---

## Architecture Overview

```
Phase 15: Key Sites Overlay
  ├── server: /api/sites  →  Overpass API  →  Redis 24h cache
  ├── server/adapters/overpass.ts  →  whitelist filter  →  normalize to SiteEntity[]
  ├── siteStore.ts  →  Zustand store + useSitePolling hook (24h)
  └── IconLayer  →  6 distinct icons per site type

Phase 16: News Feed
  ├── server: /api/news  →  GDELT DOC API + BBC ME RSS + AJ RSS  →  Redis 15min cache
  ├── server/adapters/news.ts  →  merge + deduplicate by URL + noise filter
  └── newsStore.ts  →  consumed by Phase 17 drawer

Phase 17: Notification Center
  ├── server: /api/notifications  →  scores events, matches news, returns top 10
  ├── Severity: type_weight × log(1+NumMentions) × log(1+NumSources) × recency_decay
  ├── Proximity alert: flight/ship within 50km of key site  →  injected notification
  ├── filterStore default: dateStart = now - 24h (rolling window)
  ├── Bell icon (top-right)  →  unread badge
  └── Notification drawer  →  360px, stacks with detail panel

Phase 18: Search, Filter & UI Cleanup
  ├── Global search bar  →  fuzzy match across all entity stores
  ├── Filter panel redesign  →  grouped sections + Reset All + collapse
  └── Layout audit  →  z-index, spacing, responsiveness (1280px min)
```

**New stores:** `siteStore`, `newsStore`, `notificationStore`
**New server endpoints:** `/api/sites`, `/api/news`, `/api/notifications`
**New UI:** bell icon, notification drawer, global search bar
**No changes to:** existing stores (except filterStore default), map layers, existing polling patterns, Redis key structure

---

## Phase 15: Key Sites Overlay

### Data Source

Overpass API (`overpass-api.de/api/interpreter`) — free, no auth.

### Noise Filter — Whitelisted Tag Combos

| Tag Combo | Site Type |
|-----------|-----------|
| `military=naval_base` | Naval Base |
| `military=airfield` OR `aeroway=military` | Airbase |
| `man_made=petroleum_well` + `name=*` OR `industrial=oil_refinery` | Oil & Refinery |
| `military=nuclear_hazard` OR `man_made=nuclear_facility` | Nuclear |
| `waterway=dam` + `name=*` | Dam |
| `harbour=yes` + `name=*` within IRAN_BBOX | Port |

Drop everything else. Only named nodes/ways within IRAN_BBOX.

### Rendering

- New `IconLayer` in BaseMap
- 6 distinct icons: nuclear ☢, oil 🛢, naval ⚓, airbase ✈, dam 💧, port 🚢
- **Icon sizing:** `3500m base / minPixels:12 / maxPixels:80` (matches downsized event icons)
- Click opens existing detail panel with: site name, type, coordinates, OSM link

### Icon Size Change (cross-phase)

Current event icon sizing: `5000m base / minPixels:16 / maxPixels:120`
New sizing for **both** events and sites: `3500m base / minPixels:12 / maxPixels:80`
This is the only sizing change — flight/ship icons unchanged.

### Layer Toggles

New "Key Sites" toggle row in LayerTogglesSlot, with 6 indented sub-toggles:
- Nuclear
- Oil & Refinery
- Naval Base
- Airbase
- Dam
- Port

Same opacity-dim pattern as existing sub-toggles.

### SiteEntity Type

```typescript
interface SiteEntity extends MapEntityBase {
  type: 'site';
  data: {
    siteType: 'nuclear' | 'oil_refinery' | 'naval_base' | 'airbase' | 'dam' | 'port';
    osmId: string;
    osmUrl: string;     // https://www.openstreetmap.org/node/{id}
    operator?: string;
  };
}
```

`'site'` is added to `EntityType` in `server/types.ts` alongside `'flight'` and `'ship'`. `SiteEntity` is added to the `MapEntity` discriminated union in the shared types. Phase 15 also updates `useSelectedEntity` to search `siteStore` alongside the existing three stores. The existing detail panel renders a new `SiteDetail` component for `type === 'site'`.

### Caching

- Redis key: `sites:osm`
- TTL: 24h (OSM data changes slowly)
- `useSitePolling` hook: fetch once at startup, then every 24h via recursive setTimeout
- **Tab visibility:** on visibility resume, check `Date.now() - lastFetchedAt > 24h`; if stale, fetch immediately. Otherwise skip (unlike flight/ship hooks which always re-fetch on visibility resume).

### LayerTogglesSlot Overflow Note

Adding 6 site sub-toggles brings the total toggle rows to ~15. This will overflow at minimum viewport heights. Phase 15 adds the toggles; Phase 18 redesigns the panel layout (scrollable or collapsible sections) to accommodate the full row count.

---

## Phase 16: News Feed

### Server — `/api/news`

Fetches in parallel:
1. **GDELT DOC API** — `mode=artlist&maxrecords=50&format=json` with query: `Iran OR "Middle East" OR Iraq OR Israel theme:MILITARY_STRIKE OR theme:TERROR`
2. **BBC Middle East RSS** — `https://feeds.bbci.co.uk/news/world/middle_east/rss.xml`
3. **Al Jazeera RSS** — `https://www.aljazeera.com/xml/rss/all.xml`

Merge → deduplicate by URL → sort by `publishedAt` descending → return top 50.

**Response shape:**
```typescript
interface NewsItem {
  id: string;          // hash of URL
  title: string;
  url: string;
  source: 'gdelt' | 'bbc' | 'aljazeera';
  publishedAt: number; // ms timestamp
  imageUrl?: string;
}
```

### Noise Filter

Drop articles where **title + description combined** contain none of (case-insensitive):
`Iran`, `Israel`, `Iraq`, `Syria`, `Gaza`, `Lebanon`, `Hezbollah`, `IRGC`, `airstrike`, `missile`, `strike`, `attack`, `military`, `conflict`

Checking title+description (not title-only) prevents false negatives from articles titled around troop movements, named operations, or diplomatic events that omit explicit conflict keywords from the headline.

### Caching

- Redis key: `news:feed`
- TTL: 15min (matches event poll interval)

### Store & Polling

- `newsStore.ts` — holds `items: NewsItem[]` + `status: ConnectionStatus`
- `useNewsPolling` — 15min recursive setTimeout, wired into AppShell
- No new UI in this phase — consumed by Phase 17

---

## Phase 17: Notification Center

### Severity Scoring

```
score = type_weight × log(1 + NumMentions) × log(1 + NumSources) × recency_decay
```

**Type weights:**
| Type | Weight |
|------|--------|
| airstrike | 10 |
| wmd | 10 |
| shelling | 7 |
| bombing | 7 |
| ground_combat | 6 |
| mass_violence | 6 |
| assassination | 5 |
| blockade | 4 |
| abduction | 4 |
| assault | 3 |
| ceasefire_violation | 3 |

**Recency decay:**
| Age | Multiplier |
|-----|-----------|
| 0–2h | 1.0 |
| 2–6h | 0.7 |
| 6–12h | 0.4 |
| 12–24h | 0.2 |
| >24h | dropped |

Top 10 by score returned from `/api/notifications`.

### News Matching

Each notification card gets matched headlines from `newsStore`:
- Published within ±2h of the event
- Passes location/keyword overlap: country code match OR shared keyword in title
- Shows 1–3 linked headlines per card

### Proximity Alerts

- Computed client-side in `notificationStore`
- Haversine distance: flight or ship within 50km of a key site → inject notification
- `type_weight = 8` for proximity alerts
- Deduplicated by `siteId + entityId`, 30min cooldown to prevent spam
- **Separation from server notifications:** `/api/notifications` returns top 10 scored server events. Proximity alerts are maintained as a separate `proximityAlerts` array in `notificationStore` and rendered as a distinct section in the drawer ("Proximity Alerts") above the main event list. They do not compete with the top-10 server cap and are not re-scored server-side.

### 24h Event Default (cross-cutting)

The existing `filterStore` treats any non-null `dateStart` as "custom range mode" — which hides flights and ships. To avoid this side-effect, `DEFAULT_EVENT_WINDOW_MS = 86_400_000` is defined as a plain module-level constant in `filterStore.ts` (not a store field). The event rendering layer uses this constant as a soft lower bound when `dateStart` is `null`. Custom range mode activation logic is unchanged — it only triggers when the user explicitly sets `dateStart` via the slider.

- `filterStore.dateStart` stays `null` at init — no custom-range suppression, flights and ships unaffected
- Map event layer reads `DEFAULT_EVENT_WINDOW_MS` when `dateStart === null` to filter events
- User expands the window via the date range slider (sets `dateStart`, activates custom-range mode as before)
- `clearAll()` in Phase 18 resets user filters only — `DEFAULT_EVENT_WINDOW_MS` is a constant, not a store field, so it is unaffected by Reset All
- Notification drawer: already 24h scoped — consistent

### UI — Bell Icon + Drawer

**Bell icon:**
- Top-right corner of AppShell
- Red badge: unread count, resets on drawer open
- Positioned above existing map controls in z-index stack

**Notification drawer:**
- 360px wide, slides in from right
- **Panel coexistence:** when both notification drawer and detail panel are open simultaneously, detail panel translates left by 360px (matching drawer width) via a CSS custom property `--notification-drawer-offset`. The detail panel's existing `translate-x` animation is updated to account for this offset. Z-index: notification drawer = same level as detail panel; bell icon = above both.
- **Escape key:** closes whichever panel was opened most recently (LIFO). If both are open, first Escape closes notification drawer, second closes detail panel.
- Each card: event type badge, location, relative timestamp, severity bar (visual), 1–3 news headline links
- Proximity alerts rendered as a separate section above server-scored events
- "Clear all" button
- "Last updated Xs ago" footer

**`/api/notifications`** pre-scores and returns sorted server events — no client-side re-scoring of server events. Proximity alerts are client-side only (see above).

---

## Phase 18: Search, Filter & UI Cleanup

### Global Search Bar

- Floating input, top-center of map
- Keyboard shortcut: `Cmd+K` / `Ctrl+K` to focus
- Fuzzy-matches across all entity stores: flight callsign/hex, ship name/MMSI, event location/type, site name
- Results dropdown: grouped by entity type
- Click result: fly-to + select entity (opens detail panel)

### Filter Panel Redesign

- Group controls into sections: **Flights**, **Ships**, **Events**, **Date Range**
- **Reset All** button — clears all filters to defaults
- Collapse empty/inactive sections by default
- Fix known UX issues: slider behavior, label truncation
- **Remove Minute granularity** from the date range slider — `STEP_MS` record and `snapToStep` retain only `Hr` and `Day` options. The `Min` granularity toggle button is removed from the UI.

### LayerTogglesSlot Redesign

- Make the toggles panel scrollable or collapsible to accommodate the full ~15 row count introduced by Phase 15's site sub-toggles
- Address any overflow at minimum 1280px viewport height

### Layout Audit

- Audit panel z-index stacking — detail panel + notification drawer coexistence
- Tighten LayerTogglesSlot spacing (now has more rows with site sub-toggles)
- Review StatusPanel HUD density
- Responsiveness pass — panels don't clip at 1280px minimum viewport width

---

## Data Flow Summary

```
Overpass API  →  /api/sites  →  Redis(24h)  →  siteStore  →  IconLayer
GDELT DOC + BBC RSS + AJ RSS  →  /api/news  →  Redis(15min)  →  newsStore
eventStore + newsStore + siteStore  →  /api/notifications  →  notificationStore  →  Bell + Drawer
DEFAULT_EVENT_WINDOW_MS (module constant, 86_400_000)  →  event layer soft lower bound (dateStart stays null at init)
All entity stores  →  global search index  →  search bar dropdown
```

---

## Out of Scope

- Claude API situation brief (Approach C) — deferred to v1.2
- Mobile layout below 1280px — deferred
- ACLED as event source — remains dormant
- Push notifications (browser native) — deferred
