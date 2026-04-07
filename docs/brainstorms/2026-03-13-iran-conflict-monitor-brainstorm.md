---
topic: Iran Conflict Real-Time Monitor
date: 2026-03-13
status: brainstorm-complete
---

# Iran Conflict Real-Time Monitor

## What We're Building

A personal real-time intelligence dashboard for monitoring the Iran conflict. The tool displays a 2.5D map of Iran with data points representing ships, flights, missiles, and drones. Users can toggle layers, apply advanced filters, and click into any object for a detail panel showing live stats (speed, heading, origin, history, linked events).

The tool prioritizes concrete, mathematical data — counts, timelines, movement vectors, force posture — over qualitative news. Non-statistical news is hidden by default, with a toggle to reveal it.

**Core value:** Surface actionable intelligence data in real-time on a visual, interactive map.

## Why This Approach

**Deck.gl + React** because:

- GPU-accelerated rendering handles thousands of moving points (ships, flights) without frame drops
- Built-in layer system maps directly to the toggle UX (ships layer, flights layer, etc.)
- Native support for 2.5D visualization — hexagonal columns, extruded polygons, arc layers
- MapLibre as the free base map (no Mapbox API key costs)
- React component model keeps the detail panels and filter controls clean

**Rejected alternatives:**

- Three.js custom globe — too much effort reinventing map projections, tile loading, interaction
- Leaflet + D3 — no real 2.5D, performance ceiling with real-time moving points

## Key Decisions

| Decision                        | Rationale                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Deck.gl + MapLibre for map      | GPU-accelerated, free, 2.5D native                                                       |
| React for UI                    | Component model fits panels, toggles, filters                                            |
| Public APIs only                | ADS-B Exchange, AIS/MarineTraffic, ACLED, OSINT feeds                                    |
| Mixed refresh rates             | Flights/ships every ~5s via WebSocket; conflict events every 1-5 min via polling         |
| User-saved snapshots as JSON    | Save snapshots to local JSON files — simple, portable, git-trackable                     |
| Dark + clean aesthetic          | Black background, white grid, restrained accents (blue, red, green, yellow only)         |
| Detail panel (not drill-down)   | Click object → side panel with live stats, history, linked events                        |
| Layer toggles + smart filters   | Quick category on/off plus attribute filtering (nationality, speed, altitude, proximity) |
| Non-stat news hidden by default | Data-backed items only; toggle reveals qualitative reports                               |
| No alerts                       | User monitors actively — no push or in-app notifications                                 |
| Personal tool, no auth          | Single user, localhost or simple deploy                                                  |
| No people tracking              | Significant persons dropped from scope                                                   |

## Data Sources

| Category        | Source                                 | Refresh             |
| --------------- | -------------------------------------- | ------------------- |
| Flights         | ADS-B Exchange / OpenSky Network       | ~5s (WebSocket/SSE) |
| Ships           | AIS data / MarineTraffic API           | ~30s-1min           |
| Conflict events | ACLED API                              | 1-5 min polling     |
| Missiles/Drones | OSINT aggregators, conflict event APIs | 1-5 min polling     |

## Data Priority (All Four Categories)

1. **Movement data** — speed, heading, altitude, coordinates, trajectory predictions
2. **Counts & tallies** — strikes, sorties, confirmed intercepts, casualties
3. **Timelines** — event timestamps, intervals between strikes, escalation patterns
4. **Force posture** — asset positions, carrier group compositions, air defense zones

## Visual Design

- **Theme:** Dark background, clean grid layout
- **Colors:** White/black primary, with blue (friendly/naval), red (hostile/strikes), green (safe/confirmed), yellow (warning/unconfirmed) accents only
- **Map:** 2.5D — flat map with extruded columns/hexagons showing data density, arc layers for trajectories
- **Detail panel:** Side panel on object click — live stats, mini timeline, related objects
- **Layer toggles:** Top or side toolbar — ships, flights, missiles, drones
- **Filters:** Expandable advanced filter panel — nationality, threat level, speed, altitude, date range, proximity

## Resolved Questions

- ~~Significant people~~ — Dropped from scope entirely
- Snapshot storage — JSON files saved to local directory (simple, portable, git-trackable)

## Open Questions

- Which specific ADS-B and AIS API endpoints/plans to use (free tier limits)?
- How to source missile/drone launch data in near real-time — ACLED has delays?
