# Phase 7: adsb.lol Data Source - Research

**Researched:** 2026-03-16
**Domain:** adsb.lol API integration, shared V2 normalizer extraction, multi-source flight data architecture
**Confidence:** HIGH

## Summary

Phase 7 adds adsb.lol as a third flight data source. The adsb.lol API has been live-verified to be a drop-in replacement for ADS-B Exchange V2 -- same endpoint pattern (`/v2/lat/{lat}/lon/{lon}/dist/{dist}`), same JSON response schema (`ac`, `msg`, `now`, `total` fields), same aircraft object fields (`hex`, `flight`, `lat`, `lon`, `alt_baro`, `gs`, `track`, `baro_rate`, `r`, `dbFlags`). The base URL is `https://api.adsb.lol` with no authentication headers required.

The core implementation is a refactor-then-extend pattern: extract the shared V2 normalization logic (`normalizeAircraft`, `AdsbAircraft`, `AdsbResponse` interfaces) from `server/adapters/adsb-exchange.ts` into `server/adapters/adsb-v2-normalize.ts`, then create a minimal `server/adapters/adsb-lol.ts` that imports the shared normalizer and only handles the unauthenticated fetch. All other changes are additive: extend the `FlightSource` union type, add the third source to route dispatch, create a new `/api/sources` config endpoint, update the polling hook interval map, update the SourceSelector dropdown with disabled-state treatment for unconfigured sources, and change the default source to `'adsblol'`.

**Primary recommendation:** Extract shared V2 normalizer first (refactor), then add the adsb.lol adapter and /api/sources endpoint (server), then extend frontend (type + store + polling + dropdown UI). Three plans matching this natural decomposition.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dropdown label: "adsb.lol" (lowercase, matches service name)
- FlightSource type value: `'adsblol'` -- no hyphens, consistent with `'opensky'` and `'adsb'` pattern
- Query param: `/api/flights?source=adsblol`
- localStorage key value: `"adsblol"`
- Extract shared V2 normalization into `server/adapters/adsb-v2-normalize.ts`
- Both `adsb-exchange.ts` and `adsb-lol.ts` import the shared normalizer
- `adsb-lol.ts` only handles fetch (no auth headers -- free API)
- `adsb-exchange.ts` handles fetch with RapidAPI headers
- Same 250 NM radius from Iran center (32.5, 53.75) as ADS-B Exchange
- Default source changes from `'opensky'` to `'adsblol'` -- best out-of-box experience
- Existing users with saved localStorage preference keep their saved choice
- Sources missing required credentials shown in dropdown but disabled/grayed out with "(API key required)" hint
- adsb.lol is always available (no credentials needed)
- New `GET /api/sources` endpoint returns configuration status per source
- Response shape: `{ opensky: { configured: boolean }, adsb: { configured: boolean }, adsblol: { configured: true } }`
- 30-second polling interval for adsb.lol
- Same recursive setTimeout pattern as other sources

### Claude's Discretion
- Exact disabled styling for unconfigured sources in dropdown (grayed text, cursor, etc.)
- How /api/sources endpoint is wired (inline in flights router or separate route file)
- Whether to add adsb.lol polling constant to server/constants.ts or client-side constants
- Test structure for shared normalizer extraction
- How frontend fetches /api/sources (on mount, cached, etc.)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-04 | adsb.lol as third flight data source (extends Phase 6 DATA-04 with third source) | Full research: API verified live, response format confirmed identical to ADS-B Exchange V2, shared normalizer extraction pattern documented, route dispatch extension, polling interval, /api/sources endpoint design, disabled-state dropdown UX |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express 5 | ^5.2.1 | Server-side route for /api/sources and flight route extension | Already in use |
| Zustand 5 | ^5.0.11 | Flight store source management | Already in use |
| React 19 | ^19.1.0 | SourceSelector UI component updates | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest 4 | ^4.1.0 | Unit/integration testing | All test files |
| @testing-library/react | ^16.3.2 | Component testing for SourceSelector | Frontend tests |

### Alternatives Considered
None -- this phase extends existing stack. No new dependencies needed.

