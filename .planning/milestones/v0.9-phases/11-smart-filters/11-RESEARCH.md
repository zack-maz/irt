# Phase 11: Smart Filters - Research

**Researched:** 2026-03-18
**Domain:** Client-side entity filtering, Zustand state management, Deck.gl overlay layers, React UI controls
**Confidence:** HIGH

## Summary

Phase 11 adds multi-criteria filter controls (country, speed range, altitude range, proximity radius, date range) to the existing entity display pipeline. The architecture is straightforward: a new Zustand filter store holds transient filter state, a pure filter predicate function applies AND-logic per entity type (with non-applicable filters passing through), and the existing `useEntityLayers` hook consumes the filtered arrays. No new dependencies are needed -- all filter logic is pure TypeScript, the proximity circle uses the already-imported `ScatterplotLayer` from `@deck.gl/layers`, and UI controls use native HTML range inputs styled with Tailwind CSS.

The primary complexity is in the cross-type filter semantics: each filter must correctly determine whether it applies to a given entity type (e.g., altitude applies to flights only; date range applies to events only) and include entities where the filter is non-applicable. The proximity filter requires a haversine distance calculation (trivial ~15 lines, no dependency needed) and a user-placed map pin with click-to-set interaction on the BaseMap.

**Primary recommendation:** Create a dedicated `filterStore.ts` (not extend `uiStore`) to keep filter state cleanly separated from layer toggles. Implement a single `applyFilters(entities, filters)` pure function that handles all cross-type logic, tested independently of React.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Filter panel placement: New "Filters" OverlayPanel below existing Layers panel in left-side stack, collapsible with +/- header, collapsed by default, badge count "Filters (3)" when collapsed
- Country/nationality: Text input with autocomplete from visible entities, multiple selections as chips, matches originCountry for flights, actor1/actor2 for events, ships always included
- Speed range: Dual-thumb range slider (min/max), applies to flights (velocity m/s) and ships (speedOverGround knots), display in knots
- Altitude range: Dual-thumb range slider (min/max), applies to flights only (altitude meters, display feet), ships and events always included
- Proximity radius: Slider 10-500km with preset ticks (25, 50, 100, 250, 500km), requires user-placed pin via "Set pin" button + map click, dashed/semi-transparent circle overlay on map
- Date range: Applies to events only (GDELT timestamp), flights and ships always included
- Cross-type behavior: Non-applicable filters include (not exclude) the entity; AND logic for applicable filters
- Active filter visibility: Badge count on collapsed header, arrow indicator on active rows, per-filter reset x, "Clear all" button
- No localStorage persistence: Filters reset on reload (transient analysis tools)
- StatusPanel counts reflect filtered results
- Events toggle hierarchy fix: Events master toggle controls all sub-event categories

### Claude's Discretion

- Exact slider styling and tick mark design for range inputs
- Proximity pin icon/marker design
- Circle overlay color and opacity for proximity radius
- Date range input widget (date picker vs. relative presets like "last 24h")
- Autocomplete dropdown styling for country input
- Exact speed range bounds and unit display logic
- Keyboard accessibility for slider controls

### Deferred Ideas (OUT OF SCOPE)

- Conflict event filtering by sub-type (beyond show/hide toggles)
- Saved filter presets ("Military high-altitude", "Near Tehran")
- Filter by Goldstein scale range for conflict severity
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                              | Research Support                                                                                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CTRL-03 | Smart filters by nationality, speed, altitude, proximity, and date range | Full architecture: filterStore for state, applyFilters pure function for cross-type AND logic, FilterPanelSlot UI component, proximity ScatterplotLayer circle overlay, haversine distance utility, integration into useEntityLayers and StatusPanel |

</phase_requirements>

## Standard Stack

### Core

| Library         | Version | Purpose                               | Why Standard                                           |
| --------------- | ------- | ------------------------------------- | ------------------------------------------------------ |
| zustand         | ^5.0.11 | Filter state store                    | Already in project, curried create pattern established |
| @deck.gl/layers | ^9.2.11 | ScatterplotLayer for proximity circle | Already imported, used for entity rendering            |
| react           | ^19.1.0 | Filter panel UI components            | Already in project                                     |
| tailwindcss     | ^4.2.1  | Filter panel styling                  | Already in project, CSS-first @theme                   |

### Supporting

| Library       | Version | Purpose | When to Use                         |
| ------------- | ------- | ------- | ----------------------------------- |
| (none needed) | --      | --      | All filter logic is pure TypeScript |

