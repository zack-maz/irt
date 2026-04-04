---
status: diagnosed
trigger: "river lines in water stress layer all appear same color and hard to see at wider zoom"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Focus

hypothesis: Two root causes confirmed - see Resolution
test: n/a
expecting: n/a
next_action: report diagnosis

## Symptoms

expected: Rivers display distinct colors based on watershed stress and are visible at wide zoom
actual: All rivers appear the same color; lines hard to see at wider zoom levels
errors: none
reproduction: Enable water layer, zoom out to see all rivers
started: since water layer implementation

## Eliminated

(none)

## Evidence

- timestamp: 2026-04-03T00:00:00Z
  checked: src/data/rivers.json
  found: NO compositeHealth property exists on any river feature. All 6 rivers only have `name` and `scalerank` properties.
  implication: The getLineColor callback falls through to the fallback value of 0.5 for every single river, producing identical colors.

- timestamp: 2026-04-03T00:00:00Z
  checked: src/hooks/useWaterLayers.ts lines 71-74
  found: getLineColor uses `f.properties?.compositeHealth ?? 0.5` -- the fallback 0.5 fires for all rivers since none have compositeHealth
  implication: All rivers render as stressToRGBA(0.5) = identical medium-blue color

- timestamp: 2026-04-03T00:00:00Z
  checked: src/hooks/useWaterLayers.ts lines 75-82
  found: lineWidthMinPixels=1, lineWidthMaxPixels=6; width formula is (6-scalerank)*500 meters
  implication: At wide zoom, lines clamp to 1px minimum which is nearly invisible

- timestamp: 2026-04-03T00:00:00Z
  checked: src/lib/waterStress.ts lines 30-46
  found: stressToRGBA(0.5) interpolates to approximately [45, 94, 138, 200] -- a medium dark blue
  implication: Color function works correctly but receives identical input for all rivers

- timestamp: 2026-04-03T00:00:00Z
  checked: src/data/rivers.json scalerank values
  found: Jordan=6, Nile=1, Tigris=4, Euphrates=3, Karun=5, Litani=7
  implication: Width formula does differentiate rivers (Nile=2500m, Euphrates=1500m, etc.) but lineWidthMaxPixels:6 caps visibility

## Resolution

root_cause: |
  TWO confirmed root causes:
  1. MISSING DATA: rivers.json has NO compositeHealth property on any feature. The getLineColor callback at useWaterLayers.ts:72 uses `f.properties?.compositeHealth ?? 0.5`, so the fallback 0.5 fires for ALL 6 rivers, producing identical colors.
  2. LOW VISIBILITY: lineWidthMinPixels is 1 and lineWidthMaxPixels is 6 (useWaterLayers.ts:80-81). At wider zoom levels, lines clamp to 1px which is nearly invisible against the dark basemap.
fix: (not applied - diagnosis only)
verification: (not applicable)
files_changed: []