**Installation:**
No new packages required. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
server/
  adapters/
    adsb-v2-normalize.ts    # NEW: shared V2 normalization (extracted from adsb-exchange.ts)
    adsb-exchange.ts         # MODIFIED: imports shared normalizer, keeps RapidAPI fetch
    adsb-lol.ts              # NEW: unauthenticated fetch + shared normalizer
  routes/
    flights.ts               # MODIFIED: add adsblol source dispatch
    sources.ts               # NEW: GET /api/sources config endpoint
  constants.ts               # MODIFIED: add ADSBLOL_POLL_INTERVAL, CACHE_TTL.adsblolFlights
  types.ts                   # MODIFIED: extend FlightSource union
  index.ts                   # MODIFIED: wire sourcesRouter
src/
  types/
    ui.ts                    # MODIFIED: add 'adsblol' to FlightSource
  stores/
    flightStore.ts           # MODIFIED: default to 'adsblol', accept 'adsblol' in persistence
  hooks/
    useFlightPolling.ts      # MODIFIED: add ADSBLOL_POLL_INTERVAL, add interval mapping
  components/ui/
    SourceSelector.tsx        # MODIFIED: 3 options, disabled state, /api/sources fetch
```

### Pattern 1: Shared V2 Normalizer Extraction
**What:** Move `normalizeAircraft()`, `AdsbAircraft`, and `AdsbResponse` interfaces from `adsb-exchange.ts` into a shared module that both adapters import.
**When to use:** When two adapters consume the same upstream API format.
**Example:**
```typescript
// server/adapters/adsb-v2-normalize.ts
import type { FlightEntity } from '../types.js';
import { KNOTS_TO_MS, FEET_TO_METERS, FPM_TO_MS } from '../constants.js';

export interface AdsbAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | 'ground';
  gs?: number;
  track?: number;
  baro_rate?: number;
  r?: string;
  dbFlags?: number;
}

export interface AdsbResponse {
  ac: AdsbAircraft[] | null;
  msg: string;
  now: number;
  total: number;
}

export function normalizeAircraft(ac: AdsbAircraft): FlightEntity | null {
  // Exact same logic as current adsb-exchange.ts normalizeAircraft()
  // ...
}
```

### Pattern 2: Minimal Adapter (adsb-lol.ts)
**What:** The adsb.lol adapter only handles fetch -- no auth headers, no API key check. Imports normalizer from shared module.
**When to use:** When a new data source uses the same response format as an existing source.
**Example:**
```typescript
// server/adapters/adsb-lol.ts
import type { FlightEntity } from '../types.js';
import type { AdsbResponse } from './adsb-v2-normalize.js';
import { normalizeAircraft } from './adsb-v2-normalize.js';
import { IRAN_CENTER, ADSB_RADIUS_NM } from '../constants.js';

const BASE_URL = 'https://api.adsb.lol';

export async function fetchFlights(): Promise<FlightEntity[]> {
  const start = Date.now();
  const url = `${BASE_URL}/v2/lat/${IRAN_CENTER.lat}/lon/${IRAN_CENTER.lon}/dist/${ADSB_RADIUS_NM}`;

  const res = await fetch(url);

  if (res.status === 429) {
    throw new RateLimitError('adsb.lol rate limit exceeded');
  }

  if (!res.ok) {
    throw new Error(`adsb.lol API error: ${res.status}`);
  }

  const data = (await res.json()) as AdsbResponse;
  const aircraft = data.ac ?? [];

  const flights = aircraft
    .map(normalizeAircraft)
    .filter((f): f is FlightEntity => f !== null);

  console.log(`[adsb-lol] fetched ${flights.length} flights in ${Date.now() - start}ms`);
  return flights;
}
```

### Pattern 3: Source Configuration Endpoint
**What:** A GET endpoint that returns which sources are configured (have required credentials).
**When to use:** Frontend needs to know at startup which sources are selectable.
**Example:**
```typescript
// server/routes/sources.ts
import { Router } from 'express';

export const sourcesRouter = Router();