### Alternatives Considered

| Instead of              | Could Use              | Tradeoff                                                                            |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| Custom haversine        | haversine-distance npm | Only 15 lines of code, no dependency justified                                      |
| Native HTML range       | rc-slider or similar   | Adds dependency for dual-thumb; native input[type=range] with two inputs is simpler |
| GeoJsonLayer for circle | ScatterplotLayer       | ScatterplotLayer is simpler for a single circle with radius in meters               |

**Installation:**

```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  stores/
    filterStore.ts          # NEW: Zustand store for filter state (transient, no persistence)
  hooks/
    useEntityLayers.ts      # MODIFY: Consume filtered entity arrays
    useFilteredEntities.ts  # NEW: Hook that applies filter predicates to raw entity arrays
  components/
    layout/
      FilterPanelSlot.tsx   # NEW: Main filter panel component (OverlayPanel container)
      AppShell.tsx           # MODIFY: Add FilterPanelSlot below LayerTogglesSlot
    filter/
      CountryFilter.tsx     # NEW: Text input with autocomplete + chips
      RangeSlider.tsx       # NEW: Reusable dual-thumb range slider component
      ProximityFilter.tsx   # NEW: Proximity pin + radius slider
      DateRangeFilter.tsx   # NEW: Date range input for events
    map/
      BaseMap.tsx           # MODIFY: Add pin click handler and proximity circle layer
  lib/
    geo.ts                  # NEW: Haversine distance utility function
  types/
    ui.ts                   # MODIFY: Add FilterState type
```

### Pattern 1: Dedicated Filter Store (Zustand)

**What:** Separate Zustand store for all filter state, following the same curried `create<T>()()` pattern as existing stores.
**When to use:** Always -- filter state is distinct from UI toggle state.
**Example:**

```typescript
// src/stores/filterStore.ts
import { create } from 'zustand';

export interface ProximityPin {
  lat: number;
  lng: number;
}

export interface FilterState {
  // Country filter
  selectedCountries: string[];
  // Speed range (knots, null = no filter)
  speedMin: number | null;
  speedMax: number | null;
  // Altitude range (feet, null = no filter)
  altitudeMin: number | null;
  altitudeMax: number | null;
  // Proximity
  proximityPin: ProximityPin | null;
  proximityRadiusKm: number;
  // Date range (unix ms, null = no filter)
  dateStart: number | null;
  dateEnd: number | null;
  // Setting mode
  isSettingPin: boolean;

  // Actions
  setCountries: (countries: string[]) => void;
  addCountry: (country: string) => void;
  removeCountry: (country: string) => void;
  setSpeedRange: (min: number | null, max: number | null) => void;
  setAltitudeRange: (min: number | null, max: number | null) => void;
  setProximityPin: (pin: ProximityPin | null) => void;
  setProximityRadius: (km: number) => void;
  setDateRange: (start: number | null, end: number | null) => void;
  setSettingPin: (v: boolean) => void;
  clearFilter: (filter: 'country' | 'speed' | 'altitude' | 'proximity' | 'date') => void;
  clearAll: () => void;
  activeFilterCount: () => number;
}
```

### Pattern 2: Pure Filter Predicate Function

**What:** A single pure function that takes a MapEntity and the current FilterState, returns boolean. Handles cross-type applicability logic.
**When to use:** In `useFilteredEntities` hook and in StatusPanel count computation.
**Example:**

