# Phase 10: Detail Panel - Research

**Researched:** 2026-03-17
**Domain:** React UI panel with real-time entity data, Zustand cross-store lookup, CSS animations, Clipboard API
**Confidence:** HIGH

## Summary

Phase 10 implements a click-to-inspect detail panel that shows expanded, live-updating entity stats. The core challenge is cross-store entity lookup (the selected entity ID lives in `uiStore`, but entity data lives across `flightStore`, `shipStore`, and `eventStore`), combined with real-time flash-on-change animations and a "lost contact" state when entities disappear between polls.

The existing codebase provides strong foundations: `DetailPanelSlot` is already stubbed with slide-in/out transitions, `uiStore` has `selectedEntityId`/`isDetailPanelOpen` state and actions, `EntityTooltip` has per-type content renderers to expand upon, and `useEntityLayers` already demonstrates cross-store entity lookup via the `activeEntity` useMemo. The UI repositioning (left-side panels) is a layout-only change in `AppShell.tsx`.

No new libraries are needed. All patterns use built-in React hooks, CSS animations via Tailwind `@keyframes`, and the native `navigator.clipboard` API.

**Primary recommendation:** Build a `useSelectedEntity` hook that returns `{ entity: MapEntity | null, isLost: boolean, lastSeen: number }` by searching across all three stores, caching the last-known entity when it disappears from data. Wire this into the existing `DetailPanelSlot` with per-type content sections expanded from `EntityTooltip` patterns.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Content depth: Everything from tooltip PLUS coordinates (lat/lng), last-updated relative timestamp, and data source label
- Dual units for flights: both metric and aviation units (altitude: ft / m, speed: kn / m/s, vertical rate: ft/min / m/s)
- Coordinates shown with copy-to-clipboard button
- Flash on change: values that changed on poll refresh briefly flash a highlight color then fade back
- Relative timestamp: "Updated Xs ago" ticking up between polls, resets on each successful poll
- Lost contact state: entity disappears from data, panel stays open with last known data grayed out + "Lost contact" indicator, user must manually close
- Single click on entity opens detail panel (or swaps content instantly if already open)
- Instant content swap -- no slide-out/slide-in animation when switching entities
- Dismiss methods: Close button, Escape key, or clicking the same entity again
- Clicking empty map does NOT dismiss the panel -- panel persists until explicitly closed
- No camera movement on selection
- Right-side slide-out panel, 360px width
- Overlay on top of map, not pushing viewport
- Full height, same slide-in animation as existing stub
- Header: colored dot (entity color) + type label + entity name/callsign
- Data grouped into labeled sections for scannability
- StatusPanel, CountersSlot, and LayerTogglesSlot move from top-right to top-left
- Left-side vertical stack order: TitleSlot -> StatusPanel -> CountersSlot -> LayerTogglesSlot
- Right side exclusively reserved for the detail panel
- Update CSS variable: --width-detail-panel: 360px (was 320px)

### Claude's Discretion

- Source article link style for conflict events (button vs inline URL)
- Whether hover tooltip remains visible while detail panel is open for a different entity
- Exact section groupings per entity type (e.g. "Position", "Movement", "Identity")
- Flash highlight color and animation duration
- "Lost contact" visual treatment (grayed out approach)
- Close button style (X icon vs text)

### Deferred Ideas (OUT OF SCOPE)

- Nearby entities section in detail panel
- Raw data dump toggle for power users
- Map camera pan-to-entity on selection
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                        | Research Support                                                                                                                                   |
| ------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| CTRL-02 | Detail panel on entity click showing live stats (speed, heading, origin, metadata) | Cross-store entity lookup hook, per-type content sections, flash-on-change animation, lost contact state, UI repositioning -- all researched below |

</phase_requirements>

## Standard Stack

### Core

| Library      | Version | Purpose                                     | Why Standard                                    |
| ------------ | ------- | ------------------------------------------- | ----------------------------------------------- |
| React        | ^19.1.0 | Component rendering, hooks                  | Already in project                              |
| Zustand      | ^5.0.11 | State management, cross-store entity lookup | Already in project, curried pattern established |
| Tailwind CSS | ^4.2.1  | Styling, CSS-first @theme config            | Already in project                              |

### Supporting

| Library             | Version     | Purpose                       | When to Use               |
| ------------------- | ----------- | ----------------------------- | ------------------------- |
| navigator.clipboard | Browser API | Copy coordinates to clipboard | Copy button click handler |

### Alternatives Considered

