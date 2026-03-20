# Phase 8: Ship & Conflict Data Feeds - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship positions (AIS) and conflict events (ACLED) flow into the frontend alongside flight data, all rendering simultaneously on the map. Server-side adapters and routes already exist from Phase 3 — this phase is primarily frontend stores, polling hooks, wiring real data into existing stubbed entity layers, and replacing the SourceSelector with a simplified status display. Each data source refreshes independently at its own rate.

</domain>

<decisions>
## Implementation Decisions

### Ship polling & staleness
- Frontend polls `/api/ships` every 30 seconds (recursive setTimeout, same pattern as flights)
- Ships use full-replace on each poll — server accumulates via WebSocket Map, frontend replaces atomically
- Stale threshold: 120 seconds (2x poll interval) — if no fresh WebSocket messages for 4 polls, clear ships
- Tab visibility aware: pause polling on hidden, immediate fetch on visible (same as flights)

### Conflict event polling & freshness
- Frontend polls `/api/events` every 5 minutes (matches 5-min server cache TTL)
- Events persist until next successful fetch — no stale clearing (historical data doesn't "go stale")
- No special data-age indicator — user understands ACLED is retrospective
- Tab visibility aware: same pause/resume pattern
- Expand ACLED query to Greater Middle East region (multiple countries, not just Iran) to match expanded flight coverage

### Status display (replaces SourceSelector)
- Remove SourceSelector dropdown entirely — no source switching UI
- Backend keeps adsb.lol as default flight source, multi-source support preserved but not exposed
- Replace with clean HUD-style status panel in top-right: three lines showing colored dot + count + entity type
- Color-coded dots: green=connected, yellow=stale, red=error (per data feed)
- Loading state: gray pulsing dot + '—' instead of count (indicates loading without misleading 0)
- Format: `● 247 flights` / `● 42 ships` / `● 17 events`

### Store & hook architecture
- Separate Zustand stores: `shipStore.ts` + `eventStore.ts` alongside existing `flightStore.ts`
- Same curried `create<T>()()` pattern, each store owns its data, connectionStatus, count, lastFresh
- Separate polling hooks: `useShipPolling.ts` + `useEventPolling.ts` (same recursive setTimeout pattern)
- All three polling hooks called in AppShell (alongside existing useFlightPolling)
- Wire real store data into existing stubbed entity layers in useEntityLayers (replace `data: []` with store selectors)
- Static layers (ship/drone/missile) become dynamic — need useMemo deps on store data

### Claude's Discretion
- EventStore interface details (whether to track separate connectionStatus or simplified version)
- How to expand ACLED query to multiple countries (country list, bbox filter, or region param)
- Status panel component implementation (new component vs refactor of SourceSelector)
- Whether to remove SourceSelector.tsx entirely or gut and repurpose it
- How to handle missing AISStream API key gracefully on frontend (show error status or hide ships line)
- FlightStore simplification (remove activeSource/setActiveSource if source switching UI is gone)

</decisions>

<specifics>
## Specific Ideas

- Status panel should feel like a HUD readout — minimal, tactical, just data
- No source labels, no dropdown — just counts with health dots
- Gray pulsing dot for loading gives visual continuity before data arrives (not a blank gap or misleading zero)
- Greater Middle East expansion for ACLED matches the flight coverage expansion done in Phase 6

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/adapters/aisstream.ts`: WebSocket adapter, accumulates ships in Map<MMSI, ShipEntity> — fully functional
- `server/adapters/acled.ts`: REST adapter with OAuth2 token caching, fetches last 7 days — fully functional
- `server/routes/ships.ts`: Returns `{ data, stale, lastFresh }` — CacheResponse pattern
- `server/routes/events.ts`: Returns `{ data, stale, lastFresh }` with 5-min cache — CacheResponse pattern
- `src/stores/flightStore.ts`: Template for new stores — ConnectionStatus type, curried create pattern
- `src/hooks/useFlightPolling.ts`: Template for new hooks — recursive setTimeout, tab visibility, stale check
- `src/hooks/useEntityLayers.ts`: Ship/drone/missile layers already stubbed with `data: []`, correct icons/colors/sizing

### Established Patterns
- Zustand 5 curried `create<T>()()` for type inference
- Zustand selector `s => s.field` for minimal re-renders
- CacheResponse<T> with `stale: boolean` and `lastFresh: number`
- Recursive setTimeout (not setInterval) for polling
- Tab visibility pause on hidden, immediate fetch on visible
- ConnectionStatus type: `'connected' | 'stale' | 'error' | 'loading'`

### Integration Points
- `src/components/layout/AppShell.tsx`: Add useShipPolling() and useEventPolling() calls
- `src/hooks/useEntityLayers.ts` line 58-108: Replace `data: []` with store selectors
- `src/components/ui/SourceSelector.tsx`: Replace/remove — becomes status panel
- `server/adapters/acled.ts` line 109: Country filter `country: 'Iran'` — expand to multiple countries
- `server/index.ts` line 44-49: AISStream conditional connection already guarded by env var

</code_context>

<deferred>
## Deferred Ideas

- Source switching UI — may return in a future phase if users want to toggle between flight sources
- Ship type classification (cargo, tanker, military) — would need additional AIS data fields
- Conflict event filtering by type (missiles vs drones) — belongs in Phase 9 (layer controls)

</deferred>

---

*Phase: 08-ship-conflict-data-feeds*
*Context gathered: 2026-03-16*
