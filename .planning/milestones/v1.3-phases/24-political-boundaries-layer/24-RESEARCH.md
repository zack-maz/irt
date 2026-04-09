# Phase 24: Political Boundaries Layer - Research

**Researched:** 2026-04-02
**Domain:** MapLibre GL JS fill layers, Natural Earth GeoJSON, static data bundling
**Confidence:** HIGH

## Summary

Phase 24 adds a toggleable political overlay to the map showing country polygons color-coded by faction alignment (US-aligned, Iran-aligned, neutral) plus disputed territory hatching. The existing visualization layer infrastructure (layerStore, LayerTogglesSlot, MapLegend, GeographicOverlay pattern) provides a clear template -- this phase follows the same Source/Layer declarative pattern used by GeographicOverlay.

The core technical challenge is data preparation: Natural Earth 110m countries GeoJSON is ~2.5-3 MB raw (all 177 countries). The CONTEXT.md specifies static TypeScript import filtered to Middle East countries only, which should compress to ~50KB after coordinate rounding and property stripping. Disputed territory hatching requires MapLibre's `fill-pattern` paint property with a canvas-generated diagonal line image registered via `map.addImage()` -- this requires imperative setup through the `useMap` hook before the fill-pattern layer renders.

**Primary recommendation:** Follow the GeographicOverlay component pattern exactly. Prepare GeoJSON at dev time (extract Middle East countries from Natural Earth 110m, strip unnecessary properties, round coordinates). Register the political legend as discrete mode in LEGEND_REGISTRY. Generate hatching pattern via canvas at runtime and register with `map.addImage()` in a useEffect before rendering the disputed territory Layer.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- 3-tier faction model: US-aligned (steel blue #3b82f6), Iran-aligned (muted red #dc2626), Neutral (slate #64748b)
- US-aligned: Israel, Saudi Arabia, UAE, Bahrain, Jordan, Kuwait, Egypt
- Iran-aligned: Iran, Syria, Yemen
- Neutral: Turkey, Qatar, Oman, Pakistan, Afghanistan, Iraq, Lebanon, Turkmenistan, Azerbaijan, Armenia, Georgia + all others in region
- Faction data in separate TypeScript `Record<string, Faction>` keyed by ISO A3 code -- not baked into GeoJSON
- Natural Earth 110m country polygons, static bundle via Vite JSON import
- Middle East countries only (within IRAN_BBOX region)
- Join key: ISO A3 codes from Natural Earth `ISO_A3` property
- Fill opacity ~15%, borders faction-colored at 1px ~60% opacity
- Non-interactive country polygons (no hover, click, or tooltips)
- 3 disputed zones with diagonal hatching in yellow/amber: West Bank, Golan Heights, Gaza
- Disputed zones from Natural Earth `ne_10m_admin_0_disputed_areas` (10m scale, not 110m)
- Disputed zone hover shows label (zone name) -- only interactive element
- Discrete swatch legend in bottom-left, visible only when political layer active
- Layer stacking: below all other visualization layers and entity markers
- Instant toggle (no fade transition)
- Remove `comingSoon: true` from Political toggle row

### Claude's Discretion

- Exact hatching pattern parameters (line spacing, angle, stroke width)
- Coordinate rounding/simplification strategy for Natural Earth polygons
- Legend component layout and typography
- How to render disputed territory hover label (tooltip vs inline label)

### Deferred Ideas (OUT OF SCOPE)

- Southern Lebanon / UNIFIL zone -- needs better boundary data source
- Kurdish regions as disputed territory -- deferred to Phase 25 (Ethnic Distribution Layer)
  </user_constraints>

## Standard Stack

### Core

| Library                | Version | Purpose                             | Why Standard                                   |
| ---------------------- | ------- | ----------------------------------- | ---------------------------------------------- |
| maplibre-gl            | ^5.20.1 | Map rendering with fill/line layers | Already installed, native fill-pattern support |
| @vis.gl/react-maplibre | ^8.1.0  | React Source/Layer components       | Already installed, declarative layer rendering |

### Supporting

| Library            | Version | Purpose                     | When to Use                                       |
| ------------------ | ------- | --------------------------- | ------------------------------------------------- |
| Natural Earth 110m | v5.1.1  | Country polygon boundaries  | Dev-time data extraction, not runtime dependency  |
| Natural Earth 10m  | v5.1.1  | Disputed territory polygons | Dev-time data extraction for Gaza/West Bank/Golan |

### No New Dependencies

This phase requires zero new npm packages. All rendering is via existing MapLibre fill/line layers. GeoJSON data is extracted at dev time and committed as static assets.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── data/
│   ├── countries.json          # ~50KB, Middle East countries from NE 110m
│   └── disputed.json           # ~5KB, 3 disputed territory polygons from NE 10m
├── components/
│   └── map/
│       └── layers/
│           └── PoliticalOverlay.tsx   # New overlay component
└── lib/
    └── factions.ts             # Faction assignments Record<string, Faction>
```

### Pattern 1: Visualization Layer Component (from GeographicOverlay)

**What:** Component renders null when layer inactive, returns Source + Layer JSX when active.
**When to use:** Every visualization layer follows this pattern.
**Example:**

```typescript
// Source: existing GeographicOverlay.tsx pattern
export function PoliticalOverlay() {
  const isActive = useLayerStore((s) => s.activeLayers.has('political'));
  if (!isActive) return null;

  return (
    <>
      <Source id="countries-source" type="geojson" data={countriesData} />
      <Layer
        id="country-fills"
        type="fill"
        source="countries-source"
        beforeId="boundary_country_inner"
        paint={{
          'fill-color': ['match', ['get', 'faction'],
            'us', '#3b82f6',
            'iran', '#dc2626',
            '#64748b' // neutral fallback
          ],
          'fill-opacity': 0.15,
        }}
      />
      {/* Border lines, disputed fills, etc. */}
    </>
  );
}
```

### Pattern 2: Imperative Image Registration for fill-pattern

**What:** Canvas-generated hatching pattern registered via `map.addImage()` before the fill-pattern layer renders.
**When to use:** Disputed territory diagonal line hatching.
**Example:**

```typescript
// Generate diagonal hatching pattern on canvas
function createHatchingPattern(): ImageData {
  const size = 16; // power of 2 for WebGL
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  // Diagonal lines in amber
  ctx.strokeStyle = '#f59e0b'; // amber-500
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.stroke();
  // Wrap-around line for seamless tiling
  ctx.beginPath();
  ctx.moveTo(-size, size);
  ctx.lineTo(size, -size);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 2 * size);
  ctx.lineTo(2 * size, 0);
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}
```

### Pattern 3: Faction Data Separate from GeoJSON

**What:** Faction assignments stored in a TypeScript constant, joined at render time via MapLibre expressions.
**When to use:** Keeps GeoJSON data-agnostic and faction assignments easy to update.
**Example:**

```typescript
// src/lib/factions.ts
export type Faction = 'us' | 'iran' | 'neutral';