| Instead of           | Could Use               | Tradeoff                                                                                            |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| Custom relative time | react-timeago           | Adds dependency for trivial 1s interval -- project already has `useUtcClock` pattern in StatusPanel |
| CSS keyframe flash   | framer-motion           | Overkill for a simple opacity/background flash animation                                            |
| Custom clipboard     | react-copy-to-clipboard | Adds dependency for 3-line `navigator.clipboard.writeText()` call                                   |

**Installation:**

```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── hooks/
│   └── useSelectedEntity.ts       # Cross-store entity lookup + lost contact state
├── components/
│   └── layout/
│       └── DetailPanelSlot.tsx     # Rewrite existing stub with full content
│   └── detail/                     # NEW: per-type detail content components
│       ├── FlightDetail.tsx        # Flight-specific sections
│       ├── ShipDetail.tsx          # Ship-specific sections
│       ├── EventDetail.tsx         # Drone/missile event sections
│       └── DetailValue.tsx         # Reusable value cell with flash-on-change
├── styles/
│   └── app.css                     # Add flash keyframe, update --width-detail-panel
```

### Pattern 1: Cross-Store Entity Lookup Hook

**What:** A custom hook that finds the selected entity across all three data stores and tracks "lost contact" state
**When to use:** Any time the detail panel needs the current entity data
**Example:**

```typescript
// useSelectedEntity.ts
import { useMemo, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useFlightStore } from '@/stores/flightStore';
import { useShipStore } from '@/stores/shipStore';
import { useEventStore } from '@/stores/eventStore';
import type { MapEntity } from '@/types/entities';

interface SelectedEntityResult {
  entity: MapEntity | null; // current or last-known entity data
  isLost: boolean; // true when entity disappeared from all stores
  lastSeen: number; // timestamp of last successful match
}

export function useSelectedEntity(): SelectedEntityResult {
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const flights = useFlightStore((s) => s.flights);
  const ships = useShipStore((s) => s.ships);
  const events = useEventStore((s) => s.events);

  const lastKnownRef = useRef<{ entity: MapEntity; lastSeen: number } | null>(null);

  return useMemo(() => {
    if (!selectedId) {
      lastKnownRef.current = null;
      return { entity: null, isLost: false, lastSeen: 0 };
    }

    const found =
      flights.find((f) => f.id === selectedId) ??
      ships.find((s) => s.id === selectedId) ??
      events.find((e) => e.id === selectedId) ??
      null;

    if (found) {
      lastKnownRef.current = { entity: found, lastSeen: Date.now() };
      return { entity: found, isLost: false, lastSeen: Date.now() };
    }

    // Entity disappeared -- return last known data
    if (lastKnownRef.current) {
      return {
        entity: lastKnownRef.current.entity,
        isLost: true,
        lastSeen: lastKnownRef.current.lastSeen,
      };
    }

    return { entity: null, isLost: false, lastSeen: 0 };
  }, [selectedId, flights, ships, events]);
}
```

**Note:** The existing `useEntityLayers` hook already demonstrates this cross-store lookup pattern (lines 206-212), so this is a proven approach within the codebase.

### Pattern 2: Flash-on-Change with CSS Animation

**What:** A reusable component that detects value changes and applies a brief CSS highlight flash
**When to use:** Every data value cell in the detail panel
**Example:**

```typescript
// DetailValue.tsx
import { useRef, useEffect, useState } from 'react';

interface DetailValueProps {
  label: string;
  value: string;
  unit?: string;
}

export function DetailValue({ label, value, unit }: DetailValueProps) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value && prevRef.current !== '') {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      <span className={`tabular-nums text-text-primary ${flash ? 'animate-flash' : ''}`}>
        {value}{unit && <span className="ml-1 text-text-muted">{unit}</span>}
      </span>
    </div>
  );
}
```

```css
/* In app.css */
@keyframes flash {
  0% {
    background-color: rgba(234, 179, 8, 0.3);
  }
  100% {
    background-color: transparent;
  }
}

.animate-flash {
  animation: flash 600ms ease-out;
}
```

### Pattern 3: Relative Timestamp Ticker

**What:** "Updated Xs ago" that ticks up every second, matching the existing `useUtcClock` pattern in StatusPanel
**When to use:** Detail panel header/footer showing data freshness
**Example:**

```typescript
function useRelativeTime(timestamp: number | null): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!timestamp) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (!timestamp) return '--';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 1) return 'just now';
  return `${seconds}s ago`;
}
```

This follows the exact pattern already used by `useUtcClock` in `StatusPanel.tsx` (lines 8-15).

### Pattern 4: Copy-to-Clipboard

**What:** Async clipboard write with brief visual feedback
**When to use:** Coordinate copy button in detail panel
**Example:**

