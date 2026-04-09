# Phase 6: ADS-B Exchange Data Source - Research

**Researched:** 2026-03-15
**Domain:** ADS-B Exchange API integration, multi-source flight data architecture, RapidAPI rate limit management
**Confidence:** MEDIUM-HIGH

## Summary

ADS-B Exchange provides a V2 REST API via RapidAPI (`adsbexchange-com1.p.rapidapi.com`) with 15 endpoints for aircraft tracking. The key endpoint for this phase is `/v2/lat/{lat}/lon/{lon}/dist/{dist}/` which returns all aircraft within a radius up to 250 nautical miles. The free tier provides 10,000 requests/month. Since Iran's bounding box (25-40N, 44-63.5E) spans ~900 NM north-south and ~987 NM east-west, a single 250 NM query cannot cover the full area. A single center-point query at (32.5, 53.75) covers the core region; covering the full bbox requires multiple queries per poll, which dramatically reduces polling frequency under the rate limit.

The existing codebase has a clean adapter pattern (`server/adapters/opensky.ts`) that normalizes upstream data to `FlightEntity`. The ADS-B Exchange V2 response format uses different field names (e.g., `hex` instead of `icao24`, `flight` instead of `callsign`, `lat`/`lon`, `alt_baro` in feet instead of meters, `gs` in knots instead of m/s) and returns aircraft in an `ac` array. The adapter must translate these fields and convert units. The route (`server/routes/flights.ts`) needs a `source` query parameter to dispatch between adapters, and the frontend polling hook needs source-aware URL construction and source-specific intervals.

**Primary recommendation:** Use a single 250 NM radius query from Iran's center point (32.5, 53.75) per poll, yielding ~260-second (4.3 minute) polling intervals on the free tier. This covers the core airspace; users should be informed of reduced geographic coverage compared to OpenSky. Implement separate caches per source, a `rate_limited` distinction in error responses, and serve stale cache when rate limited.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Source switching behavior: Flush and refetch on toggle -- clear all flights immediately, show loading state, fetch from new source
- No auto-fallback -- stay on selected source when it fails, show error status. User manually switches if needed
- Selected source persists in localStorage across page reloads
- Single endpoint with query param: `/api/flights?source=adsb` or `?source=opensky` (default)
- Server distinguishes rate limit (429) from other errors in response to frontend -- enables specific "Rate limited" badge
- ADS-B Exchange gets its own polling interval tuned to avoid hitting free-tier rate limits (Claude determines exact cadence based on RapidAPI tier limits during research -- NOT the same 5s as OpenSky)
- Serve stale cache when rate limited -- keep showing last-known positions with rate limited indicator
- Top-right floating dropdown control on the map overlay
- Dropdown shows current source name with chevron
- Connection status integrated below dropdown: colored dot + flight count (e.g., "247 flights")
- Status states: connected (green), stale (yellow), error (red), rate limited (red + "Rate limited" text), loading (gray/pulsing)
- RapidAPI free tier for ADS-B Exchange access
- API key required at startup (`ADSB_EXCHANGE_API_KEY` in .env -- server fails without it)
- Same Iran bounding box coverage as OpenSky (adapt query format if API uses radius-based instead of bbox)
- Normalize to identical FlightEntity shape -- fields ADS-B doesn't provide become null
- Same ground traffic filter (onGround=false only) and unidentified flag logic as OpenSky adapter

### Claude's Discretion

- Exact ADS-B Exchange polling interval (based on free-tier rate limits)
- OpenSky backoff behavior on rate limit (or keep fixed 5s)
- Dropdown component implementation details (custom vs native select)
- How to wire source selection into the existing polling hook
- Cache strategy per source (shared cache or separate caches)
- Exact status dot colors and styling within the dark theme

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                  | Research Support                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-04 | ADS-B Exchange as alternative flight data source with UI toggle to switch between OpenSky and ADS-B Exchange | Full research: API endpoints, rate limits, field mapping, adapter pattern, polling interval calculation, UI component design, source switching architecture |

