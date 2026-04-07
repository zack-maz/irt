# Phase 25: Ethnic Distribution Layer - Research

**Researched:** 2026-04-02
**Domain:** GeoJSON ethnic polygons, deck.gl FillStyleExtension hatching, canvas texture atlas
**Confidence:** MEDIUM

## Summary

Phase 25 adds a toggleable ethnic distribution overlay showing 10 major ethnic zones as labeled hatched regions on the map. The core technical challenge is threefold: (1) sourcing accurate ethnic boundary GeoJSON data, (2) rendering hatched polygon fills via deck.gl's FillStyleExtension with per-group coloring, and (3) handling overlap zones where multiple ethnic groups coexist (e.g., Kirkuk showing Kurdish + Turkmen + Arab interleaved stripes).

The GeoEPR 2021 dataset from ETH Zurich is the best available source for ethnic boundary polygons. It provides GeoJSON directly, covers "politically relevant" ethnic groups worldwide with WGS84 polygons, and includes the major groups needed: Kurds, Arabs/Persians, Baloch, Turkmen, Azeris (for Iran), Alawites, Druze (for Syria/Lebanon). However, GeoEPR only codes "politically relevant" groups, so smaller minorities like Yazidi and Assyrian may lack polygons -- the CONTEXT.md decision to "only include groups covered by the dataset" handles this gracefully. A data extraction script (following the existing `extract-geo-data.ts` pattern) will download GeoEPR, filter to the Middle East bbox, merge cross-border groups (e.g., unified Kurdish zone), and output a simplified `ethnic-zones.json`.

The deck.gl FillStyleExtension with `fillPatternMask: true` is the correct approach for colored hatching. A single grayscale hatch pattern atlas (canvas-generated) is tinted per-group via `getFillColor`. The `@deck.gl/extensions` package (v9.2.x) must be added. For overlap zones, multiple stacked GeoJsonLayers (one per group present in the overlap) with offset hatch patterns create the interleaved stripe effect. Labels use deck.gl TextLayer at polygon centroids with zoom-dependent sizing.

**Primary recommendation:** Download GeoEPR 2021 GeoJSON, extract/simplify Middle East ethnic polygons via a script, render with FillStyleExtension hatched fills colored per-group, handle overlaps via stacked layers with offset patterns.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- 10 ethnic zones (dropped Shia/Sunni corridors from roadmap, added Arabs, Persians, Yazidi, Assyrian, Pashtun):
  1. Kurdish -- unified cross-border zone (SE Turkey, N Iraq, NE Syria, W Iran)
  2. Arab -- one continuous polygon across Arab-majority regions
  3. Persian -- central/eastern Iran
  4. Baloch -- SE Iran, SW Pakistan
  5. Turkmen -- NE Iran, Turkmenistan, pockets in N Iraq/Syria
  6. Druze -- S Lebanon, SW Syria, N Israel
  7. Alawite -- NW Syria coast
  8. Yazidi -- Sinjar area (N Iraq), core homeland only
  9. Assyrian -- Nineveh Plains (N Iraq) + Khabur triangle (NE Syria), core homeland only
  10. Pashtun -- E/S Afghanistan, NW Pakistan