```typescript
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// In component:
const [copied, setCopied] = useState(false);
const handleCopy = async () => {
  const ok = await copyToClipboard(`${entity.lat.toFixed(6)}, ${entity.lng.toFixed(6)}`);
  if (ok) {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
};
```

### Pattern 5: Escape Key Dismiss

**What:** Global keydown listener for Escape to close the panel
**When to use:** Detail panel open state
**Example:**

```typescript
useEffect(() => {
  if (!isOpen) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [isOpen, close]);
```

### Anti-Patterns to Avoid

- **Merging click handler with empty-map dismiss:** CONTEXT.md explicitly says clicking empty map does NOT dismiss the panel. The existing `handleDeckClick` in BaseMap already clears `selectedEntityId` on empty click -- this needs to be changed so it does NOT clear when the detail panel is open.
- **Slide animation on entity swap:** CONTEXT.md says instant content swap, no slide-out/slide-in animation when switching entities. Only animate the initial open and final close.
- **Storing entity data in uiStore:** Entity data belongs in the domain stores (flight/ship/event). The detail panel should read from those stores using the `selectedEntityId` as a lookup key, not duplicate data into `uiStore`.
- **Using setInterval for relative timestamp in a way that doesn't clean up:** Always return cleanup from useEffect.

## Don't Hand-Roll

| Problem                        | Don't Build                | Use Instead                                                                                                                  | Why                                                                    |
| ------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Unit conversion (m/s to knots) | Complex conversion library | Inline arithmetic: `velocity * 1.94384` (m/s to kn), `altitude * 3.28084` (m to ft), `verticalRate * 196.85` (m/s to ft/min) | These are simple multiplication factors, standard aviation conversions |
| Clipboard copy                 | Custom fallback chain      | `navigator.clipboard.writeText()`                                                                                            | Modern API, project runs on HTTPS/localhost, no IE11 support needed    |

**Key insight:** This phase is almost entirely UI composition and state wiring. There are no complex algorithms or data transformations -- the hard parts are getting the interaction model right (click/dismiss/swap/lost-contact) and the layout repositioning.

## Common Pitfalls

### Pitfall 1: Empty-Map Click Clears Selection

**What goes wrong:** The existing `handleDeckClick` in BaseMap.tsx (line 71-76) clears `selectedEntityId` when clicking empty space. This contradicts the CONTEXT.md requirement that clicking empty map does NOT dismiss the panel.
**Why it happens:** The current click handler was built before the detail panel behavior was specified.
**How to avoid:** Modify `handleDeckClick` to NOT clear `selectedEntityId` when `info.object` is null. Only clear it when the user clicks the SAME entity again (toggle behavior). The panel should only be dismissed via Close button, Escape key, or re-clicking the same entity.
**Warning signs:** Panel closes unexpectedly when user clicks map to pan/rotate.

### Pitfall 2: Stale Ref for Lost Contact

**What goes wrong:** Using `useRef` to cache the last-known entity works for maintaining data across renders, but the ref value itself won't trigger a re-render when the entity transitions from "found" to "lost".
**Why it happens:** React refs don't trigger re-renders.
**How to avoid:** The `useMemo` dependency on the store arrays (flights/ships/events) will re-run when data changes, so the `isLost` return value will naturally update. The ref is only used for caching, not for driving renders.
**Warning signs:** Panel doesn't show "Lost contact" indicator when entity disappears.

### Pitfall 3: Flash Animation on Initial Render

**What goes wrong:** The flash animation fires when the detail panel first opens or when switching entities, not just when data changes within the same entity.
**Why it happens:** The `prevRef` starts empty, so the first value always looks like a "change".
**How to avoid:** Initialize `prevRef` to the current value (not empty string) and only trigger flash when `prevRef.current !== value && prevRef.current !== ''`. Or skip the first render by tracking mount state.
**Warning signs:** Everything flashes yellow when clicking an entity.

### Pitfall 4: Detail Panel Overlaps Selected Entity

**What goes wrong:** A right-side 360px panel could obscure entities on the right edge of the map.
**Why it happens:** The panel is a fixed overlay.
**How to avoid:** This is inherent to the overlay design and acceptable per CONTEXT.md ("overlay on top of map, not pushing viewport"). The user can pan the map to reveal the entity. Success criteria #4 says "detail panel does not obscure the selected entity" -- this is satisfied by the panel being on the right while most map content is centered, but may need a note in docs.
**Warning signs:** User feedback about obscured entities.

### Pitfall 5: Re-render Storm from Cross-Store Subscriptions

