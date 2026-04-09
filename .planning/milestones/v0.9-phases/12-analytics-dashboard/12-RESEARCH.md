# Phase 12: Analytics Dashboard - Research

**Researched:** 2026-03-18
**Domain:** React component composition, Zustand derived state, CSS animations
**Confidence:** HIGH

## Summary

Phase 12 implements a counters dashboard within the existing `CountersSlot` scaffold. The work is entirely frontend -- no new APIs, no new data sources, no new libraries. All counter values derive from existing Zustand stores (flightStore, eventStore) using existing filter infrastructure (filterStore, entityPassesFilters, useFilteredEntities). The `CONFLICT_TOGGLE_GROUPS` constant already defines the three event groupings needed for counter categories.

The primary technical challenge is computing filtered vs. unfiltered counts reactively while respecting both layer toggles and smart filters, then displaying a delta (+N) that fades after 3 seconds. The existing `DetailValue` component provides a flash-on-change pattern, but the delta display requires a different approach: tracking previous values with `useRef` and rendering a temporary green "+N" element with CSS fade-out animation.

**Primary recommendation:** Build a pure `useCounterData` hook that derives all counter values from existing stores/hooks, and a `CounterRow` presentational component that handles the delta display. Replace the CountersSlot placeholder content with these components. No new stores, no new server endpoints, no new dependencies.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Three conflict counter groups matching existing CONFLICT_TOGGLE_GROUPS: Airstrikes (airstrike), Ground Combat (ground_combat, shelling, bombing, assault, blockade, ceasefire_violation, mass_violence, wmd), Targeted (assassination, abduction)
- Total row summing all three groups
- Fatalities total row summing fatalities field across all events
- Two flight-derived counters: Iranian flights (originCountry === 'Iran') and Unidentified flights (unidentified === true)
- No ship metrics -- StatusPanel already covers entity counts
- Two sections with visual divider: FLIGHTS section on top (Iranian, Unidentified), EVENTS section below (Airstrikes, Ground Combat, Targeted, Total, Fatalities)
- Event counter rows use colored dots matching layer toggle colors (airstrikes #ff3b30, ground combat #ef4444, targeted #8b1e1e)
- Event counters show x/total ratio with percentage when filters are active (both layer toggles AND smart filters narrow x; total is always unfiltered)
- When no filters are active (x equals total), show just the number -- no ratio, no percentage
- Date range filter affects counters (consistent with smart filter integration)
- Flight counters (Iranian, Unidentified) always show just the count -- no ratios
- Counters recompute reactively when store data updates (event store every 15 min, flight store per polling interval)
- No animated count-up, no polling countdown
- Green +N delta text appears next to changed values, fades out after 3 seconds
- Delta shows difference from previous value (not session accumulation)
- Counters reflect all events in the current dataset (whatever GDELT returns), not cumulative across refreshes

### Claude's Discretion

- Exact delta fade animation (CSS transition or keyframe)
- Number formatting for large values (comma separators, etc.)
- Section header styling (FLIGHTS/EVENTS labels)
- Whether to use the existing DetailValue flash-on-change pattern or a new delta component

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                        | Research Support                                                                                                                                                                                                                                                                                                                                     |
| ------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STAT-01 | Strike/sortie/intercept running counters dashboard | All counter categories defined in CONTEXT.md map to existing store data. Airstrikes, Ground Combat, Targeted derive from eventStore events filtered through CONFLICT_TOGGLE_GROUPS. Iranian/Unidentified derive from flightStore. Filter-aware ratios use entityPassesFilters + toggle state. Delta display uses useRef for previous value tracking. |

</phase_requirements>

## Standard Stack

### Core

| Library      | Version | Purpose                     | Why Standard                               |
| ------------ | ------- | --------------------------- | ------------------------------------------ |
| React        | 19      | Component rendering, hooks  | Already in project                         |
| Zustand      | 5       | State management, selectors | Already in project, curried create pattern |
| TypeScript   | ~5.9.3  | Type safety                 | Already pinned in project                  |
| Tailwind CSS | 4       | Styling, animations         | Already in project, CSS-first @theme       |

### Supporting

| Library                | Version    | Purpose         | When to Use                    |
| ---------------------- | ---------- | --------------- | ------------------------------ |
| @testing-library/react | (existing) | Component tests | Testing CountersSlot rendering |
| vitest                 | (existing) | Test runner     | All test files                 |

### Alternatives Considered

| Instead of                 | Could Use                     | Tradeoff                                                                              |
| -------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| Custom delta hook          | framer-motion AnimatePresence | Massive dependency for a simple fade; overkill                                        |
| useMemo counter derivation | Zustand derived selector      | useMemo is the established project pattern (see useEntityLayers, useFilteredEntities) |

**Installation:**

```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  components/
    layout/
      CountersSlot.tsx          # Updated: replace placeholder with counter content
    counters/
      CounterRow.tsx            # New: presentational row with delta display
      useCounterData.ts         # New: hook deriving all counter values from stores
  styles/
    app.css                     # Updated: add delta-fade keyframe animation
```

### Pattern 1: Derived Counter Values via useMemo

**What:** Compute all counter values as memoized derivations from existing store data
**When to use:** When counter values depend on multiple stores and filter state
**Example:**

```typescript
// Follow established useFilteredEntities pattern
const rawEvents = useEventStore((s) => s.events);
const rawFlights = useFlightStore((s) => s.flights);

// Unfiltered totals (always full dataset)
const totalAirstrikes = useMemo(
  () =>
    rawEvents.filter((e) =>
      (CONFLICT_TOGGLE_GROUPS.showAirstrikes as readonly string[]).includes(e.type),
    ).length,
  [rawEvents],
);

// Filtered counts (through smart filters + toggle narrowing)
const { events: filteredEvents } = useFilteredEntities();
const filteredAirstrikes = useMemo(
  () =>
    filteredEvents.filter((e) =>
      (CONFLICT_TOGGLE_GROUPS.showAirstrikes as readonly string[]).includes(e.type),
    ).length,
  [filteredEvents],
);
```

### Pattern 2: Delta Display with useRef + CSS Animation

**What:** Track previous counter value in a ref, display green "+N" text that fades out after 3 seconds
**When to use:** When a counter value changes due to new data
**Example:**

```typescript
// In CounterRow component
const prevRef = useRef<number>(value);
const [delta, setDelta] = useState<number | null>(null);
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (prevRef.current !== value) {
    const diff = value - prevRef.current;
    if (diff !== 0) {
      setDelta(diff);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setDelta(null), 3000);
    }
    prevRef.current = value;
  }
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, [value]);
```

### Pattern 3: Filter-Aware Ratio Display

**What:** Show "x/total 67%" when filters narrow the count, just "total" when no narrowing occurs
**When to use:** For event counter rows only (flight counters always show just the count)
**Example:**

```typescript
// Determine if any filtering is active (both smart filters AND toggle-based narrowing)
const isFiltered = filtered !== total;

// Render logic
{isFiltered ? (
  <>
    <span className="text-text-primary tabular-nums">{filtered}/{total}</span>
    <span className="text-text-muted ml-1">{Math.round((filtered / total) * 100)}%</span>
  </>
) : (
  <span className="text-text-primary tabular-nums">{total}</span>
)}
```

### Pattern 4: "Filters Active" Detection for Event Counters

**What:** Determine whether x !== total by comparing filtered count to unfiltered count
**When to use:** To decide whether to show ratio format or simple count
**Critical detail:** Both layer toggles AND smart filters can narrow event counts. The CONTEXT.md says "both layer toggles AND smart filters narrow x; total is always unfiltered." This means:

- `total` = count from raw (unfiltered) events in the store
- `x` = count from events that pass BOTH smart filters AND the relevant layer toggle
- If a toggle like showAirstrikes is OFF, that category's x becomes 0 while total stays the same
- If showAirstrikes is OFF, the airstrike counter row shows "0/12 0%"

### Anti-Patterns to Avoid

- **Creating a new store for counter state:** Counters are pure derivations of existing data. Adding a store would duplicate state.
- **Using setInterval for counter refresh:** Counters recompute reactively via Zustand subscriptions. No polling needed.
- **Accumulating counts across refreshes:** Each counter reflects the current dataset only. When GDELT refreshes with new data, counters show new totals, not session cumulative.

## Don't Hand-Roll

| Problem                   | Don't Build                         | Use Instead                                                       | Why                                                                                        |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Event categorization      | Custom grouping logic               | `CONFLICT_TOGGLE_GROUPS` from `src/types/ui.ts`                   | Already defines the 3 groups; single source of truth                                       |
| Filtered entity arrays    | Custom filter pipeline              | `useFilteredEntities` hook                                        | Already applies all smart filters to all entity types                                      |
| Filter activity detection | Custom "is any filter active" check | Compare filtered vs. unfiltered count directly                    | Simpler than checking individual filter state; accounts for both toggles and smart filters |
| Number formatting         | Manual comma insertion              | `Intl.NumberFormat` or `toLocaleString()`                         | Handles all locales, edge cases (negatives, decimals)                                      |
| Color constants           | Hardcoded hex strings               | `ENTITY_DOT_COLORS` from `src/components/map/layers/constants.ts` | Already defines dot colors for airstrikes, groundCombat, targeted                          |

**Key insight:** This phase is purely compositional -- every data source, filter, and grouping constant already exists. The work is wiring them together in a new UI component.

## Common Pitfalls

### Pitfall 1: Fatalities Counter Always Shows 0

**What goes wrong:** The fatalities counter is specified in CONTEXT.md, but GDELT (the active default source) always sets `fatalities: 0` (see `server/adapters/gdelt.ts:186`). ACLED does track fatalities but is not the active source.
**Why it happens:** GDELT event data doesn't include casualty information.
**How to avoid:** Implement the fatalities row as specified (it still sums `data.fatalities` across events), but expect it to show 0 with GDELT. If ACLED is activated later, the counter will work automatically.
**Warning signs:** N/A -- this is a known data limitation, not a bug.

### Pitfall 2: Re-render Cascade from Multiple Store Subscriptions

**What goes wrong:** CountersSlot subscribes to flightStore, eventStore, filterStore, and uiStore. Each store update triggers a re-render.
**Why it happens:** Multiple `useStore(s => s.field)` selectors in the same component.
**How to avoid:** Use individual scalar selectors (`s => s.showAirstrikes`) not object selectors. Compute derived values in `useMemo`. The existing `useFilteredEntities` already handles the heavy lifting with `useShallow`.
**Warning signs:** React DevTools showing excessive re-renders on CountersSlot.

### Pitfall 3: Delta Flash on Initial Mount

**What goes wrong:** When the component first mounts, useRef(initialValue) and the first render value match, so no delta shows. But if the component unmounts and remounts (e.g., collapse/expand), the ref resets while the store value may have changed.
**Why it happens:** useRef resets on unmount. If CountersSlot is collapsed, the counter content unmounts.
**How to avoid:** Accept this behavior -- it's the same as the existing DetailValue flash pattern. When the panel re-expands, no false delta will show because the ref initializes to the current value.
**Warning signs:** Green "+N" appearing when expanding a collapsed panel.

### Pitfall 4: Division by Zero in Percentage

**What goes wrong:** When total is 0 (no events loaded yet), `filtered/total * 100` produces NaN or Infinity.
**Why it happens:** Edge case on initial load or when event store is empty.
**How to avoid:** Guard: `total > 0 ? Math.round((filtered / total) * 100) : 0`. Also, when total is 0, filtered is also 0 and `isFiltered` is false, so ratio format won't render anyway.
**Warning signs:** "NaN%" or "Infinity%" displayed in the UI.

### Pitfall 5: Layer Toggle vs. Smart Filter Distinction for "Filtered" State

**What goes wrong:** Confusing which filters contribute to the "x" in the ratio. Both layer toggles AND smart filters narrow x.
**Why it happens:** CONTEXT.md explicitly says "both layer toggles AND smart filters narrow x; total is always unfiltered."
**How to avoid:** For event counters: `total` = count from `rawEvents` (unfiltered store data). `filtered` = count from events that pass smart filters AND are in a toggle-enabled category. Use `useFilteredEntities()` for smart-filter-passing events, then apply toggle check on top.
**Warning signs:** Ratio showing when no filters/toggles are active, or not showing when toggles are off.

## Code Examples

### Counter Data Hook Structure

```typescript
// src/components/counters/useCounterData.ts
import { useMemo } from 'react';
import { useFlightStore } from '@/stores/flightStore';
import { useEventStore } from '@/stores/eventStore';
import { useUIStore } from '@/stores/uiStore';
import { useFilteredEntities } from '@/hooks/useFilteredEntities';
import { CONFLICT_TOGGLE_GROUPS } from '@/types/ui';

export interface CounterValues {
  // Flight counters (always simple count, no ratio)
  iranianFlights: number;
  unidentifiedFlights: number;

  // Event counters (filtered/total for ratio display)
  airstrikes: { filtered: number; total: number };
  groundCombat: { filtered: number; total: number };
  targeted: { filtered: number; total: number };
  totalEvents: { filtered: number; total: number };
  fatalities: { filtered: number; total: number };
}
```

### CounterRow Component Pattern

```typescript
// src/components/counters/CounterRow.tsx
// Follows ToggleRow pattern from LayerTogglesSlot
interface CounterRowProps {
  label: string;
  filtered: number;
  total: number;
  showRatio: boolean; // true for events, false for flights
  color?: string; // dot color for event rows
  delta: number | null; // green +N display
}
```

### CSS Keyframe for Delta Fade

```css
/* In src/styles/app.css */
@keyframes delta-fade {
  0% {
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.animate-delta {
  animation: delta-fade 3s ease-out forwards;
}
```

### Existing Pattern Reference: Toggle-Aware Event Counting

```typescript
// From StatusPanel.tsx lines 76-82 -- established pattern for toggle-gated counting
let visibleEvents = 0;
if (showEvents) {
  if (showAirstrikes)
    visibleEvents += events.filter((e) =>
      (CONFLICT_TOGGLE_GROUPS.showAirstrikes as readonly string[]).includes(e.type),
    ).length;
  if (showGroundCombat)
    visibleEvents += events.filter((e) =>
      (CONFLICT_TOGGLE_GROUPS.showGroundCombat as readonly string[]).includes(e.type),
    ).length;
  if (showTargeted)
    visibleEvents += events.filter((e) =>
      (CONFLICT_TOGGLE_GROUPS.showTargeted as readonly string[]).includes(e.type),
    ).length;
}
```

### Number Formatting

```typescript
// Use Intl.NumberFormat for comma-separated numbers
const fmt = new Intl.NumberFormat('en-US');
// fmt.format(12345) => "12,345"
// fmt.format(0) => "0"
```

## State of the Art

| Old Approach                           | Current Approach             | When Changed | Impact                                                       |
| -------------------------------------- | ---------------------------- | ------------ | ------------------------------------------------------------ |
| DetailValue flash (600ms bg highlight) | Delta text "+N" with 3s fade | Phase 12     | Different UX: flash highlights change, delta shows magnitude |
| StatusPanel simple counts              | CountersSlot ratio display   | Phase 12     | Richer information: filtered/total with percentage           |

**Deprecated/outdated:**

- Nothing in this phase touches deprecated APIs or patterns.

## Open Questions

1. **Fatalities always 0 with GDELT**
   - What we know: GDELT adapter hardcodes `fatalities: 0`. ACLED extracts real fatalities but is not the active source.
   - What's unclear: Whether the user is aware this row will show 0.
   - Recommendation: Implement as specified. The row is ready for ACLED data if it becomes active. Consider a subtle "N/A" or "--" when all fatalities are 0, but CONTEXT.md says to show the count, so show "0".

2. **Toggle-OFF event rows: show "0/N 0%" or hide the row?**
   - What we know: CONTEXT.md says "both layer toggles AND smart filters narrow x." When showAirstrikes is OFF, the airstrike x is 0.
   - What's unclear: Whether a row with "0/12 0%" is useful or just noise.
   - Recommendation: Show the ratio as specified -- "0/12 0%" communicates that data exists but is toggled off. The total (12) is still informative.

## Validation Architecture

### Test Framework

| Property           | Value                                                |
| ------------------ | ---------------------------------------------------- |
| Framework          | Vitest + jsdom                                       |
| Config file        | `vite.config.ts` (test section)                      |
| Quick run command  | `npx vitest run src/__tests__/CountersSlot.test.tsx` |
| Full suite command | `npx vitest run`                                     |

### Phase Requirements -> Test Map

| Req ID   | Behavior                                  | Test Type | Automated Command                                        | File Exists? |
| -------- | ----------------------------------------- | --------- | -------------------------------------------------------- | ------------ |
| STAT-01a | Counter categories display correct values | unit      | `npx vitest run src/__tests__/CountersSlot.test.tsx -x`  | No -- Wave 0 |
| STAT-01b | Counters update when store data changes   | unit      | `npx vitest run src/__tests__/CountersSlot.test.tsx -x`  | No -- Wave 0 |
| STAT-01c | Filter-aware ratio display (x/total %)    | unit      | `npx vitest run src/__tests__/CountersSlot.test.tsx -x`  | No -- Wave 0 |
| STAT-01d | Delta +N display and fade behavior        | unit      | `npx vitest run src/__tests__/CountersSlot.test.tsx -x`  | No -- Wave 0 |
| STAT-01e | Counter data hook computes correct values | unit      | `npx vitest run src/__tests__/useCounterData.test.ts -x` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/CountersSlot.test.tsx src/__tests__/useCounterData.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/CountersSlot.test.tsx` -- covers STAT-01a through STAT-01d (component rendering, ratio display, delta)
- [ ] `src/__tests__/useCounterData.test.ts` -- covers STAT-01e (hook computation logic with mock store data)

## Sources

### Primary (HIGH confidence)

- Project codebase direct inspection -- all files listed in Code Examples and Architecture Patterns sections
- `src/types/ui.ts` -- CONFLICT_TOGGLE_GROUPS, LayerToggles, UIState (verified lines 8-100)
- `server/types.ts` -- ConflictEventEntity.data.fatalities field (verified line 58)
- `server/adapters/gdelt.ts` -- fatalities hardcoded to 0 (verified line 186)
- `src/hooks/useFilteredEntities.ts` -- established filter pipeline (verified full file)
- `src/components/ui/StatusPanel.tsx` -- toggle-gated counting pattern (verified lines 66-82)
- `src/components/detail/DetailValue.tsx` -- flash-on-change pattern (verified full file)
- `src/components/layout/CountersSlot.tsx` -- existing scaffold (verified full file)
- `src/components/map/layers/constants.ts` -- ENTITY_DOT_COLORS (verified lines 14-22)
- `src/styles/app.css` -- existing keyframe animations (verified lines 67-74)

### Secondary (MEDIUM confidence)

- None needed -- this phase is purely internal component composition

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- no new dependencies, entirely existing project libraries
- Architecture: HIGH -- follows established patterns (useMemo derivation, useRef for previous values, OverlayPanel composition)
- Pitfalls: HIGH -- all pitfalls identified from direct code inspection (GDELT fatalities=0, division by zero, re-render cascades)

**Research date:** 2026-03-18
**Valid until:** Indefinite -- no external dependencies or APIs involved
