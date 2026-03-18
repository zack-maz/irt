# Filter Panel Redesign

## Problem

The current filter panel lives in the top-left overlay stack and gets cut off at the bottom of the screen. All filters are flat (not grouped by entity type), and speed/altitude filters incorrectly affect ships/events. Country and date range filters are shared across entity types when they should be independent.

## Design

### Layout

- Move `FilterPanelSlot` from the top-left stack to absolute position `top-4 right-4`
- When the detail panel is open, animate `right` to `calc(var(--width-detail-panel) + 1rem)` so the filter panel sits adjacent to it
- When the detail panel closes, `right` transitions back to `1rem`
- Transition: `transition-[right] duration-300 ease-in-out` (matches detail panel's slide animation)
- Uses existing `OverlayPanel` styling (dark glass, rounded, bordered)
- Collapsed by default, showing "Filters (N)" header bar
- Max height: `max-h-[calc(100vh-2rem)]` with `overflow-y-auto` to prevent viewport overflow
- Existing map click handler for pin placement is unaffected by the layout change (filter panel is above map in z-order, map clicks pass through to the map layer below)

### Panel Structure

```
┌─ Filters (3) ──────── [-] ┐
│                            │
│ --- PROXIMITY              │
│ [📍 Set Pin] [radius]     │
│                            │
│ ▸ Flights                  │
│   --- Country              │
│   [autocomplete + chips]   │
│   --- Speed                │
│   [0 ──────── 700 kn]     │
│   --- Altitude             │
│   [0 ──────── 60,000 ft]  │
│                            │
│ ▸ Ships                    │
│   --- Speed                │
│   [0 ──────── 30 kn]      │
│                            │
│ ▸ Events                   │
│   --- Country              │
│   [autocomplete + chips]   │
│   --- Date Range           │
│   [1h] [6h] [24h] [7d]   │
│                            │
│ Clear all filters          │
└────────────────────────────┘
```

- **Proximity** is top-level — applies to all entity types
- **Flights**, **Ships**, **Events** are collapsible sections (all expanded by default when panel is open)
- Each entity section contains only filters relevant to that entity type
- Event filters (country, date) apply to all conflict event types collectively, independent of the per-type layer toggles (airstrikes, ground combat, targeted)

**Header hierarchy:**
- **Entity section headers** (Flights/Ships/Events) — clickable to expand/collapse, no clear button (clearing is per-filter or "Clear all")
- **Filter sub-headers** (Country/Speed/Altitude/Date Range) — reuse existing `SectionHeader` pattern with per-filter clear (x) button and active indicator

### Store Changes (`filterStore.ts`)

Split shared fields into entity-scoped ones:

| Old | New | Scope |
|-----|-----|-------|
| `selectedCountries` | `flightCountries` | Flights only |
| (new) | `eventCountries` | Events only |
| `speedMin/speedMax` | `flightSpeedMin/flightSpeedMax` | Flights only |
| (new) | `shipSpeedMin/shipSpeedMax` | Ships only (max ~30 kn) |
| `altitudeMin/altitudeMax` | `altitudeMin/altitudeMax` | Flights only (unchanged) |
| `dateStart/dateEnd` | `dateStart/dateEnd` | Events only (unchanged) |
| `proximityPin/proximityRadiusKm` | `proximityPin/proximityRadiusKm` | Global (unchanged) |

Update `FilterKey` union type to match new field names: `'flightCountry' | 'eventCountry' | 'flightSpeed' | 'shipSpeed' | 'altitude' | 'proximity' | 'date'`

**Action signatures** (duplicated per scope, not parameterized):

- `addFlightCountry(country: string)`, `removeFlightCountry(country: string)`
- `addEventCountry(country: string)`, `removeEventCountry(country: string)`
- `setFlightSpeedRange(min: number | null, max: number | null)`
- `setShipSpeedRange(min: number | null, max: number | null)`
- `setAltitudeRange(min, max)` — unchanged
- `setDateRange(start, end)` — unchanged
- Proximity actions — unchanged

**`clearFilter` mapping:**

| FilterKey | Resets |
|-----------|--------|
| `flightCountry` | `flightCountries: []` |
| `eventCountry` | `eventCountries: []` |
| `flightSpeed` | `flightSpeedMin: null, flightSpeedMax: null` |
| `shipSpeed` | `shipSpeedMin: null, shipSpeedMax: null` |
| `altitude` | `altitudeMin: null, altitudeMax: null` |
| `proximity` | `proximityPin: null, proximityRadiusKm: 100` |
| `date` | `dateStart: null, dateEnd: null` |

`activeFilterCount` counts each non-default group as 1 (7 possible max).

Filter state is **not** persisted to localStorage (resets on page reload). This is intentional — filters are transient session state.

### Filter Predicate Changes (`filters.ts`)

`entityPassesFilters` applies filters scoped by entity type:

- **Flights**: `flightCountries`, `flightSpeedMin/Max`, `altitudeMin/Max`, proximity
- **Ships**: `shipSpeedMin/Max`, proximity. Country/altitude/date filters do NOT affect ships.
- **Events**: `eventCountries`, `dateStart/End`, proximity. Speed/altitude filters do NOT affect events.

### UI Store Changes (`uiStore.ts`)

Add three booleans for section collapse state:
- `isFlightFiltersOpen: boolean` (default `true`)
- `isShipFiltersOpen: boolean` (default `true`)
- `isEventFiltersOpen: boolean` (default `true`)

With corresponding toggle actions.

### Component Changes

- **`FilterPanelSlot`** — Remove from top-left stack in `AppShell`. Render as independent absolutely-positioned element. Restructure internals with collapsible entity sections. Read `isDetailPanelOpen` from uiStore to compute `right` offset.
- **`AppShell`** — Remove `<FilterPanelSlot />` from the top-left flex column. Add it as a sibling to `<DetailPanelSlot />` (both absolutely positioned).
- **`CountryFilter`** — Reused twice with different props. Flight instance: `availableCountries` derived from `originCountry` of flight entities only. Event instance: `availableCountries` derived from `actor1`/`actor2` of event entities only (these are actor names like "ISRAEL", not ISO codes).
- **`RangeSlider`** — Reused for flight speed (0-700 kn), flight altitude (0-60000 ft), and ship speed (0-30 kn).
- **`ProximityFilter`** — Unchanged, rendered at top of panel outside entity sections.
- **`DateRangeFilter`** — Unchanged, rendered inside Events section.

### `useFilteredEntities` Hook

Update the shallow selector to pull the renamed/new filter fields:

`flightCountries`, `eventCountries`, `flightSpeedMin`, `flightSpeedMax`, `shipSpeedMin`, `shipSpeedMax`, `altitudeMin`, `altitudeMax`, `proximityPin`, `proximityRadiusKm`, `dateStart`, `dateEnd`

`entityPassesFilters` continues to accept the full `FilterState` interface. No structural change — hook still returns `{ flights, ships, events }`.

### Test Updates

- `filterStore.test.ts` — Update for renamed fields, new ship speed fields, independent country arrays
- `filters.test.ts` — Update predicate tests: ships should pass flight speed/altitude/country filters, events should pass speed/altitude filters
- `FilterPanel.test.tsx` — Update for new panel structure, entity sections, positioning
- `entityLayers.test.ts` — Minimal changes (useFilteredEntities interface unchanged)
- `StatusPanel.test.tsx` — No changes expected (consumes useFilteredEntities output)