**What goes wrong:** The `useSelectedEntity` hook subscribes to flights, ships, and events arrays. If all three update frequently, the detail panel re-renders on every poll cycle for every data source.
**Why it happens:** Zustand selector `s => s.flights` returns a new array reference on every `setFlightData` call.
**How to avoid:** This is acceptable because: (a) the detail panel is a single component, not a list; (b) poll cycles are 5-30s apart; (c) `useMemo` inside the hook prevents downstream re-renders when the found entity hasn't changed. If performance becomes an issue, add a shallow-equality check on the returned entity.
**Warning signs:** React DevTools showing excessive re-renders of detail panel.

### Pitfall 6: UI Repositioning Breaks Test Assertions

**What goes wrong:** Moving StatusPanel/CountersSlot/LayerTogglesSlot from top-right to top-left breaks `AppShell.test.tsx` assertions that check for element positioning.
**Why it happens:** Tests may rely on DOM structure or CSS class assertions.
**How to avoid:** The existing AppShell tests only check for `getByTestId` presence, not position classes. Review tests after repositioning to ensure they still pass.
**Warning signs:** Test failures in AppShell.test.tsx after layout changes.

## Code Examples

Verified patterns from existing codebase:

### Zustand Curried Store Pattern (from uiStore.ts)

```typescript
export const useUIStore = create<UIState>()((set, get) => ({
  // state
  selectedEntityId: null,
  // actions
  selectEntity: (id) => set({ selectedEntityId: id }),
}));
```

### Cross-Store Entity Lookup (from useEntityLayers.ts, lines 206-212)

```typescript
const activeEntity = useMemo<MapEntity | null>(() => {
  if (!activeId) return null;
  return (
    flights.find((f) => f.id === activeId) ??
    ships.find((s) => s.id === activeId) ??
    events.find((e) => e.id === activeId) ??
    null
  );
}, [activeId, flights, ships, events]);
```

### Slide-in/out Transition (from existing DetailPanelSlot.tsx)

```typescript
<div className={`absolute top-0 left-0 z-[var(--z-panel)] h-full
    w-[var(--width-detail-panel)] transform transition-transform
    duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
```

**Note:** This currently slides from left. Must change to right-side: `right-0` positioning with `translate-x-full` for hidden state.

### OverlayPanel Styling (from OverlayPanel.tsx)

```typescript
<div className="rounded-lg border border-border bg-surface-overlay px-4 py-3 shadow-lg backdrop-blur-sm">
```

### Per-Type Content Rendering (from EntityTooltip.tsx)

```typescript
{entity.type === 'flight' && <FlightContent entity={entity as FlightEntity} />}
{entity.type === 'ship' && <ShipContent entity={entity as ShipEntity} />}
{(entity.type === 'drone' || entity.type === 'missile') && <EventContent entity={entity as ConflictEventEntity} />}
```

### UTC Clock Pattern (from StatusPanel.tsx, reusable for relative time)

```typescript
function useUtcClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toISOString().slice(11, 19) + 'Z';
}
```

## State of the Art

| Old Approach                   | Current Approach                  | When Changed | Impact                                |
| ------------------------------ | --------------------------------- | ------------ | ------------------------------------- |
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | 2020+        | Async, promise-based, simpler         |
| jQuery flash effects           | CSS `@keyframes` animation        | 2018+        | No JS library needed, GPU-accelerated |
| Prop drilling entity data      | Zustand cross-store selectors     | Zustand 4+   | Clean separation of concerns          |

**Deprecated/outdated:**

- `document.execCommand('copy')`: Deprecated, but still works as fallback. Not needed for this project (localhost/HTTPS).

## Open Questions

1. **Hover tooltip coexistence with detail panel**
   - What we know: CONTEXT.md marks this as Claude's discretion
   - Recommendation: Keep hover tooltip visible while detail panel is open. The tooltip shows different information (quick preview at cursor position) while the detail panel shows expanded data for a pinned entity. They serve complementary purposes. The tooltip already has position-aware clamping that avoids the edges.

2. **Flash highlight color**
   - What we know: CONTEXT.md marks this as Claude's discretion
   - Recommendation: Use the existing `accent-yellow` (`#eab308`) at 30% opacity for the flash background. This matches the flight entity color and the tactical HUD aesthetic. Duration: 600ms ease-out (fast enough to feel responsive, slow enough to be noticeable).