sourcesRouter.get('/', (_req, res) => {
  res.json({
    opensky: {
      configured: !!(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET),
    },
    adsb: {
      configured: !!process.env.ADSB_EXCHANGE_API_KEY,
    },
    adsblol: {
      configured: true, // Always available, no credentials needed
    },
  });
});
```

### Pattern 4: Disabled Dropdown Option
**What:** Unconfigured sources render as disabled options with a hint.
**When to use:** Source requires credentials that are not set.
**Example:**
```typescript
// In SourceSelector.tsx
{SOURCES.map(source => {
  const isConfigured = sourceConfig?.[source]?.configured ?? true;
  const isDisabled = !isConfigured;

  return (
    <button
      key={source}
      role="option"
      aria-selected={source === activeSource}
      aria-disabled={isDisabled}
      onClick={() => !isDisabled && handleSelect(source)}
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-sm ${
        isDisabled
          ? 'cursor-not-allowed text-text-muted'
          : source === activeSource
            ? 'text-accent-blue'
            : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {/* ... */}
      <span>{SOURCE_LABELS[source]}</span>
      {isDisabled && (
        <span className="ml-auto text-[10px] text-text-muted">(API key required)</span>
      )}
    </button>
  );
})}
```

### Anti-Patterns to Avoid
- **Duplicating normalizer code:** Do NOT copy normalizeAircraft into adsb-lol.ts. Extract the shared module.
- **Trailing slash in URL:** adsb.lol API returns 404 with trailing slash (`/v2/.../dist/250/`), but 200 without it (`/v2/.../dist/250`). ADS-B Exchange uses trailing slash via RapidAPI. The adsb-lol adapter must NOT include a trailing slash.
- **Polling from server constants:** The 30s polling interval belongs on the client side (in `useFlightPolling.ts`), not in `server/constants.ts`. The server-side constant is the cache TTL, which should match.
- **Fetching /api/sources on every poll:** Fetch once on mount, not on every polling cycle. Source config does not change at runtime.
- **Blocking source selection on /api/sources load:** The dropdown should work immediately with optimistic defaults; /api/sources updates disabled state asynchronously.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| V2 aircraft normalization | Separate normalizer per adapter | Shared `adsb-v2-normalize.ts` | Identical format, DRY principle |
| Source config detection | Client-side env var inspection | `GET /api/sources` server endpoint | Client cannot access process.env |
| Rate limit handling | Custom 429 logic per adapter | Existing `RateLimitError` class + route-level catch | Already established pattern |

**Key insight:** The entire adsb.lol adapter is approximately 25 lines of code because the shared normalizer does all the heavy lifting. The real work is the refactor extraction, not the new adapter.

## Common Pitfalls

### Pitfall 1: Trailing Slash Sensitivity
**What goes wrong:** adsb.lol API returns 404 when URL has a trailing slash, unlike ADS-B Exchange via RapidAPI which tolerates it.
**Why it happens:** Different HTTP servers handle trailing slashes differently.
**How to avoid:** Use `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}` (no trailing slash).
**Warning signs:** 404 responses from adsb.lol when ADS-B Exchange works fine with same URL pattern.
**Verification:** Confirmed live -- `curl https://api.adsb.lol/v2/lat/32.5/lon/53.75/dist/250` returns 200 (no trailing slash); with trailing slash returns 404.

### Pitfall 2: Low Coverage in Iran Region
**What goes wrong:** adsb.lol returns 0 aircraft for Iran center query because community feeder coverage is concentrated in Europe/North America.
**Why it happens:** adsb.lol is community-fed data; coverage depends on where volunteers run receivers.
**How to avoid:** This is expected behavior, not a bug. The UI should gracefully show "0 flights" when adsb.lol has no data for the region. The `connected` status should still show as connected (successful API call, just no aircraft).
**Warning signs:** Users might think the source is broken. Consider a tooltip or documentation note about coverage limitations.

### Pitfall 3: Default Source Change Breaking Existing Tests
**What goes wrong:** Changing default from `'opensky'` to `'adsblol'` breaks tests that assert `activeSource === 'opensky'` without explicitly setting state.
**Why it happens:** Tests in `flightStore.test.ts` and `useFlightPolling.test.ts` assume the default is `'opensky'`.
**How to avoid:** Update all test `beforeEach` blocks that set initial state to explicitly set `activeSource` to their intended value. Any test relying on the default needs updating.
**Warning signs:** Test failures after changing the default in `loadPersistedSource()`.