</phase_requirements>

## Standard Stack

### Core

| Library   | Version | Purpose                                           | Why Standard                            |
| --------- | ------- | ------------------------------------------------- | --------------------------------------- |
| Express 5 | ^5.2.1  | Server route with source param dispatch           | Already in use, add query param routing |
| Zustand 5 | ^5.0.11 | Store active source + per-source connection state | Already in use, extend flightStore      |
| React 19  | ^19.1.0 | Dropdown UI component                             | Already in use                          |

### Supporting

| Library       | Version | Purpose             | When to Use                                 |
| ------------- | ------- | ------------------- | ------------------------------------------- |
| (none needed) | -       | No new dependencies | All functionality built with existing stack |

### Alternatives Considered

| Instead of      | Could Use         | Tradeoff                                                                                                      |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| Custom dropdown | Native `<select>` | Custom gives dark-theme control, native gives accessibility for free; custom preferred for visual consistency |
| RapidAPI SDK    | Raw `fetch()`     | SDK adds dependency; raw fetch is sufficient for 1 endpoint with 2 headers                                    |

**Installation:**

```bash
# No new packages needed -- all functionality builds on existing stack
```

## Architecture Patterns

### Recommended Project Structure

```
server/
  adapters/
    opensky.ts          # existing -- no changes
    adsb-exchange.ts    # NEW: ADS-B Exchange adapter
  routes/
    flights.ts          # MODIFY: source param dispatch, per-source cache
  config.ts             # MODIFY: add adsbExchange.apiKey
  constants.ts          # MODIFY: add ADSB_EXCHANGE config constants
  types.ts              # MODIFY: add FlightSource type, extend CacheResponse

src/
  stores/
    flightStore.ts      # MODIFY: add activeSource, rateLimited status
  hooks/
    useFlightPolling.ts # MODIFY: source-aware URL + interval
  components/
    ui/
      SourceSelector.tsx    # NEW: dropdown + status badge
      OverlayPanel.tsx      # existing -- reuse for dropdown container
  types/
    ui.ts               # MODIFY: add FlightSource type
```

### Pattern 1: Server-Side Adapter Dispatch

**What:** Single `/api/flights` route accepts `?source=adsb|opensky` and dispatches to the correct adapter, each with its own cache instance.
**When to use:** Always -- this is the locked architecture decision.
**Example:**

```typescript
// server/routes/flights.ts
import { fetchFlights as fetchOpenSky } from '../adapters/opensky.js';
import { fetchFlights as fetchAdsbExchange } from '../adapters/adsb-exchange.js';

const openskyCache = new EntityCache<FlightEntity[]>(CACHE_TTL.flights);
const adsbCache = new EntityCache<FlightEntity[]>(CACHE_TTL.adsbFlights);

type FlightSource = 'opensky' | 'adsb';

flightsRouter.get('/', async (req, res) => {
  const source: FlightSource = req.query.source === 'adsb' ? 'adsb' : 'opensky';
  const cache = source === 'adsb' ? adsbCache : openskyCache;
  const fetcher = source === 'adsb' ? fetchAdsbExchange : fetchOpenSky;

  const cached = cache.get();
  if (cached && !cached.stale) {
    return res.json(cached);
  }

  try {
    const flights = await fetcher(IRAN_BBOX);
    cache.set(flights);
    res.json({ data: flights, stale: false, lastFresh: Date.now() });
  } catch (err) {
    // Distinguish 429 rate limit from other errors
    if (err instanceof RateLimitError) {
      if (cached) {
        return res.json({ ...cached, rateLimited: true });
      }
      return res.status(429).json({ error: 'Rate limited', rateLimited: true });
    }
    if (cached) return res.json(cached);
    throw err;
  }
});
```

### Pattern 2: ADS-B Exchange Adapter with Unit Conversion

**What:** Adapter fetches from RapidAPI, filters ground traffic, converts units, normalizes to FlightEntity.
**When to use:** Every ADS-B Exchange fetch.
**Example:**

