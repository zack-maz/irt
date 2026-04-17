---
id: 260417-dtt
description: Move water "Attacked" toggle below "Healthy" and change its dot color from orange to black
status: complete
date: 2026-04-17
---

# Quick Task 260417-dtt — Summary

## Changes

- **`src/components/map/layers/constants.ts`** — added `waterAttacked: '#000000'` to `ENTITY_DOT_COLORS`. Kept `siteAttacked` (orange) untouched so the Sites section retains its existing color.
- **`src/components/layout/FilterPanelSlot.tsx`** — in the water section toggle block:
  - Reordered so Healthy renders above Attacked (top-down).
  - Water Attacked toggle now uses `ENTITY_DOT_COLORS.waterAttacked` (black).
  - Updated block comment to `{/* Healthy / Attacked toggles */}`.

## Verification

- `npx tsc --noEmit` — clean (no new errors).
- Sites toggles (`FilterPanelSlot.tsx` ~L511-524) unchanged: Healthy first, Attacked second, attacked dot still `siteAttacked` (orange).
- On-map site/water rendering colors in `useEntityLayers`/`useWaterLayers` unchanged (they consume `ENTITY_COLORS.siteAttacked`, which was not modified).
- Diff: 2 files, +8 / -7 lines.

## Notes

- Only the toggle dot color changed. Attacked water facilities on the map still render with the shared `ENTITY_COLORS.siteAttacked` (orange). If the user wants map markers to also be black, that's a separate follow-up touching `useWaterLayers` + `ENTITY_COLORS`.
