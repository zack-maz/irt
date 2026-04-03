# Phase 26: Water Stress Layer - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Toggleable water stress overlay showing resource scarcity at specific water infrastructure locations (dams, reservoirs, treatment plants, canals) with stress-colored markers, major river lines color-coded by watershed stress, and real-time precipitation integration. Desalination plants migrate from Sites overlay to Water layer. Full entity integration (detail panel, counters, search) gated by layer active state.

</domain>

<decisions>
## Implementation Decisions

### Data & Color Scale
- **Point-based approach** — water stress shown at specific facility locations, NOT blanket country/watershed polygon fills
- **WRI Aqueduct baseline stress** — annual basin-level data; each facility gets stress level from its WRI watershed via coordinate-to-basin intersection
- **Multiple Aqueduct indicators** — baseline water stress + drought risk + groundwater depletion + seasonal variability (all shown in detail panel)
- **Color ramp** — continuous gradient from black (extreme stress / lowest water health) to light blue (healthy / low stress)
- **Facility markers** — type-specific icons (dam, reservoir, plant, canal) tinted by stress color
- **Open-Meteo precipitation** — real-time 30-day precipitation anomaly per facility, polled every 6 hours, Redis cache 6h TTL
  - Feeds into composite water health score alongside WRI baseline
  - Shows in WaterFacilityDetail panel as supplementary indicator
  - Appears in weather tooltip when both Climate + Water layers are active

### Water Facility Data
- **Source** — Overpass API query for Middle East water infrastructure (same pattern as Phase 15 key sites)
- **Facility types** — 4 types queried from OSM:
  1. Dams (`waterway=dam`)
  2. Reservoirs (`natural=water` + `reservoir=*`)
  3. Water treatment plants (`man_made=water_works`)
  4. Canals/Aqueducts (`waterway=canal`) — may need size filtering to avoid excessive results
- **Desalination plants** — moved entirely from Sites overlay to Water layer; remove desalination toggle from Sites section in LayerTogglesSlot
- **Fetch pattern** — one-time fetch on mount (same as useSiteFetch), Redis cache 24h TTL
- **Attack status** — cross-reference facility locations with GDELT events within 5km (same as attackStatus.ts for other sites)

### Water Infrastructure Labels
- **Rivers** — major conflict-relevant rivers as line features: Tigris, Euphrates, Nile, Jordan, Karun, Litani
- **River extent** — full river length (not clipped to IRAN_BBOX)
- **River color** — stress-colored by watershed (color varies along the river based on WRI stress of the basin it passes through)
- **River/lake labels** — always visible when Water layer active; visually distinct from ethnic labels (Claude decides: different font, size, or italicized)
- **Facility labels** — visible on hover only (not always-on)

### Site Cross-Reference
- **Remaining sites** — nuclear, naval, oil, airbase, port stay in siteStore unchanged with attack status
- **Desalination** — removed from Sites section entirely (no toggle, no rendering under Sites)
- **Clickable** — water facilities open a WaterFacilityDetail panel on click
- **Detail panel** — full detail: facility name, type, stress level with color indicator, all Aqueduct indicators, precipitation anomaly, attack status, coordinates, copy button
- **Full integration** — water facilities appear in Counters, are searchable, trigger proximity alerts — but ONLY when Water layer is active

### Search/Filter Tags
- `type:dam`, `type:reservoir`, `type:plant`, `type:canal` — filter by facility type
- `stress:low`, `stress:high`, `stress:extreme` — filter by water stress level
- `name:` — search by facility name (e.g., `name:mosul`)
- `near:` — extend to include water facility names and river names

### Interactions & Stacking
- **Z-level** — water facilities on the SAME 3D z-level as entities (flights, ships, events, sites), not above
- **Layer order** — Political < Ethnic < Rivers < Water facilities = Entities
- **Legend** — continuous gradient bar from black (extreme stress) to light blue (healthy)

### Claude's Discretion
- River/lake label styling (font, size, italic — must be visually distinct from ethnic labels)
- Overpass query optimization (canal size filtering to avoid excessive results)
- Composite water health formula (how WRI baseline + precipitation anomaly combine)
- Water facility icon designs per type
- Open-Meteo precipitation API endpoint specifics and batch strategy
- WRI Aqueduct data download/extraction approach

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `usePoliticalLayers` / `useEthnicLayers` hook pattern: deck.gl layers returned from hook
- `layerStore.ts`: `water` already registered as VisualizationLayerId
- `LayerTogglesSlot.tsx`: Water row exists with `comingSoon: true`
- `LEGEND_REGISTRY` with `mode: 'gradient'` support
- `src/lib/attackStatus.ts`: cross-reference coordinates with GDELT events (reuse for water facilities)
- `src/adapters/overpass.ts`: existing Overpass adapter for site queries
- `src/hooks/useSiteFetch.ts`: one-time fetch pattern
- `src/stores/siteStore.ts`: existing site state pattern (adapt for water facilities)
- `useEntityLayers`: IconLayer pattern with icon atlas for type-specific markers
- `useWeatherLayers`: Open-Meteo integration pattern
- `src/components/map/layers/WeatherOverlay.tsx`: existing weather tooltip can be extended

### Established Patterns
- deck.gl GeoJsonLayer/IconLayer for terrain-compatible rendering
- `useLayerStore(s => s.activeLayers.has('water'))` selector
- One-time fetch on mount with Redis cache
- Detail panel via `DetailPanelSlot` + type-specific content components
- Search tags evaluated in `useSearchResults`
- Counter rows in `useCounterData`
- Click guard in `handleDeckClick` for non-entity layer IDs

### Integration Points
- `BaseMap.tsx`: new `useWaterLayers()` hook, water facility layers interleaved with entity layers (same z-level)
- `LayerTogglesSlot.tsx`: remove `comingSoon` from water entry; remove desalination sub-toggle from Sites section
- `siteStore.ts` / `useSiteFetch.ts`: remove desalination type from Overpass query
- New `waterStore.ts` for water facility state
- New `/api/water` endpoint for facility data + stress levels
- New `WaterFacilityDetail.tsx` detail panel component
- Extend `useCounterData` and `useSearchResults` for water facilities (gated by layer active)
- Extend `WeatherOverlay.tsx` tooltip for precipitation when Water layer active

</code_context>

<specifics>
## Specific Ideas

- Water stress as pinpoint markers at specific facilities, NOT country-wide polygon fills — "bold in these pinpoint locations, no visibility elsewhere"
- Desalination plants belong in Water layer, not Sites — clean thematic grouping
- Full first-class entity treatment (click, detail panel, counters, search) but gated by layer active state
- Precipitation from Open-Meteo as real-time supplement to annual WRI data — feeds into composite health score
- Rivers as stress-colored line features, not just labels — visual connection between water source and facility
- Black → light blue gradient (inverted from typical blue→red) — black = worst water health

</specifics>

<deferred>
## Deferred Ideas

- **Threat cluster hover/unhover bug** — from Phase 25 discussion, highlight persists after unhovering. Not Phase 26 scope.
- **Southern Lebanon disputed zone** — still needs better boundary data (from Phase 24)
- **Yazidi ethnic zone** — absent from GeoEPR, deferred from Phase 25
- **Real-time reservoir level data** — satellite-based reservoir monitoring (NASA/ESA) could provide actual water levels, but requires significant data pipeline work
- **Groundwater depletion animation** — GRACE satellite data could show groundwater trends over time as an animated overlay

</deferred>

---

*Phase: 26-water-stress-layer*
*Context gathered: 2026-04-02*
