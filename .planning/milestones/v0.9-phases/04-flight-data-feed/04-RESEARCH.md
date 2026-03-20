# Phase 4: Flight Data Feed - Research

**Researched:** 2026-03-15
**Domain:** Frontend data polling, Zustand state management, API integration
**Confidence:** HIGH

## Summary

Phase 4 connects the frontend to the Phase 3 `/api/flights` proxy endpoint, establishing a polling loop that fetches live flight positions every 5 seconds and stores them in Zustand state. The phase is narrowly scoped: no map rendering (Phase 5), no UI indicators beyond store metadata. The existing server infrastructure (OpenSky adapter, flights route, EntityCache) provides the data pipeline -- Phase 4 builds the frontend consumer.

The core technical challenge is implementing a reliable polling loop that respects browser tab visibility, handles connection failures gracefully, tracks data freshness, and stays within OpenSky API credit limits. The approach is a custom `useFlightPolling` hook that orchestrates `setInterval`-based polling with `document.visibilitychange` integration, writing results into a dedicated Zustand flight store.

**Primary recommendation:** Use a custom React hook (`useFlightPolling`) with recursive `setTimeout` (not `setInterval`) for polling, a dedicated `useFlightStore` following the existing Zustand curried pattern, and the Page Visibility API to pause/resume polling on tab visibility changes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Filter out onGround=true flights at the proxy adapter level (server/adapters/opensky.ts)
- Only airborne flights reach the frontend -- ground traffic is noise for an intelligence dashboard
- No-callsign flights (hex-only, often military) flagged with `unidentified: true` boolean in FlightEntity.data
- All airborne flights included regardless of callsign presence -- hex-only entries are often the most interesting
- Polling pauses completely when browser tab is hidden (no background requests)
- Immediate fresh fetch when tab regains focus, then resume normal interval
- 5s polling interval (matching original roadmap spec and OpenSky free-tier limit of ~1 req/5s)
- Store tracks full connection health: 'connected' | 'stale' | 'error' | 'loading'
- Track stale duration using lastFresh timestamp from CacheResponse -- enables "data is X minutes old" display in future phases
- On connection error, retry on normal 5s interval (no exponential backoff)
- Drop data after a staleness threshold (Claude decides exact threshold) -- prevents showing dangerously outdated positions
- No cap on flight count -- fetch all airborne flights in Iran bbox (200-500 typical, well within Deck.gl capacity)
- Full atomic replace on each poll -- entire flight array replaced, no merge-by-ID
- Flights that disappear from OpenSky response disappear from the map immediately
- Store exposes derived flightCount for display in counters card area
- Store includes lightweight metadata: lastFetchAt, flightCount, connectionStatus

### Claude's Discretion
- Polling mechanism choice (setInterval, React Query, custom hook)
- Exact staleness drop threshold
- Altitude noise filter threshold (if any)
- Zustand store structure and selector design
- Error handling implementation details
- Whether to use a single entity store or separate flight store

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Flight tracking via OpenSky/ADS-B (~5s refresh) | Custom polling hook with 5s interval, Zustand flight store, tab visibility pause, connection state tracking, stale data management. Server-side onGround filter and unidentified flag additions needed. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.11 | Flight data state management | Already installed, curried create pattern established in project |
| React 19 | ^19.1.0 | Custom hooks for polling lifecycle | Already installed, useEffect/useRef/useCallback for hook |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | - | No new dependencies needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom polling hook | TanStack Query | TanStack Query adds ~12KB and is designed for caching/deduplication -- overkill for a single-endpoint polling loop with full atomic replace. Custom hook is simpler, matches the project's minimal dependency philosophy. |
| Custom polling hook | React Query refetchInterval | Same overhead concern. Also introduces a second state management paradigm alongside Zustand. |
| setTimeout recursion | setInterval | setInterval does not wait for the async fetch to complete before scheduling next tick -- can cause overlapping requests. setTimeout recursion ensures sequential execution. |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
server/
  adapters/opensky.ts       # MODIFY: add onGround filter + unidentified flag
server/
  types.ts                  # MODIFY: add unidentified boolean to FlightEntity.data
src/
  types/entities.ts         # Already re-exports from server/types.ts (automatic)
  stores/flightStore.ts     # NEW: Zustand store for flight data + connection state
  hooks/useFlightPolling.ts # NEW: Polling orchestration hook
