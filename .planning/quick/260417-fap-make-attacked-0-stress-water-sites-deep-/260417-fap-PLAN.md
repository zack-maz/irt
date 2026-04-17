---
id: 260417-fap
description: Make attacked (0-stress) water facilities deep dark purple on the map, in the legend, and on the Attacked toggle dot
status: planned
date: 2026-04-17
---

# Quick Task 260417-fap

## Scope

"Attacked" water facilities sit at score 0 on the water-stress scale and are currently rendered black in three places (map fill, legend swatch, and the Attacked toggle dot we set in quick task 260417-dtt). Swap all three to a deep dark purple so the destroyed state is clearly distinct from the navy end of the regular stress gradient.

Color: `#2d0a4e` (RGB `45, 10, 78`) — deeper/darker than Tailwind `purple-950`, clearly purple, still near-black in perceived luminance so it reads as "worse than extreme stress".

## Tasks

### Task 1 — Swap destroyed/attacked color to deep dark purple

Coordinated single-task edit across four source files. All four must move in lockstep so map / legend / toggle stay visually consistent.

**Files + changes:**

1. `src/lib/waterStress.ts`
   - Line 108: `WATER_STRESS_LEGEND_STOPS[0].color` from `'#000000'` to `'#2d0a4e'`.
   - Line 4 docstring: update `"0 = destroyed (black, applied externally)"` → `"0 = destroyed (deep dark purple, applied externally)"`.

2. `src/components/map/MapLegend.tsx`
   - Line 64: Water Health legend first stop from `{ color: '#000000', label: 'Extreme Stress' }` to `{ color: '#2d0a4e', label: 'Extreme Stress' }`.

3. `src/hooks/useWaterLayers.ts`
   - Line 258: destroyed facility color tuple from `[0, 0, 0, 255]` to `[45, 10, 78, 255]`.

4. `src/components/map/layers/constants.ts`
   - Line 30: `ENTITY_DOT_COLORS.waterAttacked` from `'#000000'` to `'#2d0a4e'`.

5. `src/__tests__/waterStress.test.ts`
   - Lines 180 and 185: expected color `'#000000'` → `'#2d0a4e'`.
   - Line 177 test title `'includes Destroyed entry with black color'` → `'includes Destroyed entry with deep dark purple color'`.

**Verify:**

- `npx tsc --noEmit` clean.
- `npx vitest run src/__tests__/waterStress.test.ts src/__tests__/MapLegend.test.tsx` passes.
- `git grep "#000000" src/lib/waterStress.ts src/components/map/MapLegend.tsx src/components/map/layers/constants.ts` has no residual black for these four references.

**Done:** Map, legend, and Attacked toggle all render the same deep dark purple for destroyed/attacked water facilities.

## must_haves

- `#2d0a4e` (or tuple `[45, 10, 78, 255]`) present in all four production files.
- `waterStress.test.ts` expectations updated to the new hex so the suite doesn't regress.
- No change to sites `siteAttacked` orange — scope is water only.
- No change to the light-blue "Healthy" end of the water gradient.
