# Quick Task 260411-mn4: Show precipitation in weather tooltip always

## Problem

Weather tooltip precipitation section wasn't showing because it depended on finding a nearby water facility with `.precipitation` merged. This required: (1) water facilities loaded, (2) precip polling completed, (3) coordinate matching succeeded. Too fragile, and only worked when water layer was active.

## Fix

- Added `rawPrecipData: PrecipitationData[]` to waterStore, populated on every `updatePrecipitation()` call
- WeatherTooltip now looks up precipitation directly from `rawPrecipData` by nearest coordinates (0.5° threshold)
- No dependency on water layer toggle or facility-precipitation merging

## Files changed

- `src/stores/waterStore.ts` — added `rawPrecipData` field, stored in `updatePrecipitation`
- `src/components/map/layers/WeatherOverlay.tsx` — replaced facility lookup with raw precip lookup

## Commit

490561f