```

### Pattern 1: Zustand Flight Store (curried create pattern)
**What:** A dedicated flight store following the established `create<T>()()` pattern
**When to use:** For all flight data state (flights array, connection status, metadata)
**Example:**
```typescript
// Source: existing pattern from src/stores/mapStore.ts + src/stores/uiStore.ts
import { create } from 'zustand';
import type { FlightEntity, CacheResponse } from '@/types/entities';

type ConnectionStatus = 'connected' | 'stale' | 'error' | 'loading';

interface FlightState {
  flights: FlightEntity[];
  connectionStatus: ConnectionStatus;
  lastFetchAt: number | null;
  lastFresh: number | null;
  flightCount: number;
  setFlightData: (response: CacheResponse<FlightEntity[]>) => void;
  setError: () => void;
  setLoading: () => void;
  clearStaleData: () => void;
}

export const useFlightStore = create<FlightState>()((set) => ({
  flights: [],
  connectionStatus: 'loading',
  lastFetchAt: null,
  lastFresh: null,
  flightCount: 0,
  setFlightData: (response) =>
    set({
      flights: response.data,
      flightCount: response.data.length,
      connectionStatus: response.stale ? 'stale' : 'connected',
      lastFetchAt: Date.now(),
      lastFresh: response.stale ? undefined : Date.now(),
      // Keep existing lastFresh if response is stale
    }),
  setError: () => set({ connectionStatus: 'error' }),
  setLoading: () => set({ connectionStatus: 'loading' }),
  clearStaleData: () =>
    set({ flights: [], flightCount: 0, connectionStatus: 'error' }),
}));
```

### Pattern 2: Recursive setTimeout Polling Hook
**What:** Custom hook that fetches, updates store, then schedules next fetch after delay
**When to use:** For the 5s polling loop with tab visibility awareness
**Example:**
```typescript
// Source: community best practice (recursive setTimeout > setInterval for async)
import { useEffect, useRef, useCallback } from 'react';
import { useFlightStore } from '@/stores/flightStore';

const POLL_INTERVAL = 5_000;
const API_URL = '/api/flights'; // Vite proxy or direct to :3001