### Pitfall 4: loadPersistedSource Not Recognizing 'adsblol'
**What goes wrong:** The current `loadPersistedSource()` function only accepts `'opensky'` or `'adsb'` from localStorage. If the type is extended but the function isn't updated, `'adsblol'` saved to localStorage would be ignored on next load, falling back to the default.
**Why it happens:** The function has explicit string literal checks: `if (stored === 'opensky' || stored === 'adsb') return stored;`
**How to avoid:** Update the guard to include `'adsblol'`: `if (stored === 'opensky' || stored === 'adsb' || stored === 'adsblol') return stored;`
**Warning signs:** User selects adsb.lol, refreshes page, reverts to default instead of remembering selection.

### Pitfall 5: FlightSource Type Defined in Two Places
**What goes wrong:** `FlightSource` is defined in both `server/types.ts` and `src/types/ui.ts`. Adding `'adsblol'` to one but not the other causes type mismatches.
**Why it happens:** Deliberate architectural decision to avoid circular imports between server and client types.
**How to avoid:** Update BOTH files when extending the union. The server `FlightSource` in `types.ts` and the client `FlightSource` in `ui.ts` must stay in sync.
**Warning signs:** TypeScript errors about `'adsblol'` not being assignable to `FlightSource`.

### Pitfall 6: Route Dispatch Default Fallback
**What goes wrong:** The current route dispatch defaults unknown sources to `'opensky'`: `req.query.source === 'adsb' ? 'adsb' : 'opensky'`. This ternary approach doesn't scale to 3 sources.
**Why it happens:** Binary ternary pattern was fine for 2 sources but breaks with 3.
**How to avoid:** Refactor to a switch/if-chain or lookup object. Define valid sources and default to `'adsblol'` (the new default) for unrecognized values.
**Warning signs:** `?source=adsblol` incorrectly falling back to opensky.

## Code Examples

Verified patterns from the existing codebase and live API testing:

### adsb.lol API Response (Live Verified)
```json
// GET https://api.adsb.lol/v2/lat/51.5/lon/-0.1/dist/100
// Status: 200 OK
// Content-Type: application/json
// Cache-Control: no-store
{
  "ac": [
    {
      "hex": "407181",
      "type": "adsb_icao",
      "flight": "EXS73R  ",
      "r": "G-JZBE",
      "t": "B738",
      "alt_baro": "ground",
      "gs": 19.5,
      "track": 276.1,
      "baro_rate": 512,
      "lat": 51.383871,
      "lon": -2.731571,
      "dbFlags": 0
    }
  ],
  "msg": "No error",
  "now": 1773688781501,
  "total": 140,
  "ctime": 1773688781501,
  "ptime": 0
}
```

### Extended Route Dispatch Pattern
```typescript
// server/routes/flights.ts -- extended for 3 sources
import { fetchFlights as fetchAdsbLol } from '../adapters/adsb-lol.js';

const adsblolCache = new EntityCache<FlightEntity[]>(CACHE_TTL.adsblolFlights);

function parseSource(raw: unknown): FlightSource {
  if (raw === 'opensky') return 'opensky';
  if (raw === 'adsb') return 'adsb';
  if (raw === 'adsblol') return 'adsblol';
  return 'adsblol'; // Default -- free, no config needed
}

function getCache(source: FlightSource): EntityCache<FlightEntity[]> {
  switch (source) {
    case 'opensky': return openskyCache;
    case 'adsb': return adsbCache;
    case 'adsblol': return adsblolCache;
  }
}

flightsRouter.get('/', async (req, res) => {
  const source = parseSource(req.query.source);
  const cache = getCache(source);

  // Credential checks per source
  if (source === 'adsb' && !process.env.ADSB_EXCHANGE_API_KEY) {
    return res.status(503).json({ error: 'ADS-B Exchange API key not configured' });
  }
  if (source === 'opensky' && !(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET)) {
    return res.status(503).json({ error: 'OpenSky credentials not configured' });
  }
  // adsblol: no credential check needed

  // ... rest follows existing cache-first pattern
});
```