```typescript
// src/lib/filters.ts
import type { MapEntity, FlightEntity, ShipEntity, ConflictEventEntity } from '@/types/entities';
import type { FilterState } from '@/stores/filterStore';
import { haversineKm } from '@/lib/geo';
import { isConflictEventType } from '@/types/ui';

const KNOTS_PER_MS = 1.94384;
const FEET_PER_METER = 3.28084;

export function entityPassesFilters(entity: MapEntity, filters: FilterState): boolean {
  // Country filter
  if (filters.selectedCountries.length > 0) {
    if (entity.type === 'flight') {
      const d = (entity as FlightEntity).data;
      if (!filters.selectedCountries.includes(d.originCountry)) return false;
    } else if (isConflictEventType(entity.type)) {
      const d = (entity as ConflictEventEntity).data;
      const matches = filters.selectedCountries.some(
        (c) => d.actor1.includes(c) || d.actor2.includes(c),
      );
      if (!matches) return false;
    }
    // Ships: always pass (no nationality data in AIS)
  }

  // Speed filter (knots)
  if (filters.speedMin !== null || filters.speedMax !== null) {
    if (entity.type === 'flight') {
      const velocity = (entity as FlightEntity).data.velocity;
      if (velocity !== null) {
        const knots = velocity * KNOTS_PER_MS;
        if (filters.speedMin !== null && knots < filters.speedMin) return false;
        if (filters.speedMax !== null && knots > filters.speedMax) return false;
      }
    } else if (entity.type === 'ship') {
      const sog = (entity as ShipEntity).data.speedOverGround;
      if (filters.speedMin !== null && sog < filters.speedMin) return false;
      if (filters.speedMax !== null && sog > filters.speedMax) return false;
    }
    // Events: always pass (no speed data)
  }

  // Altitude filter (feet)
  if (filters.altitudeMin !== null || filters.altitudeMax !== null) {
    if (entity.type === 'flight') {
      const alt = (entity as FlightEntity).data.altitude;
      if (alt !== null) {
        const feet = alt * FEET_PER_METER;
        if (filters.altitudeMin !== null && feet < filters.altitudeMin) return false;
        if (filters.altitudeMax !== null && feet > filters.altitudeMax) return false;
      }
    }
    // Ships and events: always pass (no altitude)
  }

  // Proximity filter
  if (filters.proximityPin) {
    const dist = haversineKm(
      filters.proximityPin.lat,
      filters.proximityPin.lng,
      entity.lat,
      entity.lng,
    );
    if (dist > filters.proximityRadiusKm) return false;
  }

  // Date range filter (events only)
  if (filters.dateStart !== null || filters.dateEnd !== null) {
    if (isConflictEventType(entity.type)) {
      if (filters.dateStart !== null && entity.timestamp < filters.dateStart) return false;
      if (filters.dateEnd !== null && entity.timestamp > filters.dateEnd) return false;
    }
    // Flights and ships: always pass (live data)
  }

  return true;
}
```

### Pattern 3: Filtered Entities Hook

**What:** A hook that applies filter predicates to the raw entity arrays from the data stores, producing filtered arrays consumed by `useEntityLayers`.
**When to use:** Between data stores and the entity layers hook.
**Example:**

```typescript
// src/hooks/useFilteredEntities.ts
import { useMemo } from 'react';
import { useFlightStore } from '@/stores/flightStore';
import { useShipStore } from '@/stores/shipStore';
import { useEventStore } from '@/stores/eventStore';
import { useFilterStore } from '@/stores/filterStore';
import { entityPassesFilters } from '@/lib/filters';

export function useFilteredEntities() {
  const flights = useFlightStore((s) => s.flights);
  const ships = useShipStore((s) => s.ships);
  const events = useEventStore((s) => s.events);
  // Subscribe to all filter fields that affect predicate
  const filters = useFilterStore((s) => ({
    selectedCountries: s.selectedCountries,
    speedMin: s.speedMin,
    speedMax: s.speedMax,
    altitudeMin: s.altitudeMin,
    altitudeMax: s.altitudeMax,
    proximityPin: s.proximityPin,
    proximityRadiusKm: s.proximityRadiusKm,
    dateStart: s.dateStart,
    dateEnd: s.dateEnd,
  }));

  const filteredFlights = useMemo(
    () => flights.filter((f) => entityPassesFilters(f, filters)),
    [flights, filters],
  );
  const filteredShips = useMemo(
    () => ships.filter((s) => entityPassesFilters(s, filters)),
    [ships, filters],
  );
  const filteredEvents = useMemo(
    () => events.filter((e) => entityPassesFilters(e, filters)),
    [events, filters],
  );

  return { flights: filteredFlights, ships: filteredShips, events: filteredEvents };
}
```

### Pattern 4: Proximity Circle Layer (ScatterplotLayer)

**What:** A Deck.gl ScatterplotLayer rendering a single dashed/semi-transparent circle at the proximity pin location.
**When to use:** When proximity pin is placed and proximity filter is active.
**Example:**