```typescript
// server/adapters/adsb-exchange.ts
const RAPIDAPI_BASE = 'https://adsbexchange-com1.p.rapidapi.com';

interface AdsbAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | 'ground';
  gs?: number; // knots
  track?: number; // degrees
  baro_rate?: number; // feet/min
  t?: string; // ICAO type
  r?: string; // registration
  dbFlags?: number; // bitfield: 1=military
}

interface AdsbResponse {
  ac: AdsbAircraft[] | null;
  msg: string;
  now: number;
  total: number;
}

function normalizeAircraft(ac: AdsbAircraft): FlightEntity | null {
  if (ac.lat == null || ac.lon == null) return null;
  if (ac.alt_baro === 'ground') return null; // ground traffic filter

  const callsign = typeof ac.flight === 'string' ? ac.flight.trim() : '';

  return {
    id: `flight-${ac.hex}`,
    type: 'flight',
    lat: ac.lat,
    lng: ac.lon,
    timestamp: Date.now(),
    label: callsign || ac.hex,
    data: {
      icao24: ac.hex,
      callsign: callsign || ac.hex,
      originCountry: '', // ADS-B Exchange does not provide origin country
      velocity: ac.gs != null ? ac.gs * 0.514444 : null, // knots -> m/s
      heading: ac.track ?? null,
      altitude: ac.alt_baro != null ? (ac.alt_baro as number) * 0.3048 : null, // feet -> meters
      onGround: false,
      verticalRate: ac.baro_rate != null ? ac.baro_rate * 0.00508 : null, // ft/min -> m/s
      unidentified: callsign === '',
    },
  };
}
```

### Pattern 3: Source-Aware Polling Hook

**What:** The polling hook reads `activeSource` from the store and adjusts both the fetch URL and polling interval accordingly.
**When to use:** Frontend polling refactor.
**Example:**

```typescript
// Conceptual -- useFlightPolling modifications
const activeSource = useFlightStore((s) => s.activeSource);
const interval = activeSource === 'adsb' ? ADSB_POLL_INTERVAL : OPENSKY_POLL_INTERVAL;
const url = `/api/flights?source=${activeSource}`;
```

### Pattern 4: Custom Dropdown with Status Badge

**What:** A floating dropdown in the top-right map overlay area, using the existing OverlayPanel styling, with integrated connection status below.
**When to use:** New SourceSelector component.
**Example:**

```typescript
// Conceptual SourceSelector component structure
<OverlayPanel className="min-w-[180px]">
  <button onClick={toggleOpen} className="flex items-center justify-between w-full">
    <span className="text-sm font-medium text-text-primary">{sourceLabel}</span>
    <ChevronIcon open={isOpen} />
  </button>
  {isOpen && (
    <div className="mt-2 border-t border-border pt-2">
      <SourceOption label="OpenSky" value="opensky" />
      <SourceOption label="ADS-B Exchange" value="adsb" />
    </div>
  )}
  <StatusBadge status={connectionStatus} flightCount={flightCount} />
</OverlayPanel>
```

### Anti-Patterns to Avoid

- **Shared cache between sources:** Each source has different data freshness and rate limits. Separate caches prevent stale OpenSky data being served when user switches to ADS-B and vice versa.
- **Polling interval in the component:** Keep the polling interval in constants, not hardcoded in the hook. The hook reads the active source and selects the correct interval.
- **Auto-fallback between sources:** User decision locks this -- no automatic switching. Show the error and let the user decide.
- **Storing source in the flight store:** Source preference is a UI concern that persists to localStorage. Keep `activeSource` in the flight store for reactive re-rendering but initialize from localStorage on mount.

## Don't Hand-Roll

