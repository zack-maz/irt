# Deferred Items - Phase 26.1

## Pre-existing Test Failures (out of scope)

1. **entityLayers.test.ts** - 28 failing tests. Icon count assertion expects 13 but atlas now has 17 (4 water icons added in Plan 02). Layer count/order assertions also stale.
2. **ThreatHeatmapOverlay.test.tsx** - 1 failing test. `radiusMaxPixels` expectation mismatch (expects 200, actual differs).
3. **filterStore.test.ts** - 2 failing tests. `granularity` default changed from `'hour'` to `'day'`, `dateStart`/`dateEnd` defaults changed from null to ~24h window.

These failures existed before Plan 03 changes and are not caused by any Plan 03 work.