### Polling Interval Map (Client)
```typescript
// src/hooks/useFlightPolling.ts
export const OPENSKY_POLL_INTERVAL = 5_000;
export const ADSB_POLL_INTERVAL = 260_000;
export const ADSBLOL_POLL_INTERVAL = 30_000;

// In useEffect:
const INTERVAL_MAP: Record<FlightSource, number> = {
  opensky: OPENSKY_POLL_INTERVAL,
  adsb: ADSB_POLL_INTERVAL,
  adsblol: ADSBLOL_POLL_INTERVAL,
};
const interval = INTERVAL_MAP[activeSource];
```

### Updated Default Source in Store
```typescript
// src/stores/flightStore.ts
function loadPersistedSource(): FlightSource {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'opensky' || stored === 'adsb' || stored === 'adsblol') return stored;
  } catch { /* localStorage unavailable */ }
  return 'adsblol'; // Changed from 'opensky' -- best out-of-box experience
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Binary ternary source dispatch | Switch/lookup-based source dispatch | Phase 7 | Required for 3+ sources |
| Per-adapter normalizer | Shared V2 normalizer module | Phase 7 | DRY, consistent normalization |
| Default to OpenSky (requires config) | Default to adsb.lol (no config needed) | Phase 7 | Better first-run experience |
| All sources always enabled | Disabled state for unconfigured sources | Phase 7 | Clearer UX for missing credentials |

**adsb.lol API status (2026-03-16):**
- API is live and responsive at `https://api.adsb.lol`
- V2 endpoint confirmed: `/v2/lat/{lat}/lon/{lon}/dist/{dist}` (no trailing slash)
- Response format identical to ADS-B Exchange V2
- No authentication required (may require API key in future per their docs)
- Rate limits are dynamic based on server load (no fixed quota)
- Coverage is community-dependent -- may have gaps in Iran/Middle East region
- Licensed under ODbL 1.0

## Open Questions

1. **adsb.lol Rate Limit Response Format**
   - What we know: Dynamic rate limits exist based on server load; 429 status confirmed as standard HTTP pattern
   - What's unclear: Whether adsb.lol returns `Retry-After` header or specific rate limit headers
   - Recommendation: Handle 429 with existing `RateLimitError` pattern. No special header parsing needed -- the 30s polling interval is already conservative.

2. **adsb.lol Future API Key Requirement**
   - What we know: Their README says "In the future, you will require an API key which you can obtain by feeding adsb.lol"
   - What's unclear: Timeline for this change
   - Recommendation: Build the adapter without auth. If/when keys are required, it's a minor change (add header). Don't over-engineer for a hypothetical future requirement.

3. **adsb.lol Iran Region Coverage**
   - What we know: Live test returned 0 aircraft for Iran center (32.5, 53.75). Europe returns 100+ aircraft.
   - What's unclear: Whether coverage will improve or if it's permanently sparse for Middle East
   - Recommendation: This is fine. The source works correctly (returns empty array). Users who want Iran data can use OpenSky or ADS-B Exchange. adsb.lol is still the best default because it works without configuration.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 with jsdom (frontend) / node (server) |