3. **Section groupings per entity type**
   - What we know: CONTEXT.md marks this as Claude's discretion
   - Recommendation for flights: "Identity" (callsign, ICAO, origin, status, unidentified flag), "Position" (lat/lng with copy, altitude in ft/m), "Movement" (speed in kn/m/s, heading, vertical rate in ft-min/m-s), "Source" (data source label, updated timestamp)
   - Recommendation for ships: "Identity" (name, MMSI), "Position" (lat/lng with copy), "Movement" (speed, course, heading), "Source" (data source, updated)
   - Recommendation for events: "Event" (type, sub-type, CAMEO, Goldstein scale), "Location" (name, lat/lng with copy), "Actors" (actor1, actor2), "Source" (source link, date, updated)

4. **Data source label content**
   - What we know: CONTEXT.md says "data source label" in expanded view
   - Recommendation: For flights, show the active flight source name (OpenSky/ADS-B Exchange/adsb.lol) from `flightStore.activeSource`. For ships, show "AISStream". For events, show "GDELT v2".

## Validation Architecture

### Test Framework

| Property           | Value                           |
| ------------------ | ------------------------------- |
| Framework          | Vitest 4.1.0 with jsdom         |
| Config file        | `vite.config.ts` (test section) |
| Quick run command  | `npx vitest run src/__tests__/` |
| Full suite command | `npx vitest run`                |

### Phase Requirements -> Test Map

| Req ID   | Behavior                                                 | Test Type | Automated Command                                           | File Exists?                 |
| -------- | -------------------------------------------------------- | --------- | ----------------------------------------------------------- | ---------------------------- |
| CTRL-02a | Click entity opens detail panel with correct content     | unit      | `npx vitest run src/__tests__/DetailPanel.test.tsx -x`      | No - Wave 0                  |
| CTRL-02b | Detail panel updates in real-time on store changes       | unit      | `npx vitest run src/__tests__/useSelectedEntity.test.ts -x` | No - Wave 0                  |
| CTRL-02c | Close button, Escape, re-click same entity dismiss panel | unit      | `npx vitest run src/__tests__/DetailPanel.test.tsx -x`      | No - Wave 0                  |
| CTRL-02d | Lost contact state when entity disappears                | unit      | `npx vitest run src/__tests__/useSelectedEntity.test.ts -x` | No - Wave 0                  |
| CTRL-02e | Flash-on-change animation triggers on value update       | unit      | `npx vitest run src/__tests__/DetailValue.test.tsx -x`      | No - Wave 0                  |
| CTRL-02f | Copy coordinates to clipboard                            | unit      | `npx vitest run src/__tests__/DetailPanel.test.tsx -x`      | No - Wave 0                  |
| CTRL-02g | UI repositioned (panels to left, detail panel right)     | unit      | `npx vitest run src/__tests__/AppShell.test.tsx -x`         | Yes - existing, needs update |
| CTRL-02h | Empty map click does NOT dismiss panel                   | unit      | `npx vitest run src/__tests__/BaseMap.test.tsx -x`          | Yes - existing, needs update |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/useSelectedEntity.test.ts` -- covers CTRL-02b, CTRL-02d (cross-store lookup, lost contact)
- [ ] `src/__tests__/DetailPanel.test.tsx` -- covers CTRL-02a, CTRL-02c, CTRL-02f (content rendering, dismiss, clipboard)
- [ ] `src/__tests__/DetailValue.test.tsx` -- covers CTRL-02e (flash-on-change animation class)
- [ ] Update `src/__tests__/AppShell.test.tsx` -- covers CTRL-02g (left-side panel positioning)
- [ ] Update `src/__tests__/BaseMap.test.tsx` -- covers CTRL-02h (empty click behavior change)

## Sources

### Primary (HIGH confidence)

- Existing codebase: `src/stores/uiStore.ts`, `src/components/layout/DetailPanelSlot.tsx`, `src/components/map/EntityTooltip.tsx`, `src/hooks/useEntityLayers.ts`, `src/components/map/BaseMap.tsx` -- verified by direct file reads
- Existing codebase: `server/types.ts` -- entity data model with all fields available for detail panel
- Existing codebase: `src/components/ui/StatusPanel.tsx` -- `useUtcClock` pattern for 1s interval ticker

### Secondary (MEDIUM confidence)

- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) -- `navigator.clipboard.writeText()` browser support and usage
- [Tailwind CSS Animation docs](https://tailwindcss.com/docs/animation) -- custom `@keyframes` in Tailwind v4

### Tertiary (LOW confidence)

- None -- all findings verified against existing codebase or official documentation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- no new libraries, all patterns exist in codebase
- Architecture: HIGH -- extends proven patterns (cross-store lookup from useEntityLayers, per-type rendering from EntityTooltip, 1s ticker from StatusPanel)
- Pitfalls: HIGH -- identified from direct code inspection of existing click handlers and store patterns

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- no external API changes, UI-only phase)
