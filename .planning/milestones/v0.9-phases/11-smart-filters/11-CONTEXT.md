# Phase 11: Smart Filters - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Advanced multi-criteria filtering to narrow visible entities on the map. Users can filter by nationality/country, speed range, altitude range, proximity to a map pin, and date range. Filters combine with AND logic and layer on top of existing layer toggles. No new data sources, no analytics counters, no new entity types — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Filter panel placement
- New "Filters" OverlayPanel below the existing Layers panel in the left-side stack
- Collapsible with +/- header, same pattern as Layers panel
- Collapsed by default on page load (advanced feature, most sessions won't need it)
- Header shows badge count when collapsed: "Filters (3)" indicating active filter count

### Filter controls
- **Country/nationality**: Text input with autocomplete, populated from currently visible entities. Supports multiple country selections displayed as chips. Matches `originCountry` for flights, `actor1` OR `actor2` for events. Ships always included (no nationality in AIS data — non-applicable)
- **Speed range**: Dual-thumb range slider (min/max). Applies to flights (`velocity` in m/s) and ships (`speedOverGround` in knots — display in knots for both)
- **Altitude range**: Dual-thumb range slider (min/max). Applies to flights only (`altitude` in meters — display in feet). Ships and events always included (non-applicable)
- **Proximity radius**: Slider from 10km to 500km with labeled preset ticks (25, 50, 100, 250, 500km). Requires user-placed pin on the map (click "Set pin" button then click map). Pin persists until cleared. Subtle dashed/semi-transparent circle overlay shows the radius on the map
- **Date range**: Applies to conflict events only (GDELT timestamp). Flights and ships are live data — always included (non-applicable)

### Cross-type filter behavior
- Non-applicable filters include the entity (not exclude). e.g., ships remain visible when altitude filter is active because altitude doesn't apply to ships
- Multiple filters combine with AND logic — entity must pass all applicable filters to remain visible
- Date range filter applies to events only; flights and ships are always live and pass through

### Active filter visibility & clearing
- Badge count on collapsed panel header: "Filters (3)"
- When expanded, active filter rows are visually highlighted (arrow indicator ▸), inactive show "---"
- Per-filter reset: small × on each active filter row to clear individually
- "Clear all" button at the bottom to reset everything at once

### Filter persistence
- Filters do NOT persist to localStorage — reset on page reload
- Filters are transient analysis tools, not permanent preferences (unlike layer toggles)

### StatusPanel integration
- StatusPanel entity counts reflect filtered results (only entities passing all filters)
- Consistent with how layer toggles already affect counts

### Events toggle hierarchy fix
- The Events master toggle should toggle all sub-event categories (Airstrikes, Ground Combat, Targeted, Other Conflict) together
- When Events is toggled OFF, all sub-events are hidden regardless of individual sub-toggle state
- When Events is toggled ON, sub-events respect their individual toggle states

### Claude's Discretion
- Exact slider styling and tick mark design for range inputs
- Proximity pin icon/marker design
- Circle overlay color and opacity for proximity radius
- Date range input widget (date picker vs. relative presets like "last 24h")
- Autocomplete dropdown styling for country input
- Exact speed range bounds and unit display logic
- Keyboard accessibility for slider controls

</decisions>

<specifics>
## Specific Ideas

- Filter panel should maintain the tactical HUD aesthetic — monospace, dark, minimal — consistent with Layers and StatusPanel
- Dual-thumb sliders should show current min/max values as labels near the thumbs
- Proximity pin + radius circle gives a powerful "show me what's near this location" capability for intelligence analysis
- Country autocomplete from live data means the options are always relevant to what's currently visible
- The badge count "Filters (3)" on collapsed header provides at-a-glance awareness without expanding

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OverlayPanel` (`src/components/ui/OverlayPanel.tsx`): Dark panel container — reuse for Filters panel
- `LayerTogglesSlot` (`src/components/layout/LayerTogglesSlot.tsx`): Collapsible panel pattern with +/- header to follow
- `useUIStore` (`src/stores/uiStore.ts`): Extend with filter state or create dedicated filterStore
- `useEntityLayers` (`src/hooks/useEntityLayers.ts`): Where entity filtering happens — add filter logic to existing `useMemo` chains
- `ENTITY_DOT_COLORS` (`src/components/map/layers/constants.ts`): For consistent color coding in filter panel
- `loadPersistedToggles`/`persistToggles` pattern: Reference for localStorage approach (though filters won't persist)

### Established Patterns
- Zustand curried `create<T>()()` with selector pattern `s => s.field`
- OverlayPanel for dark overlay containers
- `useEntityLayers` filters entity arrays via `useMemo` — extend with filter predicates
- `CONFLICT_TOGGLE_GROUPS` maps toggle keys to event type arrays — single source of truth pattern
- `isCollapsed` + `toggleX` pattern for collapsible panels

### Integration Points
- `src/hooks/useEntityLayers.ts`: Add filter predicates to existing `useMemo` flight/ship/event filtering
- `src/stores/uiStore.ts` or new `src/stores/filterStore.ts`: Filter state (country, ranges, proximity pin, date)
- `src/types/ui.ts`: Filter state type interface
- `src/components/layout/AppShell.tsx`: Wire new FilterPanelSlot into left-side stack below LayerTogglesSlot
- `src/components/ui/StatusPanel.tsx`: Ensure counts derive from filtered entity arrays
- `src/components/map/BaseMap.tsx`: Proximity pin click handler and circle overlay layer (ScatterplotLayer or PolygonLayer)

</code_context>

<deferred>
## Deferred Ideas

- Conflict event filtering by sub-type (beyond show/hide toggles) — could enhance with keyword search in a future phase
- Saved filter presets ("Military high-altitude", "Near Tehran") — future enhancement
- Filter by Goldstein scale range for conflict severity — could be added to analytics phase

</deferred>

---

*Phase: 11-smart-filters*
*Context gathered: 2026-03-18*
