# GDELT Event Category Reclassification

## Problem

The current drone/missile entity distinction is fabricated. CAMEO root codes classify events by *action type* (Assault, Fight, Mass Violence), not weapon system. The mapping of root code 18 to "drone" and 19/20 to "missile" has no basis in the data.

## Solution

Replace the 2-type system (`drone | missile`) with a 10-type system based on CAMEO 3-digit `EventBaseCode`, grouped into 4 UI toggle categories.

## Entity Types (10-value union)

Derived from CAMEO `EventBaseCode` (column 27):

| Code | CAMEO Description | Entity Type |
|---|---|---|
| 195 | Employ aerial weapons | `airstrike` |
| 190 | Conventional military force (general) | `ground_combat` |
| 192 | Occupy territory | `ground_combat` |
| 193 | Small arms / light weapons | `ground_combat` |
| 194 | Artillery / tank support | `shelling` |
| 183 | Suicide / car / non-military bombing | `bombing` |
| 185 | Attempt to assassinate | `assassination` |
| 186 | Assassinate | `assassination` |
| 181 | Abduct, hijack, take hostage | `abduction` |
| 180 | Unconventional violence (general) | `assault` |
| 182 | Physically assault | `assault` |
| 184 | Use as human shield | `assault` |
| 191 | Impose blockade, restrict movement | `blockade` |
| 196 | Violate ceasefire | `ceasefire_violation` |
| 200 | Mass violence (general) | `mass_violence` |
| 201 | Mass expulsion | `mass_violence` |
| 202 | Mass killings | `mass_violence` |
| 203 | Ethnic cleansing | `mass_violence` |
| 204 | Weapons of mass destruction | `wmd` |

### Fallback for unmapped base codes

CAMEO codes 187, 188, 197-199 may appear in GDELT data. Unmapped base codes fall back by root code:
- Root 18 → `assault`
- Root 19 → `ground_combat`
- Root 20 → `mass_violence`

## UI Toggle Groups (4 rows, replacing current Drones + Missiles)

| Toggle | Entity Types Included | Icon | Color (RGB) | Hex |
|---|---|---|---|---|
| **Airstrikes** | `airstrike` | `starburst` | [255, 59, 48] | `#ff3b30` (bright red) |
| **Ground Combat** | `ground_combat`, `shelling`, `bombing` | `explosion` (new) | [239, 68, 68] | `#ef4444` (red) |
| **Targeted** | `assassination`, `abduction` | `crosshair` (new) | [139, 30, 30] | `#8b1e1e` (maroon) |
| **Other Conflict** | `assault`, `blockade`, `ceasefire_violation`, `mass_violence`, `wmd` | `xmark` | [239, 68, 68] | `#ef4444` (red) |

### showNews toggle removal

The existing `showNews` toggle is replaced by the 4 new toggles. Its tooltip gating behavior (in `BaseMap.tsx`) is replaced by per-category layer visibility — when a category toggle is off, both the layer AND the tooltip for those entities are suppressed. The `showNews` state, toggle action, and "News" toggle row are all removed.

### Toggle-to-type mapping (shared constant)

A `CONFLICT_TOGGLE_GROUPS` constant maps each toggle to its entity types. Used in `useEntityLayers` (layer filtering), `StatusPanel` (count computation), and `BaseMap` (tooltip gating):

```typescript
export const CONFLICT_TOGGLE_GROUPS = {
  showAirstrikes: ['airstrike'] as const,
  showGroundCombat: ['ground_combat', 'shelling', 'bombing'] as const,
  showTargeted: ['assassination', 'abduction'] as const,
  showOtherConflict: ['assault', 'blockade', 'ceasefire_violation', 'mass_violence', 'wmd'] as const,
} as const;
```

### Type guard helper

```typescript
export function isConflictEventType(type: string): type is ConflictEventType {
  return CONFLICT_EVENT_TYPES.has(type);
}
```

Used in `BaseMap.tsx`, `EntityTooltip.tsx`, `DetailPanelSlot.tsx`, `useEntityLayers.ts` to replace all `type === 'drone' || type === 'missile'` checks.

## Data Model Changes

### `server/types.ts`

```typescript
export type ConflictEventType =
  | 'airstrike'
  | 'ground_combat'
  | 'shelling'
  | 'bombing'
  | 'assassination'
  | 'abduction'
  | 'assault'
  | 'blockade'
  | 'ceasefire_violation'
  | 'mass_violence'
  | 'wmd';

export type EntityType = 'flight' | 'ship' | ConflictEventType;

export interface ConflictEventEntity extends MapEntityBase {
  type: ConflictEventType;
  data: {
    eventType: string;      // Human-readable CAMEO description (e.g. "Employ aerial weapons")
    subEventType: string;   // Full CAMEO code (e.g. "CAMEO 195")
    fatalities: number;
    actor1: string;
    actor2: string;
    notes: string;
    source: string;
    goldsteinScale: number;
    locationName: string;
    cameoCode: string;      // Raw EventCode value
  };
}
```

`data.eventType` continues to hold the human-readable CAMEO description from `describeEvent()`. The entity `type` field holds the machine-readable category (e.g. `airstrike`). These are distinct: `type` drives layer/icon/toggle logic, `data.eventType` is for display.

### `server/adapters/gdelt.ts`

- Replace `classifyByCAMEO(eventRootCode, eventCode)` with `classifyByBaseCode(eventBaseCode, eventRootCode)` using the full lookup table + root-code fallback.
- `describeEvent` expanded to cover all 18+ base codes with human-readable descriptions.
- `normalizeGdeltEvent` uses `EventBaseCode` (col 27) for classification.

### `src/types/ui.ts`

