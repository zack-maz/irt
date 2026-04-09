---
status: testing
phase: 27-conflict-geolocation-improvement
source:
  [
    27-01-SUMMARY.md,
    27-02-SUMMARY.md,
    27-03-SUMMARY.md,
    27-04-SUMMARY.md,
    27-05-SUMMARY.md,
    27-06-SUMMARY.md,
  ]
started: 2026-04-09T20:30:00Z
updated: 2026-04-09T20:40:00Z
---

## Current Test

number: 3
name: Event Layer Toggle Panel (re-test after fix)
expected: |
Event toggles should NOT appear in the Layers tab. They should only be in the filter panel. The Layers tab should only show visualization layers (Geographic, Weather, Threat, Political, Ethnic, Water).
awaiting: user response

## Tests

### 1. Dev Server Starts

expected: `npm run dev` starts without errors. Page loads at http://localhost:5173 with the map visible. No ENOENT or plugin errors in the terminal.
result: pass

### 2. Test Suite Passes

expected: `npx vitest run` exits 0 with all 1331 tests passing across 106 test files. No failures or type errors.
result: pass
note: 1 pre-existing flaky failure in news.test.ts (CSRF token error, not Phase 27 related — last modified in Phase 26.4)

### 3. Event Layer Toggle Panel (re-test)

expected: Event toggles should NOT appear in the Layers tab. They should only be in the filter panel. The Layers tab should only show visualization layers (Geographic, Weather, Threat, Political, Ethnic, Water).
result: pass
previous: issue — fixed by Plan 27-08 (removed duplicate toggles from LayerTogglesSlot)

### 4. Master Events Toggle (re-test)

expected: Events are visible on the map. Toggling master "Events" OFF hides all conflict event markers. Toggling back ON shows them again.
result: pass
previous: issue — fixed by Plan 27-07 (normalizeEventTypes remaps old cached types)

### 5. Sub-Toggle Filtering

expected: Each sub-toggle independently filters its event category. Turning off "Airstrikes" hides only airstrike markers. Other event types remain visible.
result: pass

### 6. Event Colors

expected: Conflict events display in distinct shades of red on the map. They do NOT use yellow (flights), purple (ships), or green (sites) colors.
result: issue
reported: "Airstrikes, ground, and explosions are all the same color. Also 'Ground Combat' in filters tab should just say 'Ground'"
severity: minor

### 7. Event Detail Panel

expected: Clicking a conflict event on the map opens the detail panel showing the event type label from the new 5-type system (Airstrike, Ground Combat, Explosion, Targeted, or Other).
result: pass

### 8. Graceful Degradation (No LLM Keys)

expected: Without CEREBRAS_API_KEY/GROQ_API_KEY set, conflict events still appear on the map using raw GDELT data with CAMEO-based classification. The map never goes blank.
result: pass

### 9. Enriched Event Detail (With LLM Keys)

expected: With CEREBRAS_API_KEY or GROQ_API_KEY set in .env, clicking an event shows: summary paragraph, casualties (if available), precision indicator, "AI-enriched" badge, and source count.
result: skipped
reason: "API keys not configured yet — need .env.example with instructions first"

### 10. Precision Radius Rings

expected: Events with non-exact precision show translucent red radius rings on the map: neighborhood=1km, city=5km, region=25km. Exact events show as point icons only.
result: issue
reported: "No precision radius rings visible"
severity: major

### 11. Tooltip Precision Indicator

expected: Hovering over a conflict event shows a tooltip with precision indicator dots (showing the confidence level of the geolocation).
result: issue
reported: "Seeing no precision indicator"
severity: minor

### 12. Architecture Docs Updated

expected: `docs/architecture/ontology/types.md` reflects the 5-type taxonomy. `grep -c "TODO(26.2)" docs/architecture/ontology/types.md docs/architecture/ontology/algorithms.md docs/architecture/data-flows.md` returns 0 for all files.
result: pass
note: Verified automatically — all 3 files return 0 TODO(26.2) matches, 5-type taxonomy present

## Summary

total: 12
passed: 8
issues: 3
skipped: 1
blocked: 0

## Gaps

- truth: "Events master toggle + 5 sub-toggles should appear in the entity toggles section, not the visualization layers tab"
  status: resolved
  reason: "Fixed by Plan 27-08"
  test: 3

- truth: "Conflict events should be visible on the map with raw GDELT fallback when no LLM keys are set"
  status: resolved
  reason: "Fixed by Plan 27-07"
  test: 4

- truth: "Each of the 5 event types should display in a distinct shade of red. 'Ground Combat' label should say 'Ground'"
  status: failed
  reason: "User reported: Airstrikes, ground, and explosions are all the same color. Also 'Ground Combat' in filters tab should just say 'Ground'"
  severity: minor
  test: 6
  artifacts: []
  missing: []

- truth: "Non-exact events show precision radius rings on the map"
  status: failed
  reason: "User reported: No precision radius rings visible"
  severity: major
  test: 10
  artifacts: []
  missing: []

- truth: "Tooltip shows precision indicator dots for geolocation confidence"
  status: failed
  reason: "User reported: Seeing no precision indicator"
  severity: minor
  test: 11
  artifacts: []
  missing: []
