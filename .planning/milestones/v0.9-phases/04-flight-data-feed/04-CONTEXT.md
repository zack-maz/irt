# Phase 4: Flight Data Feed - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Frontend data pipeline that fetches live flight positions from the Phase 3 API proxy and stores them in Zustand state for rendering (Phase 5). Includes polling logic, connection health tracking, and data freshness management. No map rendering — that's Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Ground traffic filtering
- Filter out onGround=true flights at the proxy adapter level (server/adapters/opensky.ts)
- Only airborne flights reach the frontend — ground traffic is noise for an intelligence dashboard
- No-callsign flights (hex-only, often military) flagged with `unidentified: true` boolean in FlightEntity.data
- All airborne flights included regardless of callsign presence — hex-only entries are often the most interesting

### Altitude filtering
- Claude's discretion on whether to apply a minimum altitude threshold for GPS noise filtering

### Tab visibility behavior
- Polling pauses completely when browser tab is hidden (no background requests)
- Immediate fresh fetch when tab regains focus, then resume normal interval
- 5s polling interval (matching original roadmap spec and OpenSky free-tier limit of ~1 req/5s)

### Connection state tracking
- Store tracks full connection health: 'connected' | 'stale' | 'error' | 'loading'
- Track stale duration using lastFresh timestamp from CacheResponse — enables "data is X minutes old" display in future phases
- On connection error, retry on normal 5s interval (no exponential backoff)
- Drop data after a staleness threshold (Claude decides exact threshold) — prevents showing dangerously outdated positions

### Flight volume & store updates
- No cap on flight count — fetch all airborne flights in Iran bbox (200-500 typical, well within Deck.gl capacity)
- Full atomic replace on each poll — entire flight array replaced, no merge-by-ID
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

</decisions>

<specifics>
## Specific Ideas

- Intelligence dashboard context: hex-only / no-callsign flights are often military and should be flagged, not filtered — they're the most interesting data points
- Stale data with age indicator is better than empty state, but only up to a point — after threshold, clear entirely to avoid showing dangerously outdated positions
- Tab visibility pause is important for API quota conservation on OpenSky's tight free-tier limits

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/adapters/opensky.ts`: Full OpenSky adapter with OAuth2 token caching, bbox filtering, FlightEntity normalization — needs onGround filter + unidentified flag added
- `server/routes/flights.ts`: `/api/flights` endpoint with EntityCache and stale fallback already working
- `server/types.ts`: FlightEntity type defined — needs `unidentified` boolean added to data interface
- `src/types/entities.ts`: Re-exports server types for frontend consumption
- `src/stores/mapStore.ts` + `src/stores/uiStore.ts`: Zustand curried create pattern to follow

### Established Patterns
- Zustand 5 with curried `create<T>()()` for type inference
- Zustand selector pattern `s => s.field` for minimal re-renders
- CacheResponse<T> with `stale: boolean` and `lastFresh: number` from proxy
- `IRAN_BBOX` constant in server/constants.ts (south: 25, north: 40, west: 44, east: 63.5)
- `CACHE_TTL.flights = 10_000` (10s server-side cache)

### Integration Points
- Frontend fetches from `http://localhost:3001/api/flights` (proxy endpoint)
- New flight store will follow same Zustand pattern as mapStore/uiStore
- Connection state feeds into future UI indicators (Phase 5+)
- flightCount feeds into counters card area (Phase 10)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-flight-data-feed*
*Context gathered: 2026-03-15*