```typescript
// In useEntityLayers or a separate useProximityLayer hook
import { ScatterplotLayer } from '@deck.gl/layers';

const proximityCircleLayer = new ScatterplotLayer({
  id: 'proximity-circle',
  data: proximityPin ? [proximityPin] : [],
  getPosition: (d: ProximityPin) => [d.lng, d.lat],
  getRadius: proximityRadiusKm * 1000, // convert km to meters
  radiusUnits: 'meters',
  getFillColor: [59, 130, 246, 30], // blue, very transparent
  getLineColor: [59, 130, 246, 120], // blue, semi-transparent
  stroked: true,
  filled: true,
  lineWidthMinPixels: 2,
  pickable: false,
});
```

### Pattern 5: Events Toggle Hierarchy Fix

**What:** When Events master toggle is OFF, all sub-event layers should be hidden regardless of individual toggle state. Currently each sub-toggle uses `showEvents && showAirstrikes` which is correct in `useEntityLayers`, but the `toggleEvents` action in uiStore should also propagate to ensure consistent behavior.
**When to use:** The `visible` prop already gates on `showEvents &&` so the hierarchy is partially implemented. The fix is to ensure the LayerTogglesSlot visually communicates this (dimming sub-toggles when Events is OFF) and that toggleEvents toggles all sub-events together.

### Anti-Patterns to Avoid

- **Storing filtered arrays in Zustand:** Filters are derived state -- compute via `useMemo` in hooks, never store filtered results
- **Mutating filter state inline:** Always use store actions to update filter state
- **Adding filter logic inside IconLayer constructors:** Keep filtering in the data pipeline (hooks), not in layer configuration
- **Using localStorage for filters:** CONTEXT explicitly says filters are transient -- no persistence

## Don't Hand-Roll

| Problem               | Don't Build                 | Use Instead                                                              | Why                                                                  |
| --------------------- | --------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Haversine distance    | Complex geodesic library    | Simple haversine function (~15 lines)                                    | Only need point-to-point distance, not routing or polygon operations |
| Dual-thumb slider     | Complex custom drag handler | Two native `<input type="range">` overlaid with CSS                      | Native inputs have accessibility built in (keyboard, screen readers) |
| Autocomplete dropdown | Full combobox from scratch  | Simple filtered list with native `<datalist>` or minimal custom dropdown | Country list is small (~30 visible countries max)                    |

**Key insight:** The filter logic is pure data transformation. The UI is the only complex part, and even that is simple HTML controls styled with Tailwind. No external libraries are needed.

## Common Pitfalls

### Pitfall 1: Re-render Cascade from Filter Store

**What goes wrong:** Subscribing to the entire filter store object causes all consuming components to re-render on any filter change.
**Why it happens:** Zustand shallow comparison fails if you subscribe to a new object literal each render.
**How to avoid:** Use individual selectors (`s => s.speedMin`) or Zustand's `useShallow` for object selections. For the `useFilteredEntities` hook, accept that filter changes legitimately require re-filtering.
**Warning signs:** Sluggish UI when adjusting sliders.

### Pitfall 2: Cross-Type Filter Exclusion vs Inclusion

**What goes wrong:** Entities are incorrectly hidden because a non-applicable filter excludes them (e.g., ships disappearing when altitude filter is active).
**Why it happens:** The predicate checks altitude on ships even though altitude doesn't apply.
**How to avoid:** Each filter block must check entity type first and only apply to applicable types. Non-applicable entities skip that filter block entirely (return true implicitly by not returning false).
**Warning signs:** Setting an altitude filter causes ships/events to vanish.

### Pitfall 3: Unit Conversion Errors

**What goes wrong:** Speed or altitude values are compared in wrong units, causing filters to appear broken.
**Why it happens:** Flight velocity is in m/s, ship speed is in knots, altitude is in meters. UI displays knots for speed and feet for altitude.
**How to avoid:** Define conversion constants (`KNOTS_PER_MS = 1.94384`, `FEET_PER_METER = 3.28084`) and convert entity values to display units before comparison. Store filter bounds in display units (knots for speed, feet for altitude).
**Warning signs:** Speed filter at "200 knots" hides flights going 200 m/s (~389 knots).

### Pitfall 4: Proximity Pin Click Conflict with Entity Selection

**What goes wrong:** Clicking map to place proximity pin triggers entity selection or vice versa.
**Why it happens:** Both pin placement and entity click use the same Deck.gl onClick handler.
**How to avoid:** Use an `isSettingPin` mode flag in filter store. When `isSettingPin` is true, map clicks set the pin coordinates (on the Map component's onClick, not Deck's), and when false, clicks behave normally for entity selection.
**Warning signs:** Clicking to set pin opens detail panel, or entity clicks move the pin.

