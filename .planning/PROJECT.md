# Iran Conflict Monitor

## What This Is

A personal real-time intelligence dashboard for monitoring the Iran conflict. Displays a 2.5D map of Iran with live data points for ships, flights, missiles, and drones sourced from public APIs. Prioritizes concrete mathematical data — movement vectors, strike counts, timelines, force posture — over qualitative news reporting. Built as a web app using Deck.gl + React + MapLibre.

## Core Value

Surface actionable, data-backed intelligence on the Iran conflict in real-time on an interactive 2.5D map — numbers over narratives.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 2.5D map of Iran with Deck.gl + MapLibre rendering
- [ ] Real-time flight tracking via ADS-B Exchange / OpenSky Network (~5s refresh)
- [ ] Real-time ship tracking via AIS data (~30s-1min refresh)
- [ ] Conflict event data (missiles, drones, strikes) via ACLED API (1-5 min polling)
- [ ] Layer toggles for each data category (ships, flights, missiles, drones)
- [ ] Advanced smart filters (nationality, threat level, speed, altitude, date range, proximity)
- [ ] Detail panel on object click (live stats, mini timeline, related objects)
- [ ] Movement data display (speed, heading, altitude, coordinates, trajectory)
- [ ] Counts & tallies display (strikes, sorties, intercepts, casualties)
- [ ] Timeline display (event timestamps, intervals, escalation patterns)
- [ ] Force posture display (asset positions, carrier groups, air defense zones)
- [ ] Non-statistical news hidden by default with toggle to reveal
- [ ] User-saved snapshots stored as local JSON files
- [ ] Dark theme with clean grid layout (black/white, blue/red/green/yellow accents)

### Out of Scope

- Significant persons tracking — complexity without clear data sources
- Push/desktop notifications — user monitors actively
- User authentication — personal tool, single user
- Historical playback/replay — live + snapshots only
- Mobile app — web-first
- Real-time chat or collaboration — solo tool

## Context

- Data sources are all public/OSINT: ADS-B Exchange, OpenSky Network, AIS/MarineTraffic, ACLED
- Mixed refresh strategy: flights and ships near real-time via WebSocket/SSE, conflict events via periodic polling
- Deck.gl chosen for GPU-accelerated rendering of thousands of moving points with native 2.5D support (extruded hexagons, arc layers)
- MapLibre as free base map (no Mapbox API costs)
- Visual design: dark background, white grid, restrained color accents only (blue=naval/friendly, red=hostile/strikes, green=confirmed/safe, yellow=warning/unconfirmed)
- Brainstorm document: docs/brainstorms/2026-03-13-iran-conflict-monitor-brainstorm.md

## Constraints

- **Data sources**: Public APIs only — no classified or paid intelligence feeds
- **Cost**: Free-tier APIs where possible (MapLibre over Mapbox, OpenSky over paid ADS-B)
- **Platform**: Browser-based web application (React)
- **Single user**: No auth, no multi-tenancy, no collaboration features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Deck.gl + MapLibre for map | GPU-accelerated 2.5D, free, native layer system | — Pending |
| React for UI framework | Component model fits panels, toggles, filters | — Pending |
| Mixed refresh rates | Flights/ships need near real-time; events can poll | — Pending |
| JSON file snapshots | Simple, portable, git-trackable, no backend DB needed | — Pending |
| Hide non-stat news by default | Core value is mathematical data, not narratives | — Pending |
| No people tracking | Dropped — unclear data sources, high complexity | — Pending |

---
*Last updated: 2026-03-13 after initialization*