| Problem                                  | Don't Build                                    | Use Instead                                        | Why                                                           |
| ---------------------------------------- | ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| Unit conversion (knots/ft to m/s/meters) | Custom math scattered everywhere               | Centralized conversion constants                   | Easy to get wrong, should be single-source-of-truth           |
| Bounding box to radius                   | Complex geographic math                        | Pre-computed center point + fixed 250 NM radius    | The Iran center (32.5, 53.75) with 250 NM is a fixed constant |
| Rate limit detection                     | String parsing of error messages               | Custom `RateLimitError` class thrown on 429 status | Structured error handling is more reliable                    |
| localStorage persistence                 | Manual `JSON.parse`/`stringify` with try-catch | Zustand `persist` middleware or simple utility     | Edge cases with storage quota, SSR, invalid JSON              |

**Key insight:** The ADS-B Exchange adapter is structurally identical to the OpenSky adapter -- both take a bounding box (or equivalent), call an API, and return `FlightEntity[]`. The complexity is in the field mapping and unit conversions, not the architecture.

## Common Pitfalls

### Pitfall 1: Bounding Box vs Radius Coverage Gap

**What goes wrong:** ADS-B Exchange uses radius-based queries (max 250 NM) while OpenSky uses bounding box. A single 250 NM radius from Iran's center (32.5, 53.75) covers lat 28.3-36.7, lon 48.8-58.7 -- missing the corners and edges of the full Iran bbox (25-40 lat, 44-63.5 lon).
**Why it happens:** Iran's bbox spans ~900x987 NM but the API max radius is 250 NM.
**How to avoid:** Accept reduced geographic coverage with a single query (covers core Iran airspace). Document this tradeoff in the UI or use it as-is since most flight traffic concentrates in the center. If full coverage is needed, use multiple queries but accept 17+ minute polling intervals.
**Warning signs:** Users notice flights appearing/disappearing near the edges when switching sources.

### Pitfall 2: Unit Conversion Errors

**What goes wrong:** ADS-B Exchange returns altitude in feet, speed in knots, and vertical rate in feet/minute. OpenSky returns altitude in meters, speed in m/s, and vertical rate in m/s. If conversions are wrong, entity rendering (altitude-based opacity, speed-based coloring) breaks.
**Why it happens:** Both sources populate the same FlightEntity fields but use different units upstream.
**How to avoid:** Centralize conversion factors as named constants. Test with known values.
**Warning signs:** Flights appear at wildly different opacity/size when switching sources.

**Conversion factors:**

- Altitude: feet to meters = multiply by 0.3048
- Speed: knots to m/s = multiply by 0.514444
- Vertical rate: ft/min to m/s = multiply by 0.00508 (0.3048/60)

### Pitfall 3: `alt_baro: "ground"` String Value

