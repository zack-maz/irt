# Phase 2: Base Map - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive 2.5D map of Iran rendered with Deck.gl + MapLibre, filling the AppShell map container. Users can pan, zoom, rotate, and tilt the map. Includes 3D terrain, navigation compass, coordinate readout, and scale bar. No data entities or layers — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Map style & tiles

- CARTO dark-matter base tiles (free, no API key)
- Country and city labels visible; road names and minor features hidden
- Emphasized country borders (brighter/thicker lines than CARTO default), including Iran and all neighbors
- Subtle dark blue tint for water bodies (Persian Gulf, Caspian Sea, Gulf of Oman)
- Low-exaggeration 3D terrain (1-2x) so Zagros/Alborz ridgelines are visible bumps without dominating

### Initial view & bounds

- Centered on Iran (~32.4°N, 53.7°E) at zoom ~5-6
- Slight initial pitch (~30-40°) to show 2.5D perspective immediately
- Hard bounds locked to wider Middle East region (~15°N-45°N, 30°E-70°E)
- Zoom limits: min ~3, max ~15

### Navigation controls

- Minimal — compass indicator only, no zoom buttons
- Double-click compass to reset to default view (animated)
- Right-click drag to rotate bearing, Ctrl+click+drag to adjust pitch
- Standard MapLibre defaults for scroll-to-zoom, click+drag to pan

### Map-to-theme integration

- Subtle vignette edge effect (dark gradient around viewport edges) for 'looking through a scope' feel
- Compass and map UI elements use neutral gray/white — accent colors reserved for data entities only
- Small lat/lon coordinate readout in bottom-right, updating on cursor move
- Small scale bar (km/miles) in bottom-right near coordinate readout

### Loading experience

- Dark bg-surface with subtle pulse/breathing animation while tiles load
- Map fades in over ~300-500ms once tiles are ready

### Claude's Discretion

- Tile load fallback strategy
- Attribution placement and styling (must satisfy CARTO/OSM license requirements)
- Exact vignette gradient intensity
- Compass size and exact placement
- Coordinate readout and scale bar exact styling

</decisions>

<specifics>
## Specific Ideas

- Intelligence/military dashboard aesthetic — HUD-style, not consumer map app
- Terrain should give a "simple indication of altitude" — visible but not dramatic
- The map should feel like a tactical display surface, ready to receive data overlays

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `AppShell.tsx`: Has `data-testid="map-container"` div at `z-[var(--z-map)]` ready for map injection
- `uiStore.ts`: Zustand store with panel visibility toggles — can extend for map state
- `OverlayPanel`: Reusable overlay component for any floating UI elements

### Established Patterns

- Tailwind CSS v4 with `@theme` semantic tokens (bg-surface, accent colors)
- Z-index scale as CSS custom properties (--z-map, --z-overlay, --z-controls)
- Curried `create<Type>()()` Zustand pattern for type inference

### Integration Points

- Map component replaces the placeholder `<div className="h-full w-full bg-surface" />` inside AppShell's map-container div
- Coordinate readout and scale bar are new overlay elements — position in bottom-right using existing z-index system
- Compass sits in its own overlay position (bottom-right or similar)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 02-base-map_
_Context gathered: 2026-03-14_
