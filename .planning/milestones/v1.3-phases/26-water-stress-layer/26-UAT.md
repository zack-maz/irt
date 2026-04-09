---
status: diagnosed
phase: 26-water-stress-layer
source: [26-01-SUMMARY.md, 26-02-SUMMARY.md, 26-03-SUMMARY.md, 26-04-SUMMARY.md, 26-05-SUMMARY.md]
started: 2026-04-03T15:30:00Z
updated: 2026-04-03T15:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test

expected: Kill any running dev server. Run `npm run dev`. Server boots without errors. Open the app. Map loads with existing features. No console errors related to water routes or missing modules.
result: pass

### 2. Water Layer Toggle Activates

expected: In the sidebar Layers section, the "Water" toggle should appear WITHOUT a "coming soon" label. Clicking it should activate the water layer (no error, toggle turns on).
result: pass

### 3. River Lines Visible

expected: With Water layer ON, 6 river lines appear on the map: Tigris, Euphrates, Nile, Jordan, Karun, and Litani. Rivers are colored by stress level (darker = more stressed, lighter blue = healthier).
result: issue
reported: "They're all the same color to me. Make them bolder so they're easier to see at wider zoom"
severity: minor

### 4. River Labels

expected: River names appear as italic serif text labels along each river. Labels should be visually distinct from ethnic overlay labels (which use sans-serif).
result: pass

### 5. Water Facility Markers

expected: With Water layer ON, water facility markers appear at dam, reservoir, treatment plant, canal, and desalination locations across the Middle East. Markers are tinted by stress level (black/dark = extreme stress, light blue = healthy).
result: issue
reported: "not even seeing any water facilities at all"
severity: major

### 6. Water Facility Tooltip

expected: Hovering over a water facility marker shows a tooltip with: facility name, facility type (e.g., "Dam"), stress level label, health percentage, and precipitation anomaly (if available).
result: skipped
reason: Blocked by test 5 (no facility markers visible)

### 7. Water Facility Detail Panel

expected: Clicking a water facility marker opens the detail panel on the right. WaterFacilityDetail shows: facility name, type, WRI Aqueduct indicators (baseline water stress, drought risk, groundwater decline, seasonal variability, interannual variability), composite health percentage, precipitation data (if available), attack status, coordinates with copy button, and "OpenStreetMap" source link.
result: skipped
reason: Blocked by test 5 (no facility markers visible)

### 8. Water Counter Rows

expected: With Water layer ON, a "Water" section appears in the Counters panel with rows for each facility type (Dams, Reservoirs, Plants, Canals, Desalination) and counts. Expanding a row shows individual facilities. Clicking a facility flies the map to it and opens the detail panel.
result: pass

### 9. Water Search Tags

expected: Open search (Cmd+K). Typing `type:dam` filters to dam facilities. Typing `stress:high` filters to high-stress facilities. Typing `name:` shows water facility name suggestions. Results appear in the search modal.
result: pass

### 10. Water Gradient Legend

expected: With Water layer ON, a "Water Health" gradient legend appears in the bottom-left legend area. Gradient goes from black ("Extreme Stress") to light blue ("Healthy").
result: pass

### 11. Desalination Removed from Sites

expected: In the sidebar, the Sites section should NOT have a "Desalination" sub-toggle. Only Nuclear, Naval, Oil, Airbase, and Port toggles remain under Sites.
result: pass

### 12. Water Layer Toggle Off

expected: Toggling the Water layer OFF removes all water elements: river lines, river labels, facility markers disappear. Water counter section disappears. Water legend disappears. Search no longer returns water results.
result: pass

### 13. Proximity Alerts for Water Facilities

expected: If an unidentified flight is near a water facility (within 50km), a proximity alert badge should appear on the map. Alerts are dismissible (click X or similar), and dismissed alerts have a 60-second cooldown before reappearing.
result: skipped
reason: User skipped

### 14. Existing Features Unaffected

expected: With Water layer ON or OFF, existing features work normally: flights update, ships show, conflict events render, sites display, threat clusters work, other visualization layers (geographic, weather, political, ethnic) toggle correctly, detail panels for non-water entities open fine.
result: pass

## Summary

total: 14
passed: 8
issues: 2
pending: 0
skipped: 4

## Gaps

- truth: "River lines appear colored by stress level (darker = more stressed, lighter blue = healthier)"
  status: failed
  reason: "User reported: They're all the same color to me. Make them bolder so they're easier to see at wider zoom"
  severity: minor
  test: 3
  root_cause: "rivers.json has no compositeHealth property on any feature. useWaterLayers.ts:72 falls back to 0.5 for all rivers via ?? operator, producing identical color. Additionally lineWidthMinPixels:1 and lineWidthMaxPixels:6 are too thin at wide zoom."
  artifacts:
  - path: "src/data/rivers.json"
    issue: "Missing compositeHealth property on all 6 river features"
  - path: "src/hooks/useWaterLayers.ts"
    issue: "Line 72: fallback ?? 0.5 masks data gap; lines 80-81: min/max pixel constraints too tight"
    missing:
  - "Add compositeHealth to each river feature in rivers.json based on watershed stress"
  - "Increase lineWidthMinPixels to 2-3 and lineWidthMaxPixels to 10-12"
    debug_session: ".planning/debug/river-color-visibility.md"

- truth: "Water facility markers appear at dam, reservoir, treatment plant, canal, and desalination locations across the Middle East"
  status: failed
  reason: "User reported: not even seeing any water facilities at all"
  severity: major
  test: 5
  root_cause: "Two compounding issues: (1) /api/water hangs indefinitely when Redis cache is empty — Overpass query for 23 countries times out, and there's no fallback response. curl to /api/water returns 0 bytes after 30s. (2) Even if data loads, stressToRGBA returns near-black [0,0,0,200] for facilities with high water stress (most ME facilities have bws_score 4-5, compositeHealth near 0), making icons invisible on the dark terrain map."
  artifacts:
  - path: "server/adapters/overpass-water.ts"
    issue: "Overpass query for 23 countries too broad, frequently times out"
  - path: "server/routes/water.ts"
    issue: "No timeout/fallback when Overpass hangs and cache is empty"
  - path: "src/hooks/useWaterLayers.ts"
    issue: "Line 117: getColor uses stressToRGBA which returns near-black for stressed facilities"
  - path: "src/lib/waterStress.ts"
    issue: "Color gradient starts at pure black [0,0,0] — invisible on dark map"
    missing:
  - "Fix API reliability: add route-level timeout, or seed Redis cache, or reduce Overpass query scope"
  - "Adjust color floor: minimum brightness so icons are always visible (e.g. dark red or dark blue instead of black)"
    debug_session: ""