**What goes wrong:** ADS-B Exchange returns `"ground"` as a string for `alt_baro` when aircraft is on the ground, not a number. If the adapter tries `alt_baro * 0.3048` without checking the type, it produces NaN.
**Why it happens:** The V2 API uses a union type (`number | "ground"`) for barometric altitude.
**How to avoid:** Check `ac.alt_baro === 'ground'` as the ground traffic filter (equivalent to OpenSky's `on_ground === true`). Return null for ground aircraft.
**Warning signs:** NaN values in altitude field, ground aircraft appearing on map.

### Pitfall 4: Rate Limit Exhaustion

**What goes wrong:** With 10,000 requests/month free tier, overly aggressive polling exhausts the budget mid-month.
**Why it happens:** 10,000 requests / 30 days = ~333 requests/day. At one request per poll, that's one poll every ~260 seconds (~4.3 min).
**How to avoid:** Set polling interval to 260,000 ms (260 seconds). Add budget tracking (count requests) as a nice-to-have. Serve stale cache when rate limited.
**Warning signs:** 429 responses consistently, connection status stuck on "Rate limited."

### Pitfall 5: Missing `originCountry` Field

**What goes wrong:** ADS-B Exchange V2 does not return `origin_country` like OpenSky does. If downstream code assumes `originCountry` is always a non-empty string, it may filter incorrectly or display poorly.
**Why it happens:** Different APIs expose different data.
**How to avoid:** Set `originCountry: ''` (empty string) in the adapter. Downstream code must handle empty origin country gracefully (already the case for the current UI which just displays it).
**Warning signs:** Empty strings where country names should be.

### Pitfall 6: `hex` Field with Tilde Prefix

**What goes wrong:** ADS-B Exchange V2 prefixes non-ICAO hex addresses with `~`. If the ID construction uses `flight-${hex}`, the tilde could cause issues in selectors or URLs.
**Why it happens:** Non-ICAO addresses (TIS-B, ADS-R) use a different addressing scheme.
**How to avoid:** Strip the tilde when constructing the entity ID, or replace it: `ac.hex.replace(/^~/, '')`. The hex with tilde can still be stored in `data.icao24` for display.
**Warning signs:** Entity IDs with `~` characters breaking CSS selectors or URL parameters.

### Pitfall 7: Server Startup Failure Without API Key

**What goes wrong:** The locked decision says "server fails without ADSB_EXCHANGE_API_KEY." But the current `config.ts` uses `required()` which throws immediately at config load time, blocking ALL server functionality (including OpenSky).
**Why it happens:** Lazy config loads everything at once.
**How to avoid:** Make ADS-B Exchange API key optional at startup (like AISStream is guarded). Validate it when the adsb source is actually requested. Or use a separate config section that is only loaded on demand.
**Warning signs:** Server won't start in development when developer hasn't set up ADS-B Exchange yet.

## Code Examples

Verified patterns from official sources:

### ADS-B Exchange V2 API Call via RapidAPI

```typescript
// Source: ADS-B Exchange official docs + RapidAPI endpoint structure
// Endpoint: /v2/lat/{lat}/lon/{lon}/dist/{dist}/
// Max radius: 250 NM

const RAPIDAPI_HOST = 'adsbexchange-com1.p.rapidapi.com';

async function fetchAdsbExchange(
  center: { lat: number; lon: number },
  radiusNM: number,
  apiKey: string,
): Promise<AdsbResponse> {
  const url = `https://${RAPIDAPI_HOST}/v2/lat/${center.lat}/lon/${center.lon}/dist/${radiusNM}/`;

  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  });

  if (res.status === 429) {
    throw new RateLimitError('ADS-B Exchange rate limit exceeded');
  }

  if (!res.ok) {
    throw new Error(`ADS-B Exchange API error: ${res.status}`);
  }

  return res.json() as Promise<AdsbResponse>;
}
```

### V2 Response Format (from adsb.one -- ADSBExchange v2 compatible)

```json
{
  "ac": [
    {
      "hex": "a9cee9",
      "type": "adsb_icao",
      "flight": "N731BP  ",
      "alt_baro": 38000,
      "alt_geom": 38275,
      "gs": 338.9,
      "track": 276.1,
      "baro_rate": 0,
      "squawk": "3301",
      "emergency": "none",
      "category": "A2",
      "nav_qnh": 1013.6,
      "nav_altitude_mcp": 38016,
      "nav_heading": 280.55,
      "lat": 37.358322,
      "lon": -93.374147,
      "nic": 9,
      "rc": 75,
      "seen_pos": 3.486,
      "version": 2,
      "mlat": [],
      "tisb": [],
      "messages": 24844,
      "seen": 0.7,
      "rssi": -15.8,
      "dbFlags": 0
    }
  ],
  "msg": "No error",
  "now": 1675633671226,
  "total": 1,
  "ctime": 1675633671226,
  "ptime": 0
}
```

### Field Mapping: ADS-B Exchange V2 -> FlightEntity

```typescript
// Source: ADS-B Exchange V2 API fields documentation
// https://www.adsbexchange.com/version-2-api-wip/

// Conversion constants
const KNOTS_TO_MS = 0.514444;
const FEET_TO_METERS = 0.3048;
const FPM_TO_MS = 0.00508; // feet per minute to meters per second