export const FACTION_ASSIGNMENTS: Record<string, Faction> = {
  ISR: 'us',
  SAU: 'us',
  ARE: 'us',
  BHR: 'us',
  JOR: 'us',
  KWT: 'us',
  EGY: 'us',
  IRN: 'iran',
  SYR: 'iran',
  YEM: 'iran',
  // All others default to neutral
};

export const FACTION_COLORS: Record<Faction, string> = {
  us: '#3b82f6',
  iran: '#dc2626',
  neutral: '#64748b',
};
```

### Pattern 4: Data Preparation at Dev Time

**What:** Extract and simplify Natural Earth data via a build script, commit the result as a static asset.
**When to use:** One-time extraction, not a runtime operation.
**Approach:**

1. Download `ne_110m_admin_0_countries.geojson` from Natural Earth GitHub
2. Filter to countries within IRAN_BBOX (lat 0-50, lng 20-80) plus any partially-overlapping countries
3. Strip all properties except `ISO_A3` and `NAME`
4. Round coordinates to 2 decimal places (~1.1km precision, sufficient for 110m scale)
5. Commit resulting `src/data/countries.json` (~50KB)
6. Similarly extract 3 disputed zones from `ne_10m_admin_0_breakaway_disputed_areas` 10m data
7. Filter by NAME property for "Gaza", "West Bank", "Golan Heights"
8. Strip properties, round coords, commit as `src/data/disputed.json` (~5KB)

### Anti-Patterns to Avoid

- **Runtime fetch of GeoJSON:** The data is static and small -- bundle it. No /api/political endpoint needed.
- **Baking faction colors into GeoJSON properties:** Keeps data and presentation coupled. Use MapLibre `match` expression against ISO_A3 instead.
- **Using 10m countries for country fills:** 10m is ~70MB raw. 110m is sufficient for country-level fills at the zoom levels this map operates at (3-15).
- **Re-rendering on each zoom change:** The political layer is entirely MapLibre-native (Source + Layer). No deck.gl involvement means no React re-renders on map interaction.
- **Using deck.gl for this layer:** MapLibre native fill/line layers are the right tool. Deck.gl adds complexity for what is purely a background tint.

## Don't Hand-Roll

| Problem                     | Don't Build                | Use Instead                              | Why                                                   |
| --------------------------- | -------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| Country polygon data        | Custom GeoJSON files       | Natural Earth 110m                       | Public domain, maintained, standard join keys         |
| Disputed territory polygons | Manual polygon coordinates | Natural Earth 10m disputed areas         | Authoritative boundaries, version-pinned              |
| Layer z-ordering            | Custom z-index management  | MapLibre `beforeId` prop                 | Built-in, declarative, stable                         |
| Hatching pattern image      | PNG file asset             | Canvas-generated ImageData               | Configurable at runtime, no external asset dependency |
| Legend rendering            | New legend component       | Existing `LEGEND_REGISTRY` + `MapLegend` | Already supports `discrete` mode with color swatches  |

**Key insight:** The existing visualization layer infrastructure (layerStore, LEGEND_REGISTRY, overlay component pattern) handles 80% of the integration work. The novel part is only the data preparation and the fill-pattern hatching.

## Common Pitfalls

### Pitfall 1: Natural Earth ISO_A3 Values of "-99"

**What goes wrong:** Some countries have `ISO_A3: "-99"` in Natural Earth data instead of valid ISO codes (notably France, Norway, Kosovo, Palestine).
**Why it happens:** Natural Earth's geographic definitions don't always align with ISO standards.
**How to avoid:** During data extraction, verify all Middle East countries have valid ISO_A3. Palestine may use "PSE" or "-99" (Natural Earth uses "PSX" in some versions). Use `ADM0_A3` as fallback if ISO_A3 is "-99".
**Warning signs:** Country appears on map but isn't colored by faction (match expression fails on "-99").

### Pitfall 2: fill-pattern Image Must Be Registered Before Layer Renders

**What goes wrong:** Disputed territory hatching appears as solid color or invisible because `fill-pattern` references an image ID that hasn't been added to the map yet.
**Why it happens:** MapLibre silently ignores fill-pattern references to non-existent image IDs. In React, the Layer component mounts before the useEffect that calls addImage runs.
**How to avoid:** Use a state flag (e.g., `isPatternReady`) that gates rendering of the disputed territory Layer. Only set it to true after `map.addImage()` succeeds in a useEffect.
**Warning signs:** Disputed zones render as invisible or fallback color on first load but appear after HMR refresh.

### Pitfall 3: Layer Ordering -- Political Fill Appears Above Entity Markers

**What goes wrong:** Country fills render on top of flights, ships, or event markers, obscuring the primary data.
**Why it happens:** MapLibre layers stack in order of insertion. Without `beforeId`, new layers go on top.
**How to avoid:** Use `beforeId` prop on all political overlay layers, pointing to a layer that is known to exist below entity markers. The CARTO Dark Matter style has `boundary_country_inner` -- insert political fills before that layer, or insert before the hillshade layer to ensure they sit at the very bottom.
**Warning signs:** Entity markers disappear when political layer is toggled on.

### Pitfall 4: Disputed Area NAME Mismatch

**What goes wrong:** Filtering Natural Earth 10m disputed areas by NAME doesn't match expected strings.
**Why it happens:** Natural Earth uses specific naming conventions that may differ from colloquial names (e.g., "Israeli occupied" vs "Golan Heights", or "Gaza Strip" vs "Gaza").
**How to avoid:** During data extraction, dump all NAME values from the disputed areas dataset and verify the exact strings. Filter on partial match or ADM0_A3 code as fallback.
**Warning signs:** Zero features extracted for a disputed zone.

### Pitfall 5: GeoJSON Coordinate Winding Order

**What goes wrong:** Some polygons render as "inverted" (fill covers the whole world except the country) or don't render at all.
**Why it happens:** GeoJSON spec requires counter-clockwise exterior rings, but some Natural Earth features may have clockwise winding.
**How to avoid:** Natural Earth GeoJSON from the official repo generally follows correct winding. If issues arise during data extraction, use `@turf/rewind` or manual verification.
**Warning signs:** A country fill covers the ocean instead of the land area.

### Pitfall 6: Existing Test Assertions Will Break

**What goes wrong:** Test suite fails after removing `comingSoon` from political layer.
**Why it happens:** `LayerToggles.test.tsx` asserts "3 active toggle rows and 4 coming-soon rows" (line 25), and asserts political is not clickable (line 72-78). `MapLegend.test.tsx` asserts political layer renders nothing (line 37-41).
**How to avoid:** Update these tests as part of the implementation. Political becomes the 4th active toggle (4 active, 3 coming-soon). MapLegend test should verify the political discrete legend renders.
**Warning signs:** CI fails on existing tests after toggle change.

## Code Examples

### Verified: GeographicOverlay Pattern (from existing codebase)

```typescript
// Source: src/components/map/layers/GeographicOverlay.tsx
export function GeographicOverlay() {
  const isActive = useLayerStore((s) => s.activeLayers.has('geographic'));
  if (!isActive) return null;
  return (
    <>
      <Source id="geo-labels" type="geojson" data={GEO_FEATURES} />
      <Layer id="geo-feature-labels" type="symbol" source="geo-labels" ... />
    </>
  );
}
```

### Verified: Legend Registry with Discrete Mode (from existing codebase)

```typescript
// Source: src/components/map/MapLegend.tsx
// The discrete mode already exists and renders individual swatches:
if (config.mode === 'discrete') {
  return (
    <div className="...">
      <div className="...">{config.title}</div>
      <div className="flex flex-col gap-0.5">
        {config.colorStops.map((stop) => (
          <div key={stop.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: stop.color }} />
            <span className="...">{stop.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Verified: LayerTogglesSlot comingSoon Pattern (from existing codebase)

```typescript
// Source: src/components/layout/LayerTogglesSlot.tsx line 9
{ id: 'political', label: 'Political', color: '#a78bfa', comingSoon: true },
// Simply remove `comingSoon: true` to activate the toggle
```

### Verified: beforeId for Layer Ordering

```typescript
// Source: @vis.gl/react-maplibre Layer API
// beforeId: "The ID of an existing layer to insert this layer before"
<Layer
  id="country-fills"
  type="fill"
  source="countries-source"
  beforeId="terrain-hillshade"  // Insert below hillshade = background position
  paint={{ 'fill-color': '...', 'fill-opacity': 0.15 }}
/>
```

### Recommended: Canvas Hatching Pattern Generation

```typescript
// Pattern: generate a tileable diagonal line image for fill-pattern
function createHatchingImage(color = '#f59e0b', lineWidth = 2, spacing = 8): ImageData {
  const size = 16; // Must be power of 2
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  // Draw diagonal lines with wrap-around for seamless tiling
  for (let offset = -size; offset < size * 2; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(offset, size);
    ctx.lineTo(offset + size, 0);
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, size, size);
}
```

### Recommended: useMap + addImage for Pattern Registration

```typescript
// Pattern: register canvas image before rendering fill-pattern layers
function useHatchingPattern(patternId: string) {
  const { current: mapRef } = useMap();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    if (map.hasImage(patternId)) {
      setReady(true);
      return;
    }
    const imageData = createHatchingImage();
    map.addImage(patternId, imageData, { sdf: false });
    setReady(true);
  }, [mapRef, patternId]);

  return ready;
}
```

## State of the Art

| Old Approach                      | Current Approach                   | When Changed                   | Impact                                                 |
| --------------------------------- | ---------------------------------- | ------------------------------ | ------------------------------------------------------ |
| deck.gl GeoJsonLayer for polygons | MapLibre native fill/line layers   | Always (for background layers) | Better performance, proper z-ordering, terrain draping |
| External GeoJSON fetch at runtime | Static JSON import via Vite        | Project convention             | Zero network requests, instant render                  |
| PNG sprite for patterns           | Canvas-generated ImageData         | MapLibre v3+                   | No external assets, configurable parameters            |
| Manual layer ordering             | `beforeId` prop on Layer component | react-maplibre v8+             | Declarative, reliable z-ordering                       |

**Note on MapLibre version:** The project uses maplibre-gl ^5.20.1 which fully supports `fill-pattern`, `addImage` with ImageData, and all fill/line paint properties used in this phase.

## Open Questions

1. **Exact NAME values in Natural Earth 10m disputed areas**
   - What we know: The dataset contains ~100 disputed/breakaway territories globally. Gaza, West Bank, and Golan Heights should be present.
   - What's unclear: Exact NAME property strings (could be "Gaza Strip" vs "Gaza", "Golan Heights" vs "Israeli occupied Golan Heights", etc.)
   - Recommendation: During data extraction, log all NAME values and match by substring. This is a dev-time one-shot operation.

2. **Palestine ISO_A3 code in Natural Earth 110m**
   - What we know: Natural Earth uses non-standard codes for some territories. Palestine may be "PSE", "PSX", or "-99".
   - What's unclear: Which code appears in the current v5.1.1 release.
   - Recommendation: Check during extraction. Palestine is "neutral" faction, so even if the code is unusual, it just needs to be included in the faction lookup or handled by the fallback.

3. **Layer ordering with beforeId**
   - What we know: CARTO Dark Matter style has `boundary_country_inner` and `terrain-hillshade` layers.
   - What's unclear: Whether `terrain-hillshade` is the absolute lowest painted layer, or if there's a better anchor point.
   - Recommendation: Use `terrain-hillshade` as the beforeId anchor. If fills need to be slightly higher, use `boundary_country_inner`. Test visually during development.

## Validation Architecture

### Test Framework

| Property           | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| Framework          | Vitest 4.1.0 + jsdom                                     |
| Config file        | `vite.config.ts` (test section)                          |
| Quick run command  | `npx vitest run src/__tests__/PoliticalOverlay.test.tsx` |
| Full suite command | `npx vitest run`                                         |

### Phase Requirements -> Test Map

| Req ID   | Behavior                                                           | Test Type | Automated Command                                           | File Exists?             |
| -------- | ------------------------------------------------------------------ | --------- | ----------------------------------------------------------- | ------------------------ |
| (no IDs) | Political overlay renders null when inactive                       | unit      | `npx vitest run src/__tests__/PoliticalOverlay.test.tsx -x` | Wave 0                   |
| (no IDs) | Political overlay renders Source+Layer when active                 | unit      | `npx vitest run src/__tests__/PoliticalOverlay.test.tsx -x` | Wave 0                   |
| (no IDs) | Faction assignments cover all specified countries                  | unit      | `npx vitest run src/__tests__/factions.test.ts -x`          | Wave 0                   |
| (no IDs) | countries.json has valid GeoJSON with ISO_A3 properties            | unit      | `npx vitest run src/__tests__/PoliticalOverlay.test.tsx -x` | Wave 0                   |
| (no IDs) | disputed.json has 3 features (Gaza, West Bank, Golan)              | unit      | `npx vitest run src/__tests__/PoliticalOverlay.test.tsx -x` | Wave 0                   |
| (no IDs) | Political legend registered as discrete mode in LEGEND_REGISTRY    | unit      | `npx vitest run src/__tests__/MapLegend.test.tsx -x`        | Existing (update needed) |
| (no IDs) | LayerTogglesSlot shows political as active toggle (not comingSoon) | unit      | `npx vitest run src/__tests__/LayerToggles.test.tsx -x`     | Existing (update needed) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/PoliticalOverlay.test.tsx src/__tests__/factions.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/PoliticalOverlay.test.tsx` -- covers overlay render, data integrity
- [ ] `src/__tests__/factions.test.ts` -- covers faction assignment completeness
- [ ] Update `src/__tests__/LayerToggles.test.tsx` -- change assertion from 3/4 to 4/3 toggle split
- [ ] Update `src/__tests__/MapLegend.test.tsx` -- change political legend assertion from null to discrete swatch

## Sources

### Primary (HIGH confidence)

- Existing codebase: `src/components/map/layers/GeographicOverlay.tsx` -- established overlay pattern
- Existing codebase: `src/components/map/MapLegend.tsx` -- discrete legend mode already implemented
- Existing codebase: `src/stores/layerStore.ts` -- `political` already registered as VisualizationLayerId
- Existing codebase: `src/components/layout/LayerTogglesSlot.tsx` -- `comingSoon: true` flag to remove
- [MapLibre fill-pattern example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-pattern-to-a-polygon/) -- pattern image registration
- [@vis.gl/react-maplibre Layer API](https://visgl.github.io/react-maplibre/docs/api-reference/layer) -- beforeId prop for layer ordering

### Secondary (MEDIUM confidence)

- [Natural Earth 110m Countries](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/) -- country polygon source
- [Natural Earth 10m Disputed Areas](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-breakaway-disputed-areas/) -- disputed territory polygons
- [Natural Earth ISO_A3 issue #112](https://github.com/nvkelso/natural-earth-vector/issues/112) -- "-99" code pitfall for Palestine, France, etc.
- [react-map-gl fill-pattern discussion](https://github.com/visgl/react-map-gl/discussions/2567) -- imperative addImage approach

### Tertiary (LOW confidence)

- Disputed area NAME property values for Gaza/West Bank/Golan -- needs verification during data extraction

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- no new dependencies, all MapLibre native
- Architecture: HIGH -- follows existing GeographicOverlay pattern exactly
- Data preparation: MEDIUM -- Natural Earth property names and disputed area NAMEs need verification during extraction
- Pitfalls: HIGH -- well-documented MapLibre patterns with known gotchas (fill-pattern timing, beforeId ordering)

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable domain, Natural Earth is versioned and static)
