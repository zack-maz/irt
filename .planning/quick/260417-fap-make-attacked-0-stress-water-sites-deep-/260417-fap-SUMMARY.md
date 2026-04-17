---
id: 260417-fap
description: Make attacked (0-stress) water facilities deep dark purple on the map, in the legend, and on the Attacked toggle dot
status: complete
date: 2026-04-17
---

# Quick Task 260417-fap — Summary

## Changes

Swapped the destroyed/attacked water visual from pure black to deep dark purple `#2d0a4e` (RGB `45, 10, 78`) everywhere it surfaces:

- **`src/lib/waterStress.ts`** — `WATER_STRESS_LEGEND_STOPS[0].color` → `'#2d0a4e'`; updated the docstring to say "deep dark purple" instead of "black".
- **`src/components/map/MapLegend.tsx`** — Water Health legend "Extreme Stress" swatch → `'#2d0a4e'`.
- **`src/hooks/useWaterLayers.ts`** — destroyed facility IconLayer color tuple → `[45, 10, 78, 255]`.
- **`src/components/map/layers/constants.ts`** — `ENTITY_DOT_COLORS.waterAttacked` → `'#2d0a4e'` (this is what the Attacked toggle dot reads).
- **`src/__tests__/waterStress.test.ts`** — expected hex updated, test title `'includes Destroyed entry with black color'` → `'... deep dark purple color'`.

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run src/__tests__/waterStress.test.ts src/__tests__/MapLegend.test.tsx` — 76 tests pass.
- Diff: 5 files, color changes isolated; Sites `siteAttacked` (orange) untouched; light-blue healthy end of water gradient untouched.

## Notes

- `#2d0a4e` is darker than Tailwind `purple-950`, chosen so the destroyed state stays near-black in overall luminance but reads unambiguously as purple when placed next to the deep-navy `#0a143c` "Extreme" stop in the legend.
- Only the on-map IconLayer color for destroyed facilities changed. The outline color (`[0, 0, 0, 180]`) for all water facility icons is still black — intentionally kept so the destroyed purple fill remains legible against terrain.
