---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Data Quality & Layers
status: planning
last_updated: "2026-04-01T00:00:00.000Z"
last_activity: 2026-04-01 -- v1.3 milestone planning
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Surface actionable, data-backed intelligence on the Iran conflict in real-time on an interactive 2.5D map -- numbers over narratives.

## Current Position

Milestone: v1.3 Data Quality & Layers — PLANNING
Previous: v0.9-v1.2 all shipped (958 tests, p95 153ms)

## v1.3 Phases

| Phase | Name | Status |
|-------|------|--------|
| 22 | GDELT Event Quality & OSINT Integration | Context gathered |
| 23 | Threat Density Improvements | Planned |
| 24 | Political Boundaries Layer | Planned |
| 25 | Ethnic Distribution Layer | Planned |
| 26 | Water Stress Layer | Planned |
| 27 | Performance & Load Testing | Planned |

## Key Decisions

- GDELT stays on CSV export (no BigQuery) — tune existing pipeline instead
- Bellingcat RSS as sole OSINT gap-filter (no Telegram/GramJS)
- Ethnic layer: hatched overlay regions (Option C) — not solid fills
- Load target: 250 VUs (up from 100 in v1.2)
- Satellite imagery deferred to v1.4

## Pending Todos

None.

## Blockers/Concerns

- Ethnic distribution GeoJSON data needs manual curation from published maps
- WRI Aqueduct data format/licensing needs verification
- Redis command budget at ~92% — monitor with Bellingcat RSS adding another polling source
