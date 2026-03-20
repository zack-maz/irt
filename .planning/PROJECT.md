# Iran Conflict Monitor

## What This Is

A personal real-time intelligence dashboard for monitoring the Iran conflict and the Greater Middle East. Displays a 2.5D map with live data from three flight sources (OpenSky, ADS-B Exchange, adsb.lol), AIS ship tracking, and GDELT v2 conflict events. Features smart filters, layer toggles, click-to-inspect detail panels, and analytics counters. Prioritizes concrete data — movement vectors, strike counts, entity positions — over qualitative reporting. Built with Deck.gl + React + MapLibre + Express.

## Core Value

Surface actionable, data-backed intelligence on the Iran conflict in real-time on an interactive 2.5D map — numbers over narratives.

## Current Milestone: v1.1 Intelligence Layer

**Goal:** Add key infrastructure sites overlay, news feed, notification center with severity scoring, oil markets tracker, search/filter/UI cleanup, and production deploy sync.

**Target features:**
- Key infrastructure sites overlay (nuclear, naval, oil, airbase, dam, port) via Overpass API
- Multi-source news feed (GDELT DOC + BBC + Al Jazeera) with noise filtering
- Notification center with severity scoring, news matching, and proximity alerts
- Oil markets tracker (Brent, WTI, XLE, USO, XOM) with sparklines
- Search bar, filter panel improvements, and UI cleanup
- Production review and deploy sync

## Requirements

### Validated

- ✓ 2.5D map with Deck.gl + MapLibre rendering, 3D terrain, pan/zoom/rotate — v0.9
- ✓ Multi-source flight tracking (OpenSky, ADS-B Exchange, adsb.lol) with tab-aware polling — v0.9
- ✓ Ship tracking via AIS data (~30s refresh) — v0.9
- ✓ Conflict event data via GDELT v2 (15-min polling, CAMEO classification) — v0.9
- ✓ Layer toggles for each entity type (flights, ground, unidentified, ships, 4 conflict categories) — v0.9
- ✓ Smart filters (nationality, speed, altitude, proximity, date range) — v0.9
- ✓ Detail panel on entity click (live stats, dual units, lost contact tracking) — v0.9
- ✓ Movement data display (speed, heading, altitude, coordinates) — v0.9
- ✓ Strike/sortie running counters dashboard with delta animations — v0.9
- ✓ Non-statistical news hidden by default with toggle — v0.9
- ✓ Dark theme with clean grid layout (black/white, accent colors) — v0.9
- ✓ Express API proxy for CORS, API key management, data normalization — v0.9
- ✓ Upstash Redis cache + Vercel serverless deployment — v1.0

### Active

- [ ] Key infrastructure sites overlay (nuclear, naval, oil, airbase, dam, port) via Overpass API
- [ ] Multi-source news feed with conflict noise filtering (GDELT DOC, BBC, Al Jazeera)
- [ ] Notification center with severity scoring, news matching, and 24h event default
- [ ] Oil markets tracker with sparkline charts (Brent, WTI, XLE, USO, XOM)
- [ ] Global search bar with entity filtering
- [ ] Filter panel improvements (Reset All, grouped sections) and UI cleanup

### Out of Scope

- Significant persons tracking — complexity without clear data sources
- Push/desktop notifications — user monitors actively
- User authentication — personal tool, single user
- Historical playback/replay — live + snapshots covers use case
- Mobile app — web-first desktop monitoring tool
- Real-time chat or collaboration — solo tool
- News aggregation feed — contradicts "numbers over narratives" core value
- Prediction/forecasting — unreliable without classified data

## Context

Shipped v0.9 MVP with 12,262 LOC TypeScript/CSS in 6 days.
Tech stack: Vite 6, React 19, TypeScript 5.9, Zustand 5, Deck.gl, MapLibre, Tailwind CSS 4, Express 5.
Data sources: OpenSky Network, ADS-B Exchange (RapidAPI), adsb.lol, AISStream, GDELT v2.
Coverage area: Greater Middle East (15-42°N, 30-70°E) with 500 NM radius ADS-B queries from Iran center.
Brainstorm document: docs/brainstorms/2026-03-13-iran-conflict-monitor-brainstorm.md

## Constraints

- **Data sources**: Public APIs only — no classified or paid intelligence feeds
- **Cost**: Free-tier APIs where possible (MapLibre over Mapbox, adsb.lol as default)
- **Platform**: Browser-based web application (React)
- **Single user**: No auth, no multi-tenancy, no collaboration features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Deck.gl + MapLibre for map | GPU-accelerated 2.5D, free, native layer system | ✓ Good — smooth rendering, zoom-responsive icons |
| React 19 + Vite 6 + Zustand 5 | Modern stack, fast HMR, minimal boilerplate | ✓ Good — curried store pattern works well |
| Express 5 API proxy | CORS handling, API key protection, data normalization | ✓ Good — clean adapter pattern |
| Mixed refresh rates | Flights ~5-30s, ships 30s, events 15min | ✓ Good — independent polling loops |
| adsb.lol as default flight source | Free, no API key, community-driven | ✓ Good — best out-of-box experience |
| GDELT v2 over ACLED | Free, no auth, 15-min updates, CAMEO codes | ✓ Good — replaced ACLED which needs approval |
| Hide non-stat news by default | Core value is mathematical data, not narratives | ✓ Good — clean default view |
| No people tracking | Dropped — unclear data sources, high complexity | ✓ Good — kept scope manageable |
| Recursive setTimeout over setInterval | Prevents overlapping async fetches | ✓ Good — no race conditions |
| Tailwind CSS v4 CSS-first config | No tailwind.config.js, @theme in CSS | ✓ Good — cleaner setup |
| TypeScript pinned to ~5.9.3 | Avoid TS 6.0 breaking changes | ✓ Good — stable build |

---
*Last updated: 2026-03-19 after v1.1 milestone start*