| Config file | vite.config.ts (test section) |
| Quick run command | `npx vitest run server/__tests__/adapters/ -x` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-04-norm | Shared V2 normalizer produces correct FlightEntity | unit | `npx vitest run server/__tests__/adapters/adsb-v2-normalize.test.ts -x` | Wave 0 |
| DATA-04-lol-fetch | adsb.lol adapter calls correct URL without trailing slash | unit | `npx vitest run server/__tests__/adapters/adsb-lol.test.ts -x` | Wave 0 |
| DATA-04-lol-noauth | adsb.lol adapter sends no auth headers | unit | `npx vitest run server/__tests__/adapters/adsb-lol.test.ts -x` | Wave 0 |
| DATA-04-lol-429 | adsb.lol adapter throws RateLimitError on 429 | unit | `npx vitest run server/__tests__/adapters/adsb-lol.test.ts -x` | Wave 0 |
| DATA-04-route3 | Flight route dispatches to adsblol adapter | unit | `npx vitest run server/__tests__/routes/flights.test.ts -x` | Modify existing |
| DATA-04-sources | GET /api/sources returns config status per source | unit | `npx vitest run server/__tests__/routes/sources.test.ts -x` | Wave 0 |
| DATA-04-default | Default source is adsblol when no localStorage | unit | `npx vitest run src/__tests__/flightStore.test.ts -x` | Modify existing |
| DATA-04-poll30 | Polling uses 30s interval for adsblol | unit | `npx vitest run src/__tests__/useFlightPolling.test.ts -x` | Modify existing |
| DATA-04-disabled | SourceSelector shows disabled options for unconfigured sources | unit | `npx vitest run src/__tests__/SourceSelector.test.tsx -x` | Modify existing |
| DATA-04-3opts | SourceSelector shows 3 options in dropdown | unit | `npx vitest run src/__tests__/SourceSelector.test.tsx -x` | Modify existing |
| DATA-04-adsb-refactor | ADS-B Exchange adapter still works after normalizer extraction | unit | `npx vitest run server/__tests__/adapters/adsb-exchange.test.ts -x` | Verify existing passes |

### Sampling Rate
- **Per task commit:** `npx vitest run server/ -x` (server) or `npx vitest run src/ -x` (frontend)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `server/__tests__/adapters/adsb-v2-normalize.test.ts` -- covers DATA-04-norm (shared normalizer unit tests)
- [ ] `server/__tests__/adapters/adsb-lol.test.ts` -- covers DATA-04-lol-fetch, DATA-04-lol-noauth, DATA-04-lol-429
- [ ] `server/__tests__/routes/sources.test.ts` -- covers DATA-04-sources (/api/sources endpoint)
- [ ] Modify `server/__tests__/routes/flights.test.ts` -- add adsblol dispatch tests (DATA-04-route3)
- [ ] Modify `server/__tests__/adapters/adsb-exchange.test.ts` -- verify still passes after normalizer extraction
- [ ] Modify `src/__tests__/flightStore.test.ts` -- update default source assertions (DATA-04-default)
- [ ] Modify `src/__tests__/useFlightPolling.test.ts` -- add adsblol 30s polling test (DATA-04-poll30)
- [ ] Modify `src/__tests__/SourceSelector.test.tsx` -- add 3-option, disabled-state tests (DATA-04-disabled, DATA-04-3opts)

## Sources

### Primary (HIGH confidence)
- **Live API verification** -- `curl https://api.adsb.lol/v2/lat/51.5/lon/-0.1/dist/100` returned 200 with 140 aircraft, confirmed identical field names to ADS-B Exchange V2 format
- **Live API verification** -- `curl https://api.adsb.lol/v2/lat/32.5/lon/53.75/dist/250` returned 200 with 0 aircraft (expected -- sparse coverage in Iran)
- **Trailing slash verification** -- `https://api.adsb.lol/v2/lat/32.5/lon/53.75/dist/250/` (with slash) returns 404; without slash returns 200
- **Existing codebase** -- `server/adapters/adsb-exchange.ts`, `server/routes/flights.ts`, all test files read and analyzed

### Secondary (MEDIUM confidence)
- [adsb.lol API docs](https://www.adsb.lol/docs/open-data/api/) -- minimal documentation, confirms base URL and ODbL 1.0 license
- [adsb.lol GitHub](https://github.com/adsblol/api) -- confirms "compatible with ADSBExchange Rapid API, drop-in replacement", dynamic rate limits, potential future API key requirement

### Tertiary (LOW confidence)
- adsb.lol rate limit behavior -- dynamic based on server load, no official documentation on specific thresholds or headers. 30s polling should be well within limits.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, extending existing patterns
- Architecture: HIGH -- shared normalizer is straightforward refactor, all integration points identified in existing code
- API compatibility: HIGH -- live-verified identical JSON response format, field names, and endpoint pattern
- Pitfalls: HIGH -- trailing slash verified live, low coverage confirmed, all code integration points mapped
- Rate limits: MEDIUM -- dynamic limits confirmed but specific thresholds undocumented; 30s interval is conservative

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable -- adsb.lol API is mature, field format matches ADS-B Exchange V2 standard)