### Pitfall 5: Country Autocomplete Stale Data

**What goes wrong:** Country options don't update as new flights arrive or old ones leave.
**Why it happens:** Country list is computed once from initial data and not re-derived.
**How to avoid:** Derive available countries from current filtered entity arrays in a `useMemo` that depends on the flight/event arrays. This ensures the autocomplete always reflects live data.
**Warning signs:** Countries appear in dropdown that have no visible entities.

### Pitfall 6: Null Velocity/Altitude Values

**What goes wrong:** Flights with null velocity or altitude are incorrectly excluded by range filters.
**Why it happens:** Comparing `null < speedMin` evaluates to false in JS, causing unexpected behavior.
**How to avoid:** When velocity or altitude is null, either include the entity (conservative, data is unknown) or exclude it (strict). Decision: include entities with null values since null means "no data" not "zero."
**Warning signs:** Unidentified flights (often null altitude/velocity) disappear with any speed/altitude filter.

## Code Examples

### Haversine Distance Utility

```typescript
// src/lib/geo.ts
const R_KM = 6371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### Dual-Thumb Range Slider (CSS approach)

```typescript
// src/components/filter/RangeSlider.tsx
// Two overlaid native range inputs with CSS for the dual-thumb effect
// The track uses appearance-none + Tailwind for dark theme styling
// Each input handles its own thumb via pointer-events

interface RangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  step?: number;
  unit?: string;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
}
```

### Filter Panel Collapsible Header with Badge

```typescript
// Header pattern consistent with LayerTogglesSlot / StatusPanel
<button
  onClick={toggleFilters}
  className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-secondary"
>
  <span>
    Filters{activeCount > 0 && (
      <span className="ml-1 text-accent-blue">({activeCount})</span>
    )}
  </span>
  <span className="text-text-muted">{isCollapsed ? '+' : '-'}</span>
</button>
```

### Integration with useEntityLayers

```typescript
// Key change: useEntityLayers receives filtered arrays instead of raw store data
// Option A: useEntityLayers calls useFilteredEntities internally
// Option B: Pass filtered arrays as parameters

// Option A (recommended -- keeps useEntityLayers as the single source):
export function useEntityLayers() {
  const { flights: allFlights, ships, events } = useFilteredEntities();
  // ... rest of existing logic with filtered data
}
```

### Map Pin Placement (BaseMap integration)

```typescript
// In BaseMap.tsx -- separate onClick for MapLibre (ground clicks)
// vs Deck.gl onClick (entity clicks)
const isSettingPin = useFilterStore(s => s.isSettingPin);
const setProximityPin = useFilterStore(s => s.setProximityPin);
const setSettingPin = useFilterStore(s => s.setSettingPin);