export function useFlightPolling() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setFlightData = useFlightStore(s => s.setFlightData);
  const setError = useFlightStore(s => s.setError);
  const setLoading = useFlightStore(s => s.setLoading);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFlightData(data);
    } catch {
      setError();
    }
  }, [setFlightData, setError]);

  const schedulePoll = useCallback(() => {
    timeoutRef.current = setTimeout(async () => {
      await fetchFlights();
      schedulePoll(); // recursive: schedule next after completion
    }, POLL_INTERVAL);
  }, [fetchFlights]);

  useEffect(() => {
    // Initial fetch immediately
    setLoading();
    fetchFlights().then(schedulePoll);

    // Visibility change handler
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else {
        // Tab regained focus: immediate fetch, then resume polling
        fetchFlights().then(schedulePoll);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchFlights, schedulePoll, setLoading]);
}
```

### Pattern 3: Server-Side onGround Filter + Unidentified Flag
**What:** Modify the OpenSky adapter to filter ground traffic and flag hex-only flights
**When to use:** Applied at the adapter level so all consumers get clean data
**Example:**
```typescript
// Source: CONTEXT.md locked decision
function normalizeFlightState(state: unknown[]): FlightEntity | null {
  const lat = state[6] as number | null;
  const lng = state[5] as number | null;
  if (lat == null || lng == null) return null;

  const onGround = (state[8] as boolean) ?? false;
  if (onGround) return null; // Filter ground traffic

  const icao24 = state[0] as string;
  const callsign = typeof state[1] === 'string' ? state[1].trim() : '';

  return {
    id: `flight-${icao24}`,
    type: 'flight',
    lat,
    lng,
    timestamp: Date.now(),
    label: callsign || icao24,
    data: {
      icao24,
      callsign: callsign || icao24,
      originCountry: (state[2] as string) ?? '',
      velocity: (state[9] as number | null) ?? null,
      heading: (state[10] as number | null) ?? null,
      altitude: (state[7] as number | null) ?? null,
      onGround: false, // Always false after filter
      verticalRate: (state[11] as number | null) ?? null,
      unidentified: callsign === '', // Hex-only flag
    },
  };
}
```

### Anti-Patterns to Avoid
- **setInterval for async polling:** Does not wait for fetch to complete; can pile up concurrent requests if network is slow. Use recursive setTimeout instead.
- **Merging flight arrays by ID:** User explicitly chose full atomic replace. Do not track individual flight lifecycle -- replace entire array on each poll.
- **Polling in background tabs:** Wastes API credits. Must pause when `document.visibilityState === 'hidden'`.
- **Storing fetch function in Zustand:** Keep the polling orchestration in the hook, not the store. Store should be pure state + setters.
- **Using AbortController across polls:** Each poll is a discrete fetch. AbortController adds complexity without benefit here (5s timeout is already short).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab visibility detection | Custom focus/blur listeners | `document.visibilitychange` + `document.visibilityState` | Standard Web API, handles all cases (tab switch, minimize, mobile app switch) |
| Polling orchestration | Bare setInterval in component | Custom `useFlightPolling` hook | Encapsulates cleanup, visibility, and error handling in one place |
| State management | React Context + useReducer | Zustand store | Project standard; supports selectors for minimal re-renders, testable outside React |

**Key insight:** The polling loop itself is simple enough that a custom hook is the right abstraction. TanStack Query would be overkill for a single endpoint with full atomic replace and no cache invalidation needs.

## Common Pitfalls

### Pitfall 1: Overlapping Fetch Requests
**What goes wrong:** If using `setInterval`, a slow network response means the next fetch fires before the previous one completes, leading to out-of-order state updates.
**Why it happens:** `setInterval` schedules callbacks at fixed intervals regardless of async completion.
**How to avoid:** Use recursive `setTimeout` -- schedule next poll only after current fetch resolves.
**Warning signs:** Console shows multiple concurrent "[flights] fetched" logs; flight count flickers.

### Pitfall 2: OpenSky API Credit Exhaustion
**What goes wrong:** Continuous 5s polling exhausts the 4000 daily API credits in ~1.8 hours.
**Why it happens:** Iran bbox (15 x 19.5 = 292.5 sq deg) costs 3 credits per /states/all request. At 1 req/5s = 17,280 req/day = 51,840 credits/day. Even with server-side 10s cache TTL, upstream calls at 1/10s = 8,640 * 3 = 25,920 credits/day.
**How to avoid:** The server route MUST check EntityCache first and only call OpenSky when cache is expired. With proper cache-first logic and 10s TTL: 8,640 req/day from frontend -> ~4,320 upstream calls -> 12,960 credits/day. Still exceeds 4,000. **The server-side cache TTL should effectively be the rate limiter.** Consider that the current route always fetches upstream (cache is error-fallback only). This must be fixed.
**Warning signs:** HTTP 429 from OpenSky; `X-Rate-Limit-Remaining` header approaching 0.

### Pitfall 3: Memory Leak from Uncleared Timers
**What goes wrong:** Component unmounts but setTimeout callback still fires, calling setState on unmounted store.
**Why it happens:** Forgot to clear timeout in useEffect cleanup or visibilitychange handler.
**How to avoid:** Always clear `timeoutRef.current` in cleanup. Use a ref to track the timeout ID.
**Warning signs:** Console warnings about state updates after unmount; stale polling continues.

### Pitfall 4: Stale Closure in setTimeout Callback
**What goes wrong:** The setTimeout callback captures an old version of the fetch function or store setter.
**Why it happens:** JavaScript closures capture variables at definition time, not execution time.
**How to avoid:** Use `useCallback` with proper dependencies, or use a ref to hold the latest callback (Dan Abramov's `useInterval` pattern).
**Warning signs:** Polling fetches with outdated parameters; state updates seem to "reset."

### Pitfall 5: Fetch URL Mismatch Between Dev and Prod
**What goes wrong:** Frontend tries to fetch from `http://localhost:3001/api/flights` which fails in production or with CORS issues in development.
**Why it happens:** Hardcoded API base URL.
**How to avoid:** Either configure a Vite dev proxy (`server.proxy` in vite.config.ts) to forward `/api/*` to `:3001`, or use an environment variable for the API base URL. Vite proxy is cleaner for development.
**Warning signs:** CORS errors in browser console; fetch fails with network error.