// Field mapping
// ADS-B Exchange     ->  FlightEntity
// hex                ->  id (prefix: "flight-"), data.icao24
// flight (trimmed)   ->  label, data.callsign
// (not available)    ->  data.originCountry = ''
// gs * 0.514444      ->  data.velocity (knots -> m/s)
// track              ->  data.heading
// alt_baro * 0.3048  ->  data.altitude (feet -> meters)
// alt_baro === "ground" -> filter out (equivalent to onGround)
// baro_rate * 0.00508 -> data.verticalRate (ft/min -> m/s)
// flight.trim() === '' -> data.unidentified = true
// dbFlags & 1        ->  (military flag -- available for future use)
```

### Rate Limit Budget Calculation

```typescript
// Source: RapidAPI ADSBExchange pricing page
// Free tier: 10,000 requests/month
// Paid tier ($10/mo): 10,000 requests/month (same limit, guaranteed availability)

const MONTHLY_BUDGET = 10_000;
const SECONDS_PER_MONTH = 30 * 24 * 3600; // 2,592,000

// Strategy: Single 250 NM query from center of Iran
const QUERIES_PER_POLL = 1;
const POLLS_PER_MONTH = MONTHLY_BUDGET / QUERIES_PER_POLL; // 10,000
const POLL_INTERVAL_SECONDS = Math.ceil(SECONDS_PER_MONTH / POLLS_PER_MONTH); // 260 seconds

// RECOMMENDATION: 260,000 ms (4 min 20 sec) polling interval
export const ADSB_POLL_INTERVAL = 260_000;

// Iran center point for 250 NM radius query
export const IRAN_CENTER = { lat: 32.5, lon: 53.75 };
export const ADSB_RADIUS_NM = 250;

// Coverage: core Iran (lat ~28.3-36.7, lon ~48.8-58.7)
// Misses: southern coast (Hormuz), northern border (Caspian), NW/SE corners
```

### Source Persistence with localStorage

```typescript
// Pattern for persisting active source across page reloads
type FlightSource = 'opensky' | 'adsb';

const STORAGE_KEY = 'flight-source';

function loadPersistedSource(): FlightSource {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'opensky' || stored === 'adsb') return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
  return 'opensky'; // default
}

