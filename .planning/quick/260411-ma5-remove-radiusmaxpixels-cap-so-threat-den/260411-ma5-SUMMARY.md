# Quick Task 260411-ma5: Remove radiusMaxPixels cap

## Problem

Threat density clusters were still shrinking below their event spread when zoomed in. The meter-based bbox diagonal radius (from 260411-m4j) correctly computed the geographic size, but `radiusMaxPixels: 200` hard-capped the visual size at 200 pixels. At high zoom levels, 200px represents less area than the cluster's actual geographic extent.

## Fix

Removed `radiusMaxPixels` entirely. The meter-based radius is already naturally bounded by the bbox diagonal — no pixel cap needed. `radiusMinPixels: 20` remains for zoomed-out visibility.

## Files changed

- `src/components/map/layers/ThreatHeatmapOverlay.tsx` — removed radiusMaxPixels
- `src/__tests__/ThreatHeatmapOverlay.test.tsx` — updated assertion

## Commit

86b648f
