# Iran Conflict Monitor — Project Status

**Last updated:** 2026-03-17

## Progress

```
[██████████████████░░] 9/10 phases complete (90%)
```

## Phase Status

| Phase | Name | Status | Date |
|-------|------|--------|------|
| 1 | Project Scaffolding & Theme | Done | 2026-03-14 |
| 2 | Base Map | Done | 2026-03-14 |
| 3 | API Proxy | Done | 2026-03-15 |
| 4 | Flight Data Feed | Done | 2026-03-15 |
| 5 | Entity Rendering | Done | 2026-03-15 |
| 6 | Multi-Source Flight Data | Done | 2026-03-16 |
| 7 | StatusPanel & Source Config | Done | 2026-03-16 |
| 8 | Ship & Conflict Data | Done | 2026-03-16 |
| 8.1 | GDELT Conflict Events | Done | 2026-03-17 |
| 9 | Layer Controls & News Toggle | Done | 2026-03-17 |
| 10 | Detail Panel | Not started | — |

## Current Focus

**Phase 10: Detail Panel** — Click-to-inspect entities with live stats and metadata.

## What's Been Built

### Phase 1: Project Scaffolding & Theme (Complete)
- Vite 6 + React 19 + TypeScript 5.9 scaffold
- Tailwind CSS v4 dark theme with semantic color tokens
- AppShell layout with full-viewport dark shell and z-indexed overlay regions
- Zustand UI store with panel visibility toggles

### Phase 2: Base Map (Complete)
- Interactive 2.5D map centered on Iran using Deck.gl + MapLibre
- CARTO Dark Matter base tiles, AWS Terrarium DEM terrain (3x exaggeration)
- Compass control, coordinate readout, scale bar, vignette, loading animation

### Phase 3: API Proxy (Complete)
- Express 5 server with OpenSky, AISStream, ACLED adapters
- In-memory cache with TTLs, security middleware

### Phase 4: Flight Data Feed (Complete)
- Recursive setTimeout polling with tab visibility awareness
- Connection health tracking, stale data clearing (60s threshold)

### Phase 5: Entity Rendering (Complete)
- Deck.gl IconLayer markers with type-specific icons and colors
- Altitude-based opacity, zoom-responsive sizing (meters + pixel bounds)

### Phase 6-7: Multi-Source Flights & StatusPanel (Complete)
- Three flight sources: OpenSky, ADS-B Exchange, adsb.lol
- StatusPanel HUD with connection health dots and entity counts
- Source persistence in localStorage

### Phase 8-8.1: Ship & Conflict Data (Complete)
- Ship polling (30s), event polling (15min)
- GDELT v2 adapter: ZIP download → CSV parse → FIPS/CAMEO filtering
- Event deduplication by date/code/location

### Phase 9: Layer Controls & News Toggle (Complete)
- Layer toggles panel: Flights, Ground, Unidentified, Ships, Drones, Missiles, News
- EntityTooltip with per-type content and GDELT metadata (actors, CAMEO, Goldstein, source link)
- News toggle gates event tooltips; hover glow/highlight feedback
- StatusPanel counts reflect only visible entities per toggle and type
- Zoom +/- controls, localStorage persistence for all toggles
- 309 tests passing

## Blockers

None.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Deck.gl + MapLibre | GPU-accelerated 2.5D, free, native layer system |
| Zustand 5 | Lightweight state with curried create pattern for type inference |
| Express 5 API proxy | CORS handling, API key protection, data normalization |
| GDELT v2 over ACLED | Free, no auth required, 15-min updates, global coverage |
| GDELT deduplication | Same event appears multiple times with different actors; keep highest-mention row |
| pickable: false on glow/highlight | Prevents hover blink from layer picking interference |
| showNews default ON | Users expect tooltips visible by default |

## Repository

- **Remote**: https://github.com/zack-maz/irt.git
- **Branch strategy**: Feature branches, never commit to main directly