function persistSource(source: FlightSource): void {
  try {
    localStorage.setItem(STORAGE_KEY, source);
  } catch {
    // silently fail
  }
}
```

## State of the Art

| Old Approach                                | Current Approach                       | When Changed | Impact                                         |
| ------------------------------------------- | -------------------------------------- | ------------ | ---------------------------------------------- |
| ADS-B Exchange direct API (api-auth header) | RapidAPI proxy (X-RapidAPI-Key header) | ~2023        | Must use RapidAPI headers, not direct api-auth |
| V1 API format                               | V2 API format (current)                | ~2022        | V2 uses `ac` array with modern field names     |
| Free tier (500 req/month)                   | Free tier (10,000 req/month)           | ~2024        | Much more viable for polling use case          |
| ADSBx Flight Sim Traffic API                | Discontinued (March 2025)              | March 2025   | Only `adsbexchange-com1` remains on RapidAPI   |

**Deprecated/outdated:**

- Direct API access (`adsbexchange.com/api/aircraft/...` with `api-auth` header) -- still works with enterprise/direct keys, but personal/hobby access is via RapidAPI
- V1 field format -- V2 is current standard, all compatible services (adsb.one, adsb.lol, adsb.fi) implement V2

## Open Questions

1. **Free tier availability**
   - What we know: RapidAPI shows 10,000 requests/month at free/basic tier. Some sources suggest the free tier was removed, leaving only a $10/month plan.
   - What's unclear: Whether a truly free (no credit card) tier still exists as of March 2026.
   - Recommendation: Design for 10,000 requests/month regardless (same limit on free and paid tiers). The polling interval math is the same either way. API key requirement covers both cases.

2. **Exact geographic coverage gap**
   - What we know: Single 250 NM radius from center covers core Iran (~70% of the bbox). Edges and corners are missed.
   - What's unclear: Whether users will care about missing flights near Hormuz, Caspian, or border areas.
   - Recommendation: Accept the tradeoff for now. The single-query approach (260s interval) is far more useful than 9-query full coverage (39-minute interval). The coverage gap is inherent to ADS-B Exchange's radius-based API vs. OpenSky's bbox API.

3. **Server startup behavior with missing API key**
   - What we know: CONTEXT.md says "server fails without ADSB_EXCHANGE_API_KEY." But existing pattern (AISStream) guards with env var presence check.
   - What's unclear: Whether "fails without it" means crash or graceful error when the source is requested.
   - Recommendation: Follow the AISStream pattern -- make the key optional at startup, validate when adsb source is actually requested. Throw 503 if the key is missing when a user tries to use ADS-B Exchange source.

## Discretion Recommendations

Based on research findings, here are recommendations for areas marked as Claude's discretion:

### Polling Interval: 260 seconds (4 min 20 sec)

Single 250 NM query per poll. 10,000 requests/month / 30 days / 24 hours = ~13.9 requests/hour = one request every ~260 seconds. This is sustainable and stays well under the monthly budget with a safety margin.

### OpenSky Backoff: No change

Keep OpenSky at fixed 5s interval. OpenSky uses OAuth tokens and has different rate limiting (per-user, not per-request-count). Adding backoff complexity is not justified for a source that works reliably. If OpenSky gets a 429, the existing error handling (serve stale cache, show error status) is sufficient.

### Dropdown: Custom component

Use a custom dropdown built with the existing `OverlayPanel` component for visual consistency with the dark theme. A native `<select>` cannot be styled to match the dark overlay aesthetic. The dropdown has only 2 options so accessibility complexity is minimal -- use `role="listbox"` and `aria-expanded` for basic a11y.

### Polling Hook Wiring

The `useFlightPolling` hook should read `activeSource` from the flight store. When the source changes, the hook's `useEffect` should clean up the current timeout and restart polling with the new source and interval. The `activeSource` goes in the `useEffect` dependency array.

### Cache Strategy: Separate caches per source

Use two `EntityCache` instances in `flights.ts` -- one for OpenSky, one for ADS-B Exchange. This prevents cross-contamination: OpenSky's 10s cache TTL differs from ADS-B's longer TTL, and switching sources should not serve data from the other source.

### Status Dot Colors

- Connected: `accent-green` (oklch(0.723 0.219 149.58)) -- existing theme color
- Stale: `accent-yellow` (oklch(0.795 0.184 86.05)) -- existing theme color
- Error: `accent-red` (oklch(0.577 0.245 27.33)) -- existing theme color
- Rate limited: `accent-red` with "Rate limited" text label -- same red, distinct via text
- Loading: `text-muted` (oklch(0.5 0 0)) with CSS `animate-pulse` -- gray pulsing

## Validation Architecture

### Test Framework

| Property           | Value                                           |
| ------------------ | ----------------------------------------------- |
| Framework          | Vitest 4.1 with jsdom (frontend), node (server) |
| Config file        | `vite.config.ts` (test section)                 |
| Quick run command  | `npx vitest run server/__tests__/adapters/`     |
| Full suite command | `npx vitest run`                                |

### Phase Requirements -> Test Map

| Req ID   | Behavior                                                              | Test Type   | Automated Command                                                   | File Exists?    |
| -------- | --------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------- | --------------- |
| DATA-04a | ADS-B Exchange adapter normalizes V2 response to FlightEntity         | unit        | `npx vitest run server/__tests__/adapters/adsb-exchange.test.ts -x` | Wave 0          |
| DATA-04b | ADS-B Exchange adapter filters ground traffic (alt_baro === "ground") | unit        | `npx vitest run server/__tests__/adapters/adsb-exchange.test.ts -x` | Wave 0          |
| DATA-04c | ADS-B Exchange adapter converts units (knots->m/s, feet->m)           | unit        | `npx vitest run server/__tests__/adapters/adsb-exchange.test.ts -x` | Wave 0          |
| DATA-04d | Flight route dispatches to correct adapter by source param            | unit        | `npx vitest run server/__tests__/routes/flights.test.ts -x`         | Wave 0          |
| DATA-04e | Flight route returns rateLimited flag on 429                          | unit        | `npx vitest run server/__tests__/routes/flights.test.ts -x`         | Wave 0          |
| DATA-04f | Flight route serves stale cache when rate limited                     | unit        | `npx vitest run server/__tests__/routes/flights.test.ts -x`         | Wave 0          |
| DATA-04g | ADS-B Exchange API key not leaked in responses                        | integration | `npx vitest run server/__tests__/security.test.ts -x`               | Modify existing |
| DATA-04h | FlightStore handles rateLimited connection status                     | unit        | `npx vitest run src/__tests__/flightStore.test.ts -x`               | Modify existing |
| DATA-04i | useFlightPolling uses source-specific URL and interval                | unit        | `npx vitest run src/__tests__/useFlightPolling.test.ts -x`          | Modify existing |
| DATA-04j | SourceSelector renders dropdown with current source                   | unit        | `npx vitest run src/__tests__/SourceSelector.test.ts -x`            | Wave 0          |
| DATA-04k | Source toggle flushes flights and triggers refetch                    | integration | `npx vitest run src/__tests__/useFlightPolling.test.ts -x`          | Modify existing |

### Sampling Rate

- **Per task commit:** `npx vitest run server/__tests__/ src/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/__tests__/adapters/adsb-exchange.test.ts` -- covers DATA-04a, DATA-04b, DATA-04c
- [ ] `server/__tests__/routes/flights.test.ts` -- covers DATA-04d, DATA-04e, DATA-04f (new file, existing route tests were inline in security.test.ts)
- [ ] `src/__tests__/SourceSelector.test.ts` -- covers DATA-04j
- [ ] Modify `server/__tests__/security.test.ts` -- add ADS-B Exchange API key leak test (DATA-04g)
- [ ] Modify `src/__tests__/flightStore.test.ts` -- add rateLimited status tests (DATA-04h)
- [ ] Modify `src/__tests__/useFlightPolling.test.ts` -- add source-aware polling tests (DATA-04i, DATA-04k)

## Sources

### Primary (HIGH confidence)

- [ADS-B Exchange V2 API Fields](https://www.adsbexchange.com/version-2-api-wip/) - Complete field documentation with types and units
- [ADSB One API (v2-compatible)](https://github.com/airplanes-live/api) - Verified response format and endpoint structure, confirmed 250 NM max radius
- [RapidAPI ADSBexchange-com1 details page](https://rapidapi.com/adsbx/api/adsbexchange-com1/details) - Confirmed base URL, 15 endpoints, endpoint patterns

### Secondary (MEDIUM confidence)

- [RapidAPI pricing](https://rapidapi.com/adsbx/api/adsbexchange-com1/pricing) - 10,000 requests/month, $10/month for basic tier; free tier existence unclear for 2026
- [ADS-B Exchange API Lite page](https://www.adsbexchange.com/api-lite/) - Personal/non-commercial use via RapidAPI
- [ADS-B Exchange REST API samples](https://www.adsbexchange.com/data/rest-api-samples/) - Endpoint format, auth header pattern

### Tertiary (LOW confidence)

- Rate limit free tier status (conflicting sources about free vs. paid-only) -- needs validation at implementation time

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - No new dependencies, extends existing patterns
- Architecture: HIGH - Adapter pattern proven with OpenSky, route dispatch is straightforward
- ADS-B Exchange API format: HIGH - V2 format confirmed across multiple compatible implementations (adsb.one, adsb.lol, adsb.fi)
- Rate limits / polling interval: MEDIUM - Based on 10,000 req/month which appears consistent across sources, but free tier availability for 2026 is uncertain
- Pitfalls: HIGH - Unit conversion and coverage gap issues are well-documented in the API field documentation
- UI patterns: HIGH - Extends existing OverlayPanel and theme system

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (30 days -- API pricing and availability may change)
