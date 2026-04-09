# Phase 3: API Proxy - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Express backend proxy that handles all external API calls for the Iran Conflict Monitor. Shields the frontend from CORS issues, manages API keys via environment variables, and normalizes upstream responses into a common `MapEntity` format. The proxy exposes separate REST endpoints per data source.

</domain>

<decisions>
## Implementation Decisions

### Entity Data Model

- Minimal shared fields: `id`, `type`, `lat`, `lng`, `timestamp`, `label` — just enough to place on map and identify
- Type-specific data in a nested object (discriminated union pattern)
- Four entity types: `flight`, `ship`, `missile`, `drone`
- Proxy normalizes all upstream API responses into `MapEntity` format before sending to frontend
- Separate endpoints per data source: `/api/flights`, `/api/ships`, `/api/events`

### Freshness & Rate Limits

- OpenSky: Register for free account to get higher rate limits (~1 req/5s) meeting the 5s refresh target
- AIS ship data: Use AISStream.io WebSocket API (free, real-time push, requires free API key signup)
- ACLED conflict events: Fetch last 7 days of data (ACLED has ~24-48hr reporting delay)
- When upstream API is down/rate-limited: serve stale cache with staleness indicator (`stale: true`, `lastFresh: timestamp`)
- In-memory cache only (no disk persistence) — cache refills quickly from upstream APIs on restart
- Proxy-side bounding box filter — send bbox params to upstream APIs, focused on Iran/Middle East region
- Minimal console logging for upstream request/response times and errors

### Server Dev Workflow

- Server code in `server/` directory at project root alongside `src/`
- Shared `package.json` — single repo, not workspaces
- `npm run dev` starts both Vite (frontend) and Express (backend) via `concurrently`
- Server runs with `tsx watch server/index.ts` — no build step, instant restarts
- Express server on port 3001, Vite frontend on default port
- API keys stored in `.env` file at project root

### Claude's Discretion

- Exact MapEntity TypeScript interfaces and discriminated union implementation
- Cache TTL values per data source
- Express middleware setup and error handling patterns
- Adapter module structure within `server/adapters/`
- `.env` variable naming conventions

</decisions>

<specifics>
## Specific Ideas

- User explicitly chose minimal entity model to keep TypeScript discriminated unions clean — flights/ships have movement vectors while conflict events have casualty counts
- Stale cache should include staleness metadata so frontend can show data freshness indicators (feeds into RT-02 in v2)
- AISStream.io chosen specifically for its WebSocket push model — no polling needed for ship data

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/stores/mapStore.ts`: Zustand store with curried `create<T>()()` pattern — same pattern for a future entity store
- `src/types/ui.ts`: UIState interface — MapEntity types should follow same style in a `src/types/entities.ts`
- `src/stores/uiStore.ts`: Existing Zustand store pattern to reference

### Established Patterns

- Zustand 5 with curried create pattern for type inference
- TypeScript strict mode enabled
- Vite 6 as build tool — `tsx` for server aligns with TypeScript-first approach
- Tailwind CSS v4 with CSS-first @theme config

### Integration Points

- Frontend will fetch from `http://localhost:3001/api/*` endpoints
- Entity data flows into Zustand stores (to be created in Phase 4+)
- MapEntity format feeds into entity rendering (Phase 5), detail panel (Phase 8), and filters (Phase 9)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 03-api-proxy_
_Context gathered: 2026-03-14_