- All zones treated equally (same rendering approach for major and minor groups)
- Kurdish zone is one unified polygon spanning 4 countries (not split per country)
- Small groups (Yazidi, Assyrian) show core homelands only, no diaspora pockets
- Arab zone is one continuous polygon, not sub-divided by country/culture
- Diagonal line hatching -- distinct from political layer's solid fills
- deck.gl + canvas texture approach (canvas-generated hatch patterns applied via deck.gl pipeline for terrain compatibility)
- Mixed hatching pattern in overlap zones -- interleaved colored stripes from each group present (not blended)
- Opacity: moderate ~25-30% for hatching lines (more prominent than political's 15%, since hatching is inherently lighter)
- Zone labels: always visible when layer is active, rendered at polygon centroids, zoom-responsive
- Hover shows tooltip with group name, approximate population, and brief context
- Entity tooltips take priority over ethnic tooltips (ethnic tooltip only on empty map areas within a zone)
- Overlap zone tooltips list all groups present (e.g., "Kurdish . Turkmen . Arab")
- Not clickable -- no detail panel integration
- Ethnic layer stacks on top of political layer when both active
- Research published ethnic distribution datasets first (GREG, EPR-GeoEthnic, Weidmann, etc.)
- Detailed boundaries preferred (district/governorate-level ethnic composition data if available)
- Only include groups covered by the dataset -- do NOT hand-draw missing groups
- Single GeoJSON file with `group` property per feature (same pattern as countries.json)
- Static bundle via Vite import

### Claude's Discretion

- 10-color palette selection (must work on dark base map and be distinguishable from political faction colors)
- Hatch pattern parameters (line spacing, angle, stroke width per group)
- Canvas texture generation approach
- Zoom thresholds for label visibility
- Tooltip content details (population figures, context text)
- How to implement mixed hatching in overlap zones via canvas textures

### Deferred Ideas (OUT OF SCOPE)

- Threat cluster hover/unhover bug -- after unhovering a threat cluster, highlight persists and other entities stay grayed out. Not Phase 25 scope.
- Southern Lebanon disputed zone -- deferred from Phase 24, still needs better boundary data
- Hand-drawn polygons for groups not in dataset -- if published data misses Yazidi/Assyrian, defer to a future patch rather than hand-draw
  </user_constraints>

## Standard Stack

### Core

| Library             | Version             | Purpose                                 | Why Standard                                                               |
| ------------------- | ------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| @deck.gl/extensions | ^9.2.11             | FillStyleExtension for polygon hatching | Official deck.gl extension for patterned polygon fills; terrain-compatible |
| @deck.gl/layers     | ^9.2.11 (installed) | GeoJsonLayer + TextLayer                | Already used for political overlay; TextLayer for centroid labels          |
| GeoEPR 2021         | June 2021           | Source ethnic boundary polygons         | Best available academic dataset with direct GeoJSON download               |

### Supporting

| Library    | Version          | Purpose                      | When to Use                                    |
| ---------- | ---------------- | ---------------------------- | ---------------------------------------------- |
| mapshaper  | CLI tool         | Simplify GeoJSON polygons    | In extraction script to reduce file size       |
| Canvas API | Browser built-in | Generate hatch pattern atlas | Create diagonal line textures programmatically |

### Alternatives Considered

| Instead of         | Could Use            | Tradeoff                                                                                                          |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| GeoEPR             | GREG (8969 polygons) | GREG is older (Soviet Atlas Narodov Mira source), less detailed, no direct GeoJSON format                         |
| FillStyleExtension | Custom GLSL shader   | FillStyleExtension is official, maintained, and proven; custom shader is more flexible but unnecessary complexity |
| Canvas texture     | Static PNG atlas     | Canvas is programmatic (easier to adjust), precedent exists in project decisions for Phase 24                     |

**Installation:**

```bash
npm install @deck.gl/extensions@^9.2.11
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── data/
│   └── ethnic-zones.json          # Extracted/processed GeoEPR data (static Vite import)
├── lib/
│   └── ethnicGroups.ts            # Group config: colors, labels, population, hatch params
├── components/
│   └── map/
│       └── layers/
│           └── EthnicOverlay.tsx   # useEthnicLayers() hook + EthnicOverlay null component
├── __tests__/
│   └── EthnicOverlay.test.tsx     # Data integrity + component mount tests
└── test/
    └── __mocks__/
        └── deck-gl-extensions.ts  # Mock for @deck.gl/extensions (jsdom)
scripts/
└── extract-ethnic-data.ts         # One-time script to download/process GeoEPR -> ethnic-zones.json
```

### Pattern 1: FillStyleExtension with Canvas-Generated Hatch Atlas

**What:** Create a canvas-based texture atlas containing diagonal line hatch patterns, use FillStyleExtension with `fillPatternMask: true` so `getFillColor` controls the per-group color while the pattern controls the shape.
**When to use:** For all 10 ethnic zone polygons.
**Example:**

```typescript
// Source: deck.gl FillStyleExtension docs
import { GeoJsonLayer } from '@deck.gl/layers';
import { FillStyleExtension } from '@deck.gl/extensions';

// Generate hatch pattern atlas on an offscreen canvas
function createHatchAtlas(): HTMLCanvasElement {
  const size = 32; // pattern tile size
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Clear (transparent background)
  ctx.clearRect(0, 0, size, size);

  // Draw diagonal lines (45-degree hatch)
  ctx.strokeStyle = 'white'; // white = opaque in mask mode
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Lines at 8px spacing
  for (let i = -size; i < size * 2; i += 8) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
  }
  ctx.stroke();

  return canvas;
}

// Pattern mapping (single pattern since mask mode colors it per-group)
const HATCH_MAPPING = {
  hatch: { x: 0, y: 0, width: 32, height: 32 },
};

const ethnicLayer = new GeoJsonLayer({
  id: 'ethnic-zones',
  data: ethnicZonesData,
  pickable: true,
  stroked: true,
  filled: true,
  // Per-group fill color with alpha for opacity
  getFillColor: (f) => GROUP_COLORS[f.properties.group],
  getLineColor: (f) => [...GROUP_COLORS[f.properties.group].slice(0, 3), 100],
  getLineWidth: 1,
  lineWidthUnits: 'pixels',
  // FillStyleExtension props
  fillPatternAtlas: createHatchAtlas(),
  fillPatternMapping: HATCH_MAPPING,
  getFillPattern: () => 'hatch',
  getFillPatternScale: 500, // Adjust for visual density
  fillPatternMask: true, // Key: use getFillColor to tint the white pattern
  extensions: [new FillStyleExtension({ pattern: true })],
});
```

### Pattern 2: Overlap Zones via Stacked Layers

**What:** For areas where multiple ethnic groups overlap (e.g., Kirkuk = Kurdish + Turkmen + Arab), render multiple GeoJsonLayers with offset hatch patterns that create interleaved colored stripes.
**When to use:** Overlap features where `groups` property lists multiple ethnic groups.
**Example:**

```typescript
// For overlap zones, create separate layers per group with offset patterns
// Each layer shows only features containing that group
// getFillPatternOffset shifts each group's stripes to interleave

const overlapLayers = OVERLAP_GROUPS.map((group, i) => {
  const offset = i / OVERLAP_GROUPS.length; // e.g., 0, 0.33, 0.66

  return new GeoJsonLayer({
    id: `ethnic-overlap-${group}`,
    data: overlapFeatures.filter((f) => f.properties.groups.includes(group)),
    fillPatternAtlas: hatchAtlas,
    fillPatternMapping: HATCH_MAPPING,
    getFillPattern: () => 'hatch',
    getFillPatternOffset: [offset, 0],
    getFillColor: GROUP_COLORS[group],
    fillPatternMask: true,
    extensions: [new FillStyleExtension({ pattern: true })],
  });
});
```

### Pattern 3: TextLayer for Centroid Labels

**What:** Compute polygon centroids and render ethnic group names as labels using deck.gl TextLayer with zoom-responsive sizing.
**When to use:** Always-visible labels when ethnic layer is active.
**Example:**

```typescript
import { TextLayer } from '@deck.gl/layers';

const labelLayer = new TextLayer({
  id: 'ethnic-labels',
  data: centroids, // Pre-computed [{position: [lng, lat], text: 'Kurdish', ...}]
  getPosition: (d) => d.position,
  getText: (d) => d.text,
  getColor: [255, 255, 255, 200],
  getSize: 14,
  sizeMinPixels: 10,
  sizeMaxPixels: 24,
  fontFamily: 'monospace',
  fontWeight: 'bold',
  getTextAnchor: 'middle',
  getAlignmentBaseline: 'center',
  billboard: false, // Flat on map, follows terrain
  pickable: false,
});
```

### Pattern 4: Data Extraction Script (Precedent: extract-geo-data.ts)

**What:** A one-time script that downloads GeoEPR 2021 GeoJSON, filters to Middle East bbox, merges cross-border group polygons, simplifies geometry, and outputs `src/data/ethnic-zones.json`.
**When to use:** During development setup, before the first build.
**Example approach:**

```typescript
// scripts/extract-ethnic-data.ts
// 1. Fetch GeoEPR-2021.geojson from ETH
// 2. Filter features to Middle East bbox (same as extract-geo-data.ts)
// 3. Map GeoEPR group names to our 10-group taxonomy
// 4. Merge polygons for same group across countries (turf.union or manual)
// 5. Create overlap zone features where groups intersect
// 6. Round coordinates to 2 decimal places
// 7. Write to src/data/ethnic-zones.json
```

### Anti-Patterns to Avoid

- **Hand-drawing GeoJSON boundaries:** Inaccurate, time-consuming, and the CONTEXT.md explicitly says to use published datasets and only include groups covered.
- **Using MapLibre fill layers instead of deck.gl:** MapLibre fills are invisible with terrain enabled (proven in Phase 24). Always use deck.gl GeoJsonLayer.
- **Blending colors in overlap zones:** Creates muddy indistinct colors. Use interleaved stripes instead (CONTEXT.md decision).
- **Making ethnic polygons clickable:** CONTEXT.md explicitly says no detail panel integration, tooltip only.
- **Per-group separate GeoJSON files:** Use a single file with `group` property per feature (CONTEXT.md decision, same pattern as countries.json).

## Don't Hand-Roll

| Problem                      | Don't Build                 | Use Instead                      | Why                                                                                     |
| ---------------------------- | --------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| Ethnic boundary polygons     | Manual GeoJSON tracing      | GeoEPR 2021 dataset              | Academic peer-reviewed dataset; tracing maps is slow and inaccurate                     |
| Polygon hatching             | Custom GLSL fragment shader | FillStyleExtension               | Official deck.gl extension, handles texture tiling, works with terrain                  |
| Pattern atlas generation     | Static PNG file             | Canvas API (programmatic)        | Adjustable at runtime, no external asset dependency, follows Phase 24 pattern decisions |
| Polygon simplification       | Manual coordinate pruning   | mapshaper (CLI) or turf.simplify | Proven topology-preserving simplification algorithms                                    |
| Polygon union (cross-border) | Custom merge algorithm      | @turf/union                      | Handles complex polygon merging with proper topology                                    |
| Centroid computation         | Average coordinates         | @turf/centroid or polylabel      | polylabel finds visual center for concave polygons (better than geometric centroid)     |

**Key insight:** The GeoEPR dataset does the hard work of ethnic boundary definition. The extraction script does the data wrangling. deck.gl FillStyleExtension does the hatching. Almost zero hand-rolled geometry logic is needed.

## Common Pitfalls

### Pitfall 1: GeoEPR Groups Don't Match Our 10-Group List

**What goes wrong:** GeoEPR codes "politically relevant" groups per country (e.g., Iran has Persians, Kurds, Azeris, Arabs, Baloch, Turkmen). The dataset may split groups by country (e.g., separate Kurdish polygons for Turkey-Kurds, Iraq-Kurds, etc.) or may not include small groups (Yazidi, Assyrian).
**Why it happens:** GeoEPR's scope is political relevance, not exhaustive ethnic mapping. Group names may not match exactly (e.g., "Baluchis" vs "Baloch", "Azeris" in Iran instead of a separate group).
**How to avoid:** Build a name-mapping table in the extraction script (`GeoEPR name -> our group name`). Accept that some groups (Yazidi, Assyrian) may be absent -- the CONTEXT.md decision handles this: "only include groups covered by the dataset" and "defer hand-drawing to a future patch."
**Warning signs:** Empty polygons for expected groups after filtering.

### Pitfall 2: Huge GeoJSON File Size

**What goes wrong:** The full GeoEPR-2021.geojson covers the entire world with high-detail polygons. Importing it directly into the frontend bundle would add megabytes.
**Why it happens:** Academic datasets prioritize accuracy over web optimization.
**How to avoid:** The extraction script must: (1) filter to Middle East bbox only, (2) simplify polygon coordinates (round to 2 decimal places, use mapshaper-level simplification), (3) strip unnecessary properties (keep only `group`, `label`, `population`). Target output: <100KB.
**Warning signs:** `ethnic-zones.json` exceeding 200KB; slow page load.

### Pitfall 3: FillStyleExtension Pattern Scale vs Zoom

**What goes wrong:** Hatch patterns look different at different zoom levels. At low zoom, lines are too dense; at high zoom, they're too sparse.
**Why it happens:** `getFillPatternScale` is in meters by default (24x24px pattern at scale 1 = ~24 meters). The visual density changes dramatically with zoom.
**How to avoid:** Use a fixed `getFillPatternScale` value that looks good at the mid-range zoom level (zoom 5-7 for country-scale view). Test at both extremes. The `sizeMinPixels`/`sizeMaxPixels` approach from IconLayer doesn't apply to pattern fills, so the scale is the main control.
**Warning signs:** Patterns that look solid at low zoom or invisible at high zoom.

### Pitfall 4: Canvas Hatch Atlas Not Created Before Layer

**What goes wrong:** The FillStyleExtension needs the canvas texture available at layer construction time. If created lazily or asynchronously, the layer renders without patterns.
**Why it happens:** Canvas creation is synchronous but must happen before `useMemo` returns the layer.
**How to avoid:** Create the hatch atlas canvas as a module-level constant (outside the React component), similar to how `hexToRgb` and `FACTION_RGB` are pre-computed in PoliticalOverlay.tsx.
**Warning signs:** Ethnic zones rendering as solid fills instead of hatched patterns.

### Pitfall 5: Overlap Zone Tooltip Priority

**What goes wrong:** Entity tooltips (flights, ships, events) get suppressed by ethnic zone tooltips since the ethnic layer is pickable.
**Why it happens:** deck.gl picking resolves to the topmost pickable layer. If ethnic zones are rendered above entities in the layer array, they capture hover events.
**How to avoid:** (1) Place ethnic layers BEFORE entity layers in the DeckGLOverlay array (lower z-order), (2) use the existing tooltip priority pattern from BaseMap.tsx where entity hover takes precedence. The ethnic tooltip should only appear when no entity is hovered.
**Warning signs:** Unable to hover entities when ethnic layer is active.

### Pitfall 6: @deck.gl/extensions Mock Missing in Tests

**What goes wrong:** Tests fail with "Cannot find module @deck.gl/extensions" because it's not in the vite.config.ts test alias list.
**Why it happens:** Every @deck.gl/\* package needs a test mock in this project (WebGL not available in jsdom).
**How to avoid:** Add `@deck.gl/extensions` alias to vite.config.ts pointing to a new mock file that exports a stub `FillStyleExtension` class.
**Warning signs:** Test failures mentioning @deck.gl/extensions import.

### Pitfall 7: GeoEPR Has Country-Specific Groups (Not Unified)

**What goes wrong:** GeoEPR codes Kurdish groups separately per country (Turkey-Kurds, Iraq-Kurds, Iran-Kurds, Syria-Kurds) with separate polygons. The CONTEXT.md requires a single unified Kurdish zone.
**Why it happens:** GeoEPR is organized by country-group pairs for political analysis.
**How to avoid:** The extraction script must merge all Kurdish polygons into a single MultiPolygon feature using `@turf/union` or equivalent. Same for Arabs, Turkmen, Baloch, and Pashtun which span multiple countries.
**Warning signs:** Separate colored patches instead of one continuous zone per ethnic group.

## Code Examples

### Canvas Hatch Pattern Atlas Generation

```typescript
// Source: Canvas API + project pattern (Phase 24 canvas decisions)
/**
 * Creates a 32x32 canvas with white diagonal lines on transparent background.
 * Used as fillPatternAtlas with fillPatternMask: true.
 * White pixels = opaque (show getFillColor), transparent = see-through.
 */
function createHatchAtlas(): HTMLCanvasElement {
  const SIZE = 32;
  const SPACING = 8; // px between lines
  const WIDTH = 2; // line width

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = WIDTH;
  ctx.lineCap = 'square';

  ctx.beginPath();
  for (let i = -SIZE; i < SIZE * 2; i += SPACING) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + SIZE, SIZE);
  }
  ctx.stroke();

  return canvas;
}
```

### Ethnic Group Configuration

```typescript
// Source: Project pattern (factions.ts from Phase 24)
export type EthnicGroup =
  | 'kurdish'
  | 'arab'
  | 'persian'
  | 'baloch'
  | 'turkmen'
  | 'druze'
  | 'alawite'
  | 'yazidi'
  | 'assyrian'
  | 'pashtun';

export interface EthnicGroupConfig {
  id: EthnicGroup;
  label: string;
  color: string; // hex color for hatching + legend
  rgba: [number, number, number, number]; // pre-computed for getFillColor
  population: string; // approximate, for tooltip
  context: string; // brief description for tooltip
}

// 10-color palette: bright, distinguishable on dark map, distinct from faction colors
// (blue, red, gray are used by political layer)
export const ETHNIC_GROUPS: Record<EthnicGroup, EthnicGroupConfig> = {
  kurdish: {
    id: 'kurdish',
    label: 'Kurdish',
    color: '#f59e0b',
    rgba: [245, 158, 11, 70],
    population: '~30-40M',
    context: 'Cross-border zone: SE Turkey, N Iraq, NE Syria, W Iran',
  },
  arab: {
    id: 'arab',
    label: 'Arab',
    color: '#10b981',
    rgba: [16, 185, 129, 70],
    population: '~200M+',
    context: 'Majority across Arabian Peninsula, Iraq, Levant',
  },
  persian: {
    id: 'persian',
    label: 'Persian',
    color: '#6366f1',
    rgba: [99, 102, 241, 70],
    population: '~50-60M',
    context: 'Central and eastern Iran',
  },
  baloch: {
    id: 'baloch',
    label: 'Baloch',
    color: '#ec4899',
    rgba: [236, 72, 153, 70],
    population: '~10-15M',
    context: 'SE Iran, SW Pakistan',
  },
  turkmen: {
    id: 'turkmen',
    label: 'Turkmen',
    color: '#14b8a6',
    rgba: [20, 184, 166, 70],
    population: '~7-10M',
    context: 'Turkmenistan, NE Iran, N Iraq/Syria pockets',
  },
  druze: {
    id: 'druze',
    label: 'Druze',
    color: '#f97316',
    rgba: [249, 115, 22, 70],
    population: '~1-2M',
    context: 'S Lebanon, SW Syria, N Israel',
  },
  alawite: {
    id: 'alawite',
    label: 'Alawite',
    color: '#8b5cf6',
    rgba: [139, 92, 246, 70],
    population: '~2-3M',
    context: 'NW Syria coast (Latakia region)',
  },
  yazidi: {
    id: 'yazidi',
    label: 'Yazidi',
    color: '#eab308',
    rgba: [234, 179, 8, 70],
    population: '~500K-1M',
    context: 'Sinjar district, N Iraq',
  },
  assyrian: {
    id: 'assyrian',
    label: 'Assyrian',
    color: '#06b6d4',
    rgba: [6, 182, 212, 70],
    population: '~2-3M',
    context: 'Nineveh Plains (N Iraq), Khabur (NE Syria)',
  },
  pashtun: {
    id: 'pashtun',
    label: 'Pashtun',
    color: '#84cc16',
    rgba: [132, 204, 22, 70],
    population: '~50-60M',
    context: 'E/S Afghanistan, NW Pakistan',
  },
};
```

### useEthnicLayers Hook (Following usePoliticalLayers Pattern)

```typescript
// Source: Project pattern (PoliticalOverlay.tsx)
import { useMemo } from 'react';
import { GeoJsonLayer, TextLayer } from '@deck.gl/layers';
import { FillStyleExtension } from '@deck.gl/extensions';
import { useLayerStore } from '@/stores/layerStore';
import { ETHNIC_GROUPS } from '@/lib/ethnicGroups';
import { LEGEND_REGISTRY } from '@/components/map/MapLegend';
import ethnicZonesData from '@/data/ethnic-zones.json';

// Module-level: create once
const hatchAtlas = createHatchAtlas();
const HATCH_MAPPING = { hatch: { x: 0, y: 0, width: 32, height: 32 } };

// Register legend
LEGEND_REGISTRY.push({
  layerId: 'ethnic',
  title: 'ETHNIC GROUPS',
  mode: 'discrete',
  colorStops: Object.values(ETHNIC_GROUPS).map((g) => ({
    color: g.color,
    label: g.label,
  })),
});

export function useEthnicLayers(): (GeoJsonLayer | TextLayer)[] {
  const isActive = useLayerStore((s) => s.activeLayers.has('ethnic'));

  return useMemo(() => {
    if (!isActive) return [];

    const fillLayer = new GeoJsonLayer({
      id: 'ethnic-zones',
      data: ethnicZonesData,
      pickable: true,
      stroked: true,
      filled: true,
      getFillColor: (f) => {
        const group = f.properties.group as string;
        return ETHNIC_GROUPS[group]?.rgba ?? [128, 128, 128, 50];
      },
      getLineColor: [255, 255, 255, 30],
      getLineWidth: 0.5,
      lineWidthUnits: 'pixels',
      fillPatternAtlas: hatchAtlas,
      fillPatternMapping: HATCH_MAPPING,
      getFillPattern: () => 'hatch',
      getFillPatternScale: 500,
      fillPatternMask: true,
      extensions: [new FillStyleExtension({ pattern: true })],
    });

    // Labels at centroids
    const labelLayer = new TextLayer({
      id: 'ethnic-labels',
      data: computeCentroids(ethnicZonesData),
      getPosition: (d) => d.position,
      getText: (d) => d.text,
      getColor: [255, 255, 255, 200],
      getSize: 14,
      sizeMinPixels: 10,
      sizeMaxPixels: 24,
      fontFamily: 'Inter, sans-serif',
      fontWeight: '700',
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      billboard: false,
      pickable: false,
    });

    return [fillLayer, labelLayer];
  }, [isActive]);
}
```

### BaseMap Integration Point

```typescript
// In BaseMap.tsx, add alongside politicalLayers:
const ethnicLayers = useEthnicLayers();

// In DeckGLOverlay layers array:
// Political first (bottom), then ethnic (on top of political), then weather/entity/threat
layers={isBelowZoom9
  ? [...politicalLayers, ...ethnicLayers, ...weatherLayers, ...entityLayers, ...threatLayers]
  : [...politicalLayers, ...ethnicLayers, ...weatherLayers, ...threatLayers, ...entityLayers]}
```

## State of the Art

| Old Approach                       | Current Approach         | When Changed          | Impact                                                           |
| ---------------------------------- | ------------------------ | --------------------- | ---------------------------------------------------------------- |
| MapLibre fill layers for polygons  | deck.gl GeoJsonLayer     | Phase 24 (Apr 2026)   | MapLibre fills invisible with terrain; deck.gl works             |
| Custom GLSL for patterns           | FillStyleExtension       | deck.gl 8.6+          | Official extension handles pattern tiling in WebGL               |
| Static PNG pattern atlas           | Canvas-generated texture | Current best practice | Programmatic, adjustable, no external asset                      |
| GREG dataset (Soviet Atlas source) | GeoEPR 2021              | 2021                  | More detailed, GeoJSON format, politically relevant groups coded |

**Deprecated/outdated:**

- GREG dataset: Still available but based on 1960s Soviet Atlas Narodov Mira data. GeoEPR 2021 is the modern successor with more detailed boundaries.
- ACLED ethnic coding: ACLED has some ethnic dimension but is conflict-focused, not ethnic distribution mapping.

## GeoEPR Dataset Details

### What GeoEPR 2021 Provides

- **Format:** GeoJSON directly available (also Shapefile, CSV with WKT, SQL)
- **Coordinate system:** WGS84 (SRID 4326) -- matches project's map projection
- **Scope:** All politically relevant ethnic groups worldwide
- **Structure:** One polygon per group-country-period (multiple polygons for same group across countries)
- **Key properties:** groupid, group name, state name, settlement type, temporal validity (from/to year)
- **Download:** https://icr.ethz.ch/data/epr/geoepr/ (GeoEPR-2021.geojson)

### Expected Group Coverage for Our 10 Zones

| Our Group | GeoEPR Coverage                 | Confidence | Notes                                                             |
| --------- | ------------------------------- | ---------- | ----------------------------------------------------------------- |
| Kurdish   | YES - Iran, Iraq, Turkey, Syria | HIGH       | Coded as politically relevant in all 4 countries                  |
| Arab      | YES - Multiple countries        | HIGH       | Major group across region                                         |
| Persian   | YES - Iran                      | HIGH       | Senior partner in Iran (51% pop)                                  |
| Baloch    | YES - Iran, Pakistan            | HIGH       | Coded in both countries                                           |
| Turkmen   | YES - Iran, possibly Iraq       | MEDIUM     | In Iran for certain; Iraq/Syria coverage uncertain                |
| Druze     | LIKELY - Lebanon, Syria, Israel | MEDIUM     | Politically relevant minority in all three                        |
| Alawite   | LIKELY - Syria                  | MEDIUM     | Politically relevant (ruling minority in Assad era)               |
| Yazidi    | LOW                             | LOW        | May not be coded as "politically relevant" -- small, concentrated |
| Assyrian  | LOW                             | LOW        | Similar to Yazidi -- may lack coverage in GeoEPR                  |
| Pashtun   | YES - Afghanistan, Pakistan     | HIGH       | Major group in both countries                                     |

### Data Processing Pipeline

1. **Download** GeoEPR-2021.geojson (full world dataset)
2. **Filter** to Middle East bbox (lat 0-50, lng 20-80, matching existing `FILTER_BBOX`)
3. **Map** GeoEPR group names to our 10-group taxonomy (name mapping table)
4. **Merge** cross-border polygons per group using turf/union (e.g., Kurdish zones from 4 countries into one MultiPolygon)
5. **Identify** overlap zones where multiple groups' polygons intersect
6. **Simplify** coordinates (round to 2 decimal places, topology-preserving simplification)
7. **Strip** unnecessary properties (keep: group, label)
8. **Output** `src/data/ethnic-zones.json` as FeatureCollection

### Handling Missing Groups (Yazidi, Assyrian)

Per CONTEXT.md: "Only include groups covered by the dataset -- do NOT hand-draw missing groups." If GeoEPR lacks Yazidi/Assyrian polygons:

- The extraction script should log which groups were found and which are missing
- Missing groups are simply absent from the output -- no error, no placeholder
- Deferred to a future patch (explicitly listed in Deferred Ideas)
- The 10-group config still includes all groups (for legend, etc.) but will show no polygon for uncovered groups

## Overlap Zone Strategy

### The Problem

Kirkuk area (N Iraq) has Kurdish + Turkmen + Arab populations. The hatch pattern must show all three groups distinctly.

### The Solution: Stacked Layers with Offset Patterns

1. **Pre-process overlap zones** in the extraction script:
   - Compute polygon intersections between different groups using turf/intersect
   - Tag intersection features with `groups: ['kurdish', 'turkmen', 'arab']`
   - Remove overlap areas from individual group polygons (use turf/difference) to avoid double-rendering
2. **Render overlap zones** as separate stacked GeoJsonLayers:
   - One layer per group present in the overlap
   - Each layer uses `getFillPatternOffset` to shift the hatch lines
   - Result: interleaved colored stripes (Kurdish gold + Turkmen teal + Arab green)
3. **Alternative simpler approach** (if overlap processing is too complex):
   - Keep group polygons overlapping naturally
   - The transparent gaps in the hatch pattern allow underlying group colors to show through
   - This creates a natural "visual mixing" effect without explicit intersection computation
   - Trade-off: less precise than interleaved stripes but much simpler to implement

**Recommendation:** Start with the simpler approach (natural overlap through transparency). If the visual result is insufficient, upgrade to the explicit intersection approach.

## Tooltip Architecture

### Ethnic Zone Tooltip

```typescript
// New tooltip type for ethnic zones
// Shows on hover over ethnic polygon when no entity is hovered
// Priority: Entity > Threat > Ethnic > Weather

function EthnicTooltip({ zone, x, y }) {
  // zone from GeoJSON feature properties
  const config = ETHNIC_GROUPS[zone.group];
  return (
    <div style={tooltipStyle}>
      <span style={{ color: config.color }}>{config.label}</span>
      <br />Population: {config.population}
      <br />{config.context}
      {zone.groups && <><br />Also: {zone.groups.join(' · ')}</>}
    </div>
  );
}
```

### Tooltip Priority Chain (Updated)

```
Entity hover → ThreatTooltip → EthnicTooltip → WeatherTooltip
```

This follows the existing BaseMap pattern where the first non-null tooltip wins.

## 10-Color Palette Recommendation

Requirements: Distinguishable on dark (#0a1628) base map, distinct from political layer colors (blue #3b82f6, red #dc2626, gray #64748b, amber #f59e0b).

| Group    | Color   | Hex     | Rationale                                         |
| -------- | ------- | ------- | ------------------------------------------------- |
| Kurdish  | Amber   | #f59e0b | Warm, distinct from reds; historically associated |
| Arab     | Emerald | #10b981 | Green family; distinct from all faction colors    |
| Persian  | Indigo  | #6366f1 | Cool purple-blue; distinct from faction blue      |
| Baloch   | Pink    | #ec4899 | Warm pink; unique in palette                      |
| Turkmen  | Teal    | #14b8a6 | Cool blue-green; distinct from emerald            |
| Druze    | Orange  | #f97316 | Warm; distinct from amber                         |
| Alawite  | Violet  | #8b5cf6 | Purple family; distinct from indigo               |
| Yazidi   | Yellow  | #eab308 | Bright; small zones need visibility               |
| Assyrian | Cyan    | #06b6d4 | Cool; distinct from teal                          |
| Pashtun  | Lime    | #84cc16 | Yellow-green; distinct from emerald               |

Note: Kurdish (#f59e0b) matches the disputed territory amber. Since ethnic and political layers render independently and the contexts are different (ethnic zone vs. legal dispute), this is acceptable. Alternatively, shift Kurdish to gold (#d97706) for more separation.

## Validation Architecture

### Test Framework

| Property           | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| Framework          | Vitest 3.x with jsdom                                 |
| Config file        | vite.config.ts (test section)                         |
| Quick run command  | `npx vitest run src/__tests__/EthnicOverlay.test.tsx` |
| Full suite command | `npx vitest run`                                      |

### Phase Requirements -> Test Map

| Req ID | Behavior                                                         | Test Type | Automated Command                                                         | File Exists? |
| ------ | ---------------------------------------------------------------- | --------- | ------------------------------------------------------------------------- | ------------ |
| ETH-01 | ethnic-zones.json is valid FeatureCollection with group property | unit      | `npx vitest run src/__tests__/EthnicOverlay.test.tsx -t "data integrity"` | No -- Wave 0 |
| ETH-02 | useEthnicLayers returns empty when layer inactive                | unit      | `npx vitest run src/__tests__/EthnicOverlay.test.tsx -t "inactive"`       | No -- Wave 0 |
| ETH-03 | EthnicOverlay component mounts without error                     | unit      | `npx vitest run src/__tests__/EthnicOverlay.test.tsx -t "mounts"`         | No -- Wave 0 |
| ETH-04 | LEGEND_REGISTRY includes ethnic entry when active                | unit      | `npx vitest run src/__tests__/EthnicOverlay.test.tsx -t "legend"`         | No -- Wave 0 |
| ETH-05 | LayerTogglesSlot ethnic row is not comingSoon                    | unit      | `npx vitest run src/__tests__/LayerToggles.test.tsx -t "ethnic"`          | No -- Wave 0 |
| ETH-06 | Ethnic group config covers all 10 groups                         | unit      | `npx vitest run src/__tests__/EthnicOverlay.test.tsx -t "config"`         | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/EthnicOverlay.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/EthnicOverlay.test.tsx` -- covers ETH-01 through ETH-06
- [ ] `src/test/__mocks__/deck-gl-extensions.ts` -- mock for @deck.gl/extensions
- [ ] vite.config.ts alias entry for @deck.gl/extensions
- [ ] `npm install @deck.gl/extensions@^9.2.11`

## Open Questions

1. **GeoEPR group name mapping**
   - What we know: GeoEPR uses group names like "Persians", "Kurds", "Baluchis", "Azeris" -- likely close to our taxonomy but not exact matches
   - What's unclear: The exact property name in GeoJSON (likely `group` or `groupname`) and the exact string values for Middle East groups
   - Recommendation: The extraction script should dump all group names for Middle East countries first, then build the mapping table. This is a one-time manual step during development.

2. **Yazidi and Assyrian coverage in GeoEPR**
   - What we know: GeoEPR codes "politically relevant" groups. Yazidi (~500K-1M) and Assyrian (~2-3M) may fall below the political relevance threshold.
   - What's unclear: Whether GeoEPR has polygons for these groups in Iraq/Syria
   - Recommendation: Try to extract them. If absent, gracefully omit (per CONTEXT.md: "only include groups covered by the dataset"). Log the omission.

3. **Overlap zone computation complexity**
   - What we know: @turf/intersect can compute polygon intersections, @turf/difference can subtract overlap areas
   - What's unclear: How many overlap zones exist in practice and whether the computation is needed or if natural transparency layering suffices
   - Recommendation: Start simple (natural overlap), evaluate visually, upgrade if needed.

4. **FillPatternScale optimal value**
   - What we know: Scale 1 = ~24 meters at zoom level where 1px = 1m. At zoom 5 (region view), this would be invisible.
   - What's unclear: The exact scale value that looks good at zoom 5-7
   - Recommendation: Start with scale 500-1000, tune visually. This is a discretion item.

5. **GeoEPR Azeris vs project's 10 groups**
   - What we know: GeoEPR codes Azeris as a major group in Iran (24% of population) with polygons. Our 10-group list does not include Azeris.
   - What's unclear: Whether to include Azeris as an 11th group or merge them into another category
   - Recommendation: The CONTEXT.md lists exactly 10 groups and does not include Azeris. Omit Azeris from the output unless the user decides otherwise. This is worth flagging during planning.

## Sources

### Primary (HIGH confidence)

- [deck.gl FillStyleExtension docs](https://deck.gl/docs/api-reference/extensions/fill-style-extension) - fillPatternMask, fillPatternAtlas, pattern tiling API
- [deck.gl GeoJsonLayer docs](https://deck.gl/docs/api-reference/layers/geojson-layer) - polygon rendering with extensions
- [GeoEPR 2021 dataset](https://icr.ethz.ch/data/epr/geoepr/) - GeoJSON format available, WGS84, politically relevant ethnic groups
- Existing codebase: `PoliticalOverlay.tsx`, `extract-geo-data.ts`, `layerStore.ts`, `MapLegend.tsx`

### Secondary (MEDIUM confidence)

- [GeoEPR 2021 Codebook](https://icr.ethz.ch/data/epr/geoepr/EPR_2021_Codebook_GeoEPR.pdf) - Referenced but PDF not fully parseable; attribute structure inferred from multiple sources
- [GeoEPR on Harvard Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/CCF1MM) - Alternative download source
- [GREG dataset](https://icr.ethz.ch/data/greg/) - Alternative source (8969 polygons, Soviet Atlas base), not recommended as primary
- [GitHub deck.gl FillStyleExtension discussion #6347](https://github.com/visgl/deck.gl/discussions/6347) - Confirmed fillPatternMask controls color sourcing

### Tertiary (LOW confidence)

- GeoEPR group coverage for Yazidi/Assyrian - Inferred from "politically relevant" scope; not verified against actual dataset
- Exact GeoJSON property names - Inferred from codebook references; will be confirmed during extraction script development
- Overlap zone count and complexity - Unknown until data is processed
- FillPatternScale optimal value - Requires visual tuning

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - FillStyleExtension is well-documented, GeoEPR is academic standard
- Architecture: HIGH - Follows proven patterns from Phase 24 (PoliticalOverlay, extract-geo-data.ts)
- Data source: MEDIUM - GeoEPR coverage for all 10 groups is likely but not verified for smaller minorities
- Pitfalls: HIGH - Based on actual codebase inspection and documented limitations
- Overlap zones: MEDIUM - Approach is sound but implementation complexity unknown until data inspection

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable domain; GeoEPR dataset unlikely to change)
