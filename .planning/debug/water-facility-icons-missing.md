---
status: investigating
trigger: "water facility markers not showing on map - rivers show fine but facility icons don't appear"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Focus

hypothesis: Multiple issues identified -- primary suspect is extremely dark icon colors (stressToRGBA producing near-black for most Middle East facilities) combined with dark basemap, but this alone wouldn't make ALL icons invisible
test: Static code analysis complete across all 4 files in rendering pipeline
expecting: N/A -- analysis complete
next_action: Report findings

## Symptoms

expected: Water facility markers (icons) should render on the map alongside rivers
actual: Rivers render correctly but facility icons do not appear at all
errors: None reported (no console errors mentioned)
reproduction: Enable water layer, observe map - rivers visible, facilities invisible
started: Since water layer implementation

## Eliminated

## Evidence

## Resolution

root_cause:
fix:
verification:
files_changed: []
