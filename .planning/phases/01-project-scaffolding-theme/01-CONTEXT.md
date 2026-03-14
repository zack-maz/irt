# Phase 1: Project Scaffolding & Theme - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

A runnable React/Vite/TypeScript application shell with dark theme layout, ready to receive map and data components. Defines the visual foundation and project structure that all subsequent phases build on.

</domain>

<decisions>
## Implementation Decisions

### Layout structure
- Full-screen map layout with floating overlays — map fills entire viewport
- All controls, panels, and counters float on top of the map with semi-transparent dark backgrounds
- Detail panel slides in from the left edge (~320px wide) when an entity is clicked
- Layer toggles and filter controls positioned in the top-right corner, filters expand as dropdown
- Analytics counters (strikes, sorties, intercepts) in a floating card in the top-left, collapsible
- Title/branding in top-left area (above or near the counters card)

### Shell placeholder regions
- Top-left: title/branding + collapsible counters card slot
- Top-right: layer toggle buttons + expandable filter controls slot
- Left edge: slide-in detail panel slot (hidden by default)
- Center: full-viewport map container
- All overlay slots should be defined as layout regions with z-index layering

### Claude's Discretion
- Exact dark background shade and overlay opacity levels
- Typography choices (font family, sizes, weights)
- Spacing and padding within overlay panels
- Grid line treatment (visible/subtle)
- Title text and branding style
- Responsive behavior at different viewport sizes
- Directory structure organization (components, hooks, stores, api)

</decisions>

<specifics>
## Specific Ideas

- Layout inspired by intelligence/military dashboards — full map with floating HUD-style overlays
- Counters card should feel like a heads-up display element, not a traditional sidebar widget
- Color accents are restrained: blue=naval/friendly, red=hostile/strikes, green=confirmed/safe, yellow=warning/unconfirmed (from PROJECT.md)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- Stack decided in STATE.md: React 19 + Vite 6 + TypeScript 5 + Tailwind CSS 4 + Zustand 5
- Dark theme with black/white primary + blue/red/green/yellow accents only

### Integration Points
- Shell layout must accommodate Deck.gl + MapLibre map component (Phase 2)
- Overlay regions must support Zustand-driven show/hide state

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-project-scaffolding-theme*
*Context gathered: 2026-03-13*
