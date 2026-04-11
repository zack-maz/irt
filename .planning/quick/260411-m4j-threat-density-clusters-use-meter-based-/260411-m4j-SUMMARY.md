# Quick Task 260411-m4j: Threat density bbox-based radius

## Problem

Pure pixel-based radius (from 260411-m00) kept cluster visual size constant across zoom levels, but this meant zooming in would shrink the geographic footprint of a cluster below the area its events actually occupy. A cluster spanning 200km of events would render as a tiny dot when zoomed in.

## Solution

Switched to meter-based radius derived from each cluster's bounding box diagonal:

```
radius = max(30km, bboxDiag/2 + sqrt(eventCount) * 5km)
```

- **bbox diagonal** — ensures the cluster circle always covers its constituent events
- **30km floor** — single-cell clusters (0.25° grid) still have reasonable visual presence
- **density boost** — `sqrt(eventCount) * 5km` makes denser clusters slightly larger
- **radiusMinPixels: 20** — clusters stay visible when zoomed far out
- **radiusMaxPixels: 200** — prevents single clusters from filling the entire viewport

## Encoding summary

| Dimension | Encodes                           | Method                                |
| --------- | --------------------------------- | ------------------------------------- |
| Radius    | Geographic spread + event density | bbox diagonal + sqrt(n) boost, meters |
| Color     | Threat weight                     | P90-normalized thermal palette        |

## Files changed

- `src/components/map/layers/ThreatHeatmapOverlay.tsx` — getRadius function
- `src/__tests__/ThreatHeatmapOverlay.test.tsx` — updated assertions

## Commit

475f900