### Pitfall 6: Staleness Threshold Too Aggressive or Too Lenient
**What goes wrong:** Data cleared too early (flashing empty state on brief network hiccups) or stale positions shown for too long (misleading intelligence).
**Why it happens:** Wrong threshold for the domain.
**How to avoid:** Recommended threshold: **60 seconds** (12 missed polls). Flight positions become meaningfully outdated after ~1 minute at typical jet speeds (250m/s = 15km drift). Under 60s, brief hiccups are tolerated. Over 60s, positions are dangerously stale for intelligence use.
**Warning signs:** Users see empty map during brief WiFi drops (too aggressive); users see flights "frozen" in old positions (too lenient).

## Code Examples

Verified patterns from official sources and existing project code:

### Zustand Store Test Pattern (from existing mapStore.test.ts)
```typescript
// Source: src/__tests__/mapStore.test.ts -- established test pattern
import { useFlightStore } from '@/stores/flightStore';

describe('flightStore', () => {
  beforeEach(() => {
    useFlightStore.setState({
      flights: [],
      connectionStatus: 'loading',
      lastFetchAt: null,
      lastFresh: null,
      flightCount: 0,
    });
  });

  it('setFlightData updates flights and metadata', () => {
    const mockResponse = {
      data: [/* mock FlightEntity */],
      stale: false,
      lastFresh: Date.now(),
    };
    useFlightStore.getState().setFlightData(mockResponse);
    expect(useFlightStore.getState().flightCount).toBe(1);
    expect(useFlightStore.getState().connectionStatus).toBe('connected');
  });
});
```

### Page Visibility API Integration
```typescript
// Source: MDN Web Docs -- document.visibilitychange
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Pause polling -- clear any pending timeout
  } else {
    // Tab visible again -- fetch immediately, then resume interval
  }
});
```

### Server-Side Cache-First Pattern (fix for flights route)
```typescript
// Source: project pattern from EntityCache + route fix needed
flightsRouter.get('/', async (_req, res) => {
  // Check cache first to avoid unnecessary upstream calls
  const cached = flightCache.get();
  if (cached && !cached.stale) {
    return res.json(cached);
  }

  try {
    const flights = await fetchFlights(IRAN_BBOX);
    flightCache.set(flights);
    res.json({ data: flights, stale: false, lastFresh: Date.now() });
  } catch (err) {
    console.error('[flights] upstream error:', (err as Error).message);
    if (cached) {
      res.json(cached); // Serve stale cache on error
    } else {
      throw err;
    }
  }
});
```

### Vite Dev Proxy Configuration
```typescript
// Source: Vite docs -- dev server proxy
// In vite.config.ts, add to defineConfig:
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenSky Basic Auth | OAuth2 client credentials | March 2025 (new accounts), March 2026 (all accounts) | Project already uses OAuth2 -- no action needed |
| setInterval polling | Recursive setTimeout / TanStack Query | 2023+ | Prevents overlapping async requests |
| Separate fetch + state libs | Zustand actions with async fetch | Zustand 4+ | Clean pattern, no middleware needed |
| useEffect + fetch in components | Custom hooks | React 18+ | Reusable, testable, clean separation |

**Deprecated/outdated:**
- OpenSky Basic Authentication: Deprecated March 18, 2026 for all accounts. Project already uses OAuth2 -- safe.
- `@testing-library/react-hooks`: Merged into `@testing-library/react` v14+. Use `renderHook` from main package.

## Open Questions

1. **OpenSky API Credit Budget**
   - What we know: Iran bbox costs 3 credits/request. Authenticated users get 4,000/day. Contributing users get 8,000/day.
   - What's unclear: Whether the user's account is standard (4,000) or contributing (8,000). At best, 8,000/3 = 2,666 requests/day = 1 every 32 seconds.
   - Recommendation: Fix the server route to serve from cache first (not just on error). With a 10s server-side cache TTL, upstream calls drop to ~8,640/day max. This still exceeds even the 8,000 credit tier. Consider that the tab visibility pause will significantly reduce actual usage (user won't poll 24/7). Document the limitation but don't block on it -- the user is aware of free-tier constraints.

2. **Vite Dev Proxy vs Direct Fetch**
   - What we know: Currently no proxy configured. Server runs on :3001, client on :5173.
   - What's unclear: Whether CORS is sufficient (it is -- cors middleware already configured with `origin: 'http://localhost:5173'`).
   - Recommendation: Add a Vite dev proxy for `/api` to keep fetch URLs clean (just `/api/flights` instead of `http://localhost:3001/api/flights`). This also simplifies production deployment later.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1 with jsdom (frontend) + node (server) |