// Add to Map component:
<Map
  onClick={(e) => {
    if (isSettingPin) {
      setProximityPin({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      setSettingPin(false);
    }
  }}
  cursor={isSettingPin ? 'crosshair' : undefined}
  // ... existing props
/>
```

## State of the Art

| Old Approach                     | Current Approach                        | When Changed                    | Impact                       |
| -------------------------------- | --------------------------------------- | ------------------------------- | ---------------------------- |
| External slider libs (rc-slider) | Dual native range inputs with CSS       | React 18+                       | No dependency, better a11y   |
| GeoJSON circle polygon           | ScatterplotLayer single point           | deck.gl v8+                     | Simpler, GPU-rendered circle |
| Complex autocomplete (downshift) | Native datalist or simple filtered list | Always valid for small datasets | No dependency for ~30 items  |

**Deprecated/outdated:**

- None relevant -- all patterns use current library versions already in the project

## Open Questions

1. **Country matching precision for events**
   - What we know: GDELT actor1/actor2 fields contain country names but can also contain organization names like "IRAN" or "UNITED STATES"
   - What's unclear: Exact format of actor strings -- may need substring/case-insensitive matching rather than exact equality
   - Recommendation: Use case-insensitive `includes()` matching for actor fields; exact match for flight `originCountry`

2. **Null value handling in range filters**
   - What we know: Flights can have `null` velocity and `null` altitude (especially unidentified flights)
   - What's unclear: User expectation -- should unknown values be included or excluded?
   - Recommendation: Include entities with null values (conservative approach -- unknown is not zero). This is safer for intelligence analysis where missing data should surface, not hide.

3. **Speed range bounds**
   - What we know: Ship speed rarely exceeds 30 knots, flight speed can reach 600+ knots
   - What's unclear: Ideal default range bounds
   - Recommendation: Speed slider 0-700 knots (covers military jets at ~600kn and ships at 0-30kn). Default: no filter active (null/null).

4. **Date range widget design**
   - What we know: GDELT events have timestamps; user wants to filter by date range
   - What's unclear: Best UX -- date picker vs relative presets
   - Recommendation (Claude's discretion): Use relative preset buttons ("Last 1h", "Last 6h", "Last 24h", "Last 7d", "All") plus optional custom date inputs. Relative presets are faster for intelligence analysis workflows.

## Validation Architecture

### Test Framework

| Property           | Value                           |
| ------------------ | ------------------------------- |
| Framework          | Vitest 4.1.0 with jsdom         |
| Config file        | `vite.config.ts` (test section) |
| Quick run command  | `npx vitest run`                |
| Full suite command | `npx vitest run`                |

### Phase Requirements -> Test Map

| Req ID   | Behavior                                     | Test Type | Automated Command                                      | File Exists? |
| -------- | -------------------------------------------- | --------- | ------------------------------------------------------ | ------------ |
| CTRL-03a | Filter store defaults and actions            | unit      | `npx vitest run src/__tests__/filterStore.test.ts -x`  | No -- Wave 0 |
| CTRL-03b | entityPassesFilters pure function            | unit      | `npx vitest run src/__tests__/filters.test.ts -x`      | No -- Wave 0 |
| CTRL-03c | Haversine distance function                  | unit      | `npx vitest run src/__tests__/geo.test.ts -x`          | No -- Wave 0 |
| CTRL-03d | FilterPanelSlot renders filter controls      | unit      | `npx vitest run src/__tests__/FilterPanel.test.tsx -x` | No -- Wave 0 |
| CTRL-03e | useEntityLayers consumes filtered arrays     | unit      | `npx vitest run src/__tests__/entityLayers.test.ts -x` | Yes (extend) |
| CTRL-03f | StatusPanel counts reflect filtered entities | unit      | `npx vitest run src/__tests__/StatusPanel.test.tsx -x` | Yes (extend) |
| CTRL-03g | Events master toggle hides all sub-events    | unit      | `npx vitest run src/__tests__/entityLayers.test.ts -x` | Yes (verify) |
| CTRL-03h | Active filter count badge                    | unit      | `npx vitest run src/__tests__/FilterPanel.test.tsx -x` | No -- Wave 0 |
| CTRL-03i | Clear all resets filter state                | unit      | `npx vitest run src/__tests__/filterStore.test.ts -x`  | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/filterStore.test.ts` -- covers CTRL-03a, CTRL-03i (store defaults, actions, clearAll)
- [ ] `src/__tests__/filters.test.ts` -- covers CTRL-03b (pure function cross-type logic)
- [ ] `src/__tests__/geo.test.ts` -- covers CTRL-03c (haversine distance calculation)
- [ ] `src/__tests__/FilterPanel.test.tsx` -- covers CTRL-03d, CTRL-03h (render, badge count)

## Sources

### Primary (HIGH confidence)

- Project codebase analysis -- all source files read directly
- `server/types.ts` -- MapEntity, FlightEntity, ShipEntity, ConflictEventEntity field structures
- `src/stores/uiStore.ts` -- existing Zustand store pattern with curried create
- `src/hooks/useEntityLayers.ts` -- existing entity filtering and layer creation pattern
- `src/types/ui.ts` -- existing type definitions, CONFLICT_TOGGLE_GROUPS
- `src/components/layout/LayerTogglesSlot.tsx` -- OverlayPanel collapsible panel pattern
- `src/components/ui/StatusPanel.tsx` -- entity count computation from toggle state

### Secondary (MEDIUM confidence)

- [deck.gl ScatterplotLayer docs](https://deck.gl/docs/api-reference/layers/scatterplot-layer) -- radiusUnits, stroked, filled properties
- [Haversine formula reference](https://www.movable-type.co.uk/scripts/latlong.html) -- distance calculation formula

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- no new dependencies, all libraries already in project
- Architecture: HIGH -- follows established Zustand + hooks + useMemo pattern exactly
- Pitfalls: HIGH -- derived from direct codebase analysis of entity types and existing filter patterns
- UI patterns: MEDIUM -- dual-thumb slider CSS technique is well-established but specific styling needs iteration

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- no external API changes expected)