Replace `showDrones`/`showMissiles`/`showNews` with:
- `showAirstrikes: boolean` (default: true)
- `showGroundCombat: boolean` (default: true)
- `showTargeted: boolean` (default: true)
- `showOtherConflict: boolean` (default: true)

Remove `toggleDrones`, `toggleMissiles`, `toggleNews`. Add `toggleAirstrikes`, `toggleGroundCombat`, `toggleTargeted`, `toggleOtherConflict`.

### `src/stores/uiStore.ts`

New toggle state, actions, persistence. localStorage migration: on load, if stored object contains `showDrones` key, discard and use defaults (one-time migration).

### `src/components/layout/LayerTogglesSlot.tsx`

Replace the Drones, Missiles, and News rows with: Airstrikes, Ground Combat, Targeted, Other Conflict.

### `src/components/map/layers/icons.ts`

Canvas width increases from 160 to 224 (7 icons * 32px). New entries:

- Icon 5 (offset 160): `explosion` — radiating burst shape for ground combat
- Icon 6 (offset 192): `crosshair` — targeting reticle for assassination/abduction

ICON_MAPPING gains `explosion: { x: 160, ... }` and `crosshair: { x: 192, ... }`.

### `src/components/map/layers/constants.ts`

```typescript
export const ENTITY_COLORS = {
  flight: [234, 179, 8] as const,
  flightUnidentified: [239, 68, 68] as const,
  ship: [156, 163, 175] as const,
  airstrike: [255, 59, 48] as const,      // bright red
  groundCombat: [239, 68, 68] as const,   // red
  targeted: [139, 30, 30] as const,       // maroon
  otherConflict: [239, 68, 68] as const,  // red
} as const;

export const ENTITY_DOT_COLORS = {
  flights: '#eab308',
  ships: '#9ca3af',
  airstrikes: '#ff3b30',
  groundCombat: '#ef4444',
  targeted: '#8b1e1e',
  otherConflict: '#ef4444',
  ground: '#eab308',
  unidentified: '#ef4444',
} as const;

export const ICON_SIZE = {
  flight:        { meters: 8000, minPixels: 24, maxPixels: 160 },
  ship:          { meters: 8000, minPixels: 24, maxPixels: 160 },
  airstrike:     { meters: 8000, minPixels: 24, maxPixels: 160 },
  groundCombat:  { meters: 8000, minPixels: 24, maxPixels: 160 },
  targeted:      { meters: 8000, minPixels: 24, maxPixels: 160 },
  otherConflict: { meters: 8000, minPixels: 24, maxPixels: 160 },
} as const;
```

### `src/hooks/useEntityLayers.ts`

- 4 icon layers replacing 2 (airstrikes, groundCombat, targeted, otherConflict)
- Each layer filters events using `CONFLICT_TOGGLE_GROUPS`
- `getIconForEntity`, `getColorForEntity` updated with `isConflictEventType` guard + per-group mapping
- Returns: `[shipLayer, flightLayer, airstrikeLayer, groundCombatLayer, targetedLayer, otherConflictLayer, glowLayer, highlightLayer]`

### `src/components/ui/StatusPanel.tsx`

Events count = sum of entities visible across all 4 enabled conflict toggles. Uses `CONFLICT_TOGGLE_GROUPS` + toggle state to compute.

### `src/components/map/BaseMap.tsx`

- Remove `showNews` selector
- Tooltip gating: use `isConflictEventType` + check which toggle group the entity belongs to → suppress tooltip if that group's toggle is off
- Uses `CONFLICT_TOGGLE_GROUPS` for the lookup

### `src/components/map/EntityTooltip.tsx`

- `EventContent` header shows specific type label (e.g. "Airstrike", "Shelling", "Ceasefire Violation") via a `getEventTypeLabel(type)` helper
- Replace `entity.type === 'drone' || entity.type === 'missile'` with `isConflictEventType(entity.type)`

### `src/components/layout/DetailPanelSlot.tsx`

- `getDotColor`: use `isConflictEventType` → look up which toggle group → return that group's dot color
- `getTypeLabel`: use `isConflictEventType` → return human-readable label from entity type
- `getEntityName`: use `isConflictEventType` → cast to `ConflictEventEntity` and return `data.eventType`

## Files Changed

1. `server/types.ts` — `ConflictEventType` union, updated `EntityType` and `ConflictEventEntity`
2. `server/adapters/gdelt.ts` — `classifyByBaseCode` rewrite, expanded `describeEvent`
3. `src/types/ui.ts` — 4 new toggles replacing 3 (drones/missiles/news), `CONFLICT_TOGGLE_GROUPS`, `isConflictEventType`
4. `src/stores/uiStore.ts` — new toggle state, actions, persistence, localStorage migration
5. `src/components/layout/LayerTogglesSlot.tsx` — 4 new toggle rows replacing 3
6. `src/components/map/layers/icons.ts` — canvas 224px, 2 new shapes (explosion, crosshair)
7. `src/components/map/layers/constants.ts` — new colors, dot colors, icon sizes
8. `src/hooks/useEntityLayers.ts` — 4 conflict layers, updated helper functions
9. `src/components/ui/StatusPanel.tsx` — updated event counts using toggle groups
10. `src/components/map/EntityTooltip.tsx` — specific event type labels, `isConflictEventType` guard
11. `src/components/map/BaseMap.tsx` — remove `showNews`, per-toggle tooltip gating
12. `src/components/layout/DetailPanelSlot.tsx` — updated `getDotColor`, `getTypeLabel`, `getEntityName`
13. Tests: `server/__tests__/gdelt.test.ts`, `src/__tests__/entityLayers.test.ts`, `src/__tests__/BaseMap.test.tsx`, `src/__tests__/StatusPanel.test.tsx`, `src/__tests__/LayerToggles.test.tsx`, `src/__tests__/uiStore.test.ts`