| Config file | vite.config.ts (test section) |
| Quick run command | `npx vitest run src/__tests__/flightStore.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01a | onGround flights filtered at adapter | unit | `npx vitest run server/__tests__/adapters/opensky.test.ts -x` | Exists (needs new test case) |
| DATA-01b | unidentified flag set for hex-only flights | unit | `npx vitest run server/__tests__/adapters/opensky.test.ts -x` | Exists (needs new test case) |
| DATA-01c | FlightEntity.data.unidentified type exists | unit | `npx vitest run server/__tests__/types.test.ts -x` | Exists (needs update) |
| DATA-01d | Flight store initial state correct | unit | `npx vitest run src/__tests__/flightStore.test.ts -x` | Wave 0 |
| DATA-01e | setFlightData updates store correctly | unit | `npx vitest run src/__tests__/flightStore.test.ts -x` | Wave 0 |
| DATA-01f | setFlightData marks stale when response.stale=true | unit | `npx vitest run src/__tests__/flightStore.test.ts -x` | Wave 0 |
| DATA-01g | setError sets connectionStatus to 'error' | unit | `npx vitest run src/__tests__/flightStore.test.ts -x` | Wave 0 |
| DATA-01h | clearStaleData empties flights and sets error | unit | `npx vitest run src/__tests__/flightStore.test.ts -x` | Wave 0 |
| DATA-01i | flightCount derived correctly | unit | `npx vitest run src/__tests__/flightStore.test.ts -x` | Wave 0 |
| DATA-01j | Polling hook fetches on mount | unit | `npx vitest run src/__tests__/useFlightPolling.test.ts -x` | Wave 0 |
| DATA-01k | Polling pauses on tab hidden | unit | `npx vitest run src/__tests__/useFlightPolling.test.ts -x` | Wave 0 |
| DATA-01l | Polling resumes with immediate fetch on tab visible | unit | `npx vitest run src/__tests__/useFlightPolling.test.ts -x` | Wave 0 |
| DATA-01m | Server route serves from cache when fresh | unit | `npx vitest run server/__tests__/server.test.ts -x` | Exists (needs new test case) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/flightStore.test.ts server/__tests__/adapters/opensky.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/flightStore.test.ts` -- covers DATA-01d through DATA-01i (store unit tests)
- [ ] `src/__tests__/useFlightPolling.test.ts` -- covers DATA-01j through DATA-01l (polling hook tests)
- [ ] New test cases in `server/__tests__/adapters/opensky.test.ts` for onGround filter and unidentified flag
- [ ] New test case in `server/__tests__/server.test.ts` or route test for cache-first behavior

## Sources

### Primary (HIGH confidence)
- Existing codebase: `server/adapters/opensky.ts`, `server/routes/flights.ts`, `server/types.ts`, `src/stores/mapStore.ts`, `src/stores/uiStore.ts` -- established patterns
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) -- visibilitychange event spec
- [MDN document.visibilitychange](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) -- event details
- [OpenSky REST API docs](https://openskynetwork.github.io/opensky-api/rest.html) -- rate limiting, credit calculation, OAuth2

### Secondary (MEDIUM confidence)
- [Zustand GitHub Discussion #1102](https://github.com/pmndrs/zustand/discussions/1102) -- polling pattern approaches
- [Vitest Timer Mocking](https://vitest.dev/guide/mocking/timers) -- fake timers for testing polling
- Dan Abramov's [Making setInterval Declarative with React Hooks](https://overreacted.io/making-setinterval-declarative-with-react-hooks/) -- foundational useInterval pattern

### Tertiary (LOW confidence)
- Community blog posts on polling patterns -- verified against MDN and Zustand docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and patterned in the project
- Architecture: HIGH -- follows established project patterns (Zustand curried create, existing store tests)
- Pitfalls: HIGH -- rate limiting verified against official OpenSky docs; polling pitfalls well-documented in React ecosystem
- Server modifications: HIGH -- existing adapter code is clear; changes are additive (filter + flag)

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain -- polling patterns and Zustand API are not fast-moving)
