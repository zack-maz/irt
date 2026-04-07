# GDELT Event Category Reclassification — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fabricated drone/missile entity type split with 10 CAMEO-based conflict event categories grouped into 4 UI toggle groups.

**Architecture:** Server-side classification uses CAMEO `EventBaseCode` (3-digit) for granular typing. A shared `ConflictEventType` union and `CONFLICT_TOGGLE_GROUPS` constant drive all layer visibility, tooltip gating, and count computation. The `showNews` toggle is removed — replaced by 4 per-category toggles.

**Tech Stack:** TypeScript, Zustand, React, Deck.gl IconLayer, Vitest

---

## Task 1: Server Types — ConflictEventType Union

**Files:**

- Modify: `server/types.ts`

- [ ] **Step 1: Update EntityType and ConflictEventEntity in server/types.ts**

Replace the current `EntityType` and `ConflictEventEntity`:

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
```

Update `ConflictEventEntity`:

```typescript
export interface ConflictEventEntity extends MapEntityBase {
  type: ConflictEventType;
  data: {
    eventType: string; // Human-readable CAMEO description
    subEventType: string; // "CAMEO <code>"
    fatalities: number;
    actor1: string;
    actor2: string;
    notes: string;
    source: string;
    goldsteinScale: number;
    locationName: string;
    cameoCode: string;
  };
}
```

- [ ] **Step 2: Add ConflictEventType to src/types/entities.ts re-export**

Add `ConflictEventType` to the re-export list:

```typescript
export type {
  MapEntity,
  FlightEntity,
  ShipEntity,
  ConflictEventEntity,
  ConflictEventType,
  EntityType,
  MapEntityBase,
  BoundingBox,
  CacheResponse,
} from '../../server/types.js';
```

- [ ] **Step 3: Verify TypeScript compiles (expect errors in downstream files — that's fine)**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: Errors in downstream files referencing `'drone' | 'missile'` — confirms the type change propagated.

---

## Task 2: GDELT Adapter — classifyByBaseCode

**Files:**

- Modify: `server/adapters/gdelt.ts`
- Modify: `server/__tests__/gdelt.test.ts`

- [ ] **Step 1: Update test file — rename classifyByCAMEO tests to classifyByBaseCode**

Replace the `classifyByCAMEO` describe block and update the import. Also update mock entity types in `validIranMissileRow` / `validSyriaDroneRow` setup and assertions:

```typescript
// At top: update import
let classifyByBaseCode: typeof import('../adapters/gdelt.js').classifyByBaseCode;

// In beforeEach:
classifyByBaseCode = mod.classifyByBaseCode;

// Replace classifyByCAMEO describe block:
describe('classifyByBaseCode', () => {
  it('returns airstrike for base code 195', () => {
    expect(classifyByBaseCode('195', '19')).toBe('airstrike');
  });

  it('returns ground_combat for base code 193', () => {
    expect(classifyByBaseCode('193', '19')).toBe('ground_combat');
  });

  it('returns ground_combat for base code 190', () => {
    expect(classifyByBaseCode('190', '19')).toBe('ground_combat');
  });

  it('returns ground_combat for base code 192', () => {
    expect(classifyByBaseCode('192', '19')).toBe('ground_combat');
  });

  it('returns shelling for base code 194', () => {
    expect(classifyByBaseCode('194', '19')).toBe('shelling');
  });

  it('returns bombing for base code 183', () => {
    expect(classifyByBaseCode('183', '18')).toBe('bombing');
  });

  it('returns assassination for base code 185', () => {
    expect(classifyByBaseCode('185', '18')).toBe('assassination');
  });

  it('returns assassination for base code 186', () => {
    expect(classifyByBaseCode('186', '18')).toBe('assassination');
  });

  it('returns abduction for base code 181', () => {
    expect(classifyByBaseCode('181', '18')).toBe('abduction');
  });

  it('returns assault for base code 180', () => {
    expect(classifyByBaseCode('180', '18')).toBe('assault');
  });

  it('returns assault for base code 182', () => {
    expect(classifyByBaseCode('182', '18')).toBe('assault');
  });

  it('returns assault for base code 184', () => {
    expect(classifyByBaseCode('184', '18')).toBe('assault');
  });

  it('returns blockade for base code 191', () => {
    expect(classifyByBaseCode('191', '19')).toBe('blockade');
  });

  it('returns ceasefire_violation for base code 196', () => {
    expect(classifyByBaseCode('196', '19')).toBe('ceasefire_violation');
  });

  it('returns mass_violence for base code 200', () => {
    expect(classifyByBaseCode('200', '20')).toBe('mass_violence');
  });

  it('returns mass_violence for base code 202', () => {
    expect(classifyByBaseCode('202', '20')).toBe('mass_violence');
  });

  it('returns wmd for base code 204', () => {
    expect(classifyByBaseCode('204', '20')).toBe('wmd');
  });

  it('falls back to assault for unmapped root 18 codes', () => {
    expect(classifyByBaseCode('187', '18')).toBe('assault');
  });

  it('falls back to ground_combat for unmapped root 19 codes', () => {
    expect(classifyByBaseCode('199', '19')).toBe('ground_combat');
  });

  it('falls back to mass_violence for unmapped root 20 codes', () => {
    expect(classifyByBaseCode('209', '20')).toBe('mass_violence');
  });
});
```

Update `normalizeGdeltEvent` assertions — the valid Iran row (base code 190) should now produce `type: 'ground_combat'` and label `'Tehran, Tehran, Iran: Conventional military force'`:

```typescript
expect(entity.type).toBe('ground_combat');
expect(entity.label).toBe('Tehran, Tehran, Iran: Conventional military force');
expect(entity.data.eventType).toBe('Conventional military force');
```

Update `fetchEvents` integration test assertions:

```typescript
// First event: Iran ground_combat (base code 190)
expect(events[0].type).toBe('ground_combat');

// Second event: Syria bombing (base code 183)
expect(events[1].type).toBe('bombing');
```

Also rename the sample row variables for clarity:

```typescript
const validIranGroundCombatRow = makeGdeltRow(); // base code 190
const validSyriaBombingRow = makeGdeltRow({
  0: '9876543210',
  28: '18',
  26: '183',
  27: '183',
  ...
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/__tests__/gdelt.test.ts`
Expected: FAIL — `classifyByBaseCode` not exported, old assertions don't match.

- [ ] **Step 3: Implement classifyByBaseCode and expanded describeEvent in gdelt.ts**

Replace `classifyByCAMEO` with:

```typescript
import type { ConflictEventType } from '../types.js';

const BASE_CODE_MAP: Record<string, ConflictEventType> = {
  '180': 'assault',
  '181': 'abduction',
  '182': 'assault',
  '183': 'bombing',
  '184': 'assault',
  '185': 'assassination',
  '186': 'assassination',
  '190': 'ground_combat',
  '191': 'blockade',
  '192': 'ground_combat',
  '193': 'ground_combat',
  '194': 'shelling',
  '195': 'airstrike',
  '196': 'ceasefire_violation',
  '200': 'mass_violence',
  '201': 'mass_violence',
  '202': 'mass_violence',
  '203': 'mass_violence',
  '204': 'wmd',
};

const ROOT_FALLBACK: Record<string, ConflictEventType> = {
  '18': 'assault',
  '19': 'ground_combat',
  '20': 'mass_violence',
};

export function classifyByBaseCode(
  eventBaseCode: string,
  eventRootCode: string,
): ConflictEventType {
  return BASE_CODE_MAP[eventBaseCode] ?? ROOT_FALLBACK[eventRootCode] ?? 'assault';
}
```

Replace `describeEvent`:

```typescript
const BASE_CODE_DESCRIPTIONS: Record<string, string> = {
  '180': 'Unconventional violence',
  '181': 'Abduction / hostage-taking',
  '182': 'Physical assault',
  '183': 'Bombing',
  '184': 'Use as human shield',
  '185': 'Assassination attempt',
  '186': 'Assassination',
  '190': 'Conventional military force',
  '191': 'Blockade / movement restriction',
  '192': 'Territorial occupation',
  '193': 'Small arms / light weapons',
  '194': 'Artillery / tank support',
  '195': 'Aerial weapons',
  '196': 'Ceasefire violation',
  '200': 'Unconventional mass violence',
  '201': 'Mass expulsion',
  '202': 'Mass killings',
  '203': 'Ethnic cleansing',
  '204': 'Weapons of mass destruction',
};

function describeEvent(eventBaseCode: string): string {
  return BASE_CODE_DESCRIPTIONS[eventBaseCode] ?? 'Unknown conflict';
}
```

Update `normalizeGdeltEvent` to use `EventBaseCode` (col 27):

```typescript
export function normalizeGdeltEvent(cols: string[], lat: number, lng: number): ConflictEventEntity {
  const eventBaseCode = cols[COL.EventBaseCode];
  const eventRootCode = cols[COL.EventRootCode];
  const eventCode = cols[COL.EventCode];
  const sqlDate = cols[COL.SQLDATE];

  return {
    id: `gdelt-${cols[COL.GLOBALEVENTID]}`,
    type: classifyByBaseCode(eventBaseCode, eventRootCode),
    lat,
    lng,
    timestamp: parseSqlDate(sqlDate),
    label: `${cols[COL.ActionGeo_FullName]}: ${describeEvent(eventBaseCode)}`,
    data: {
      eventType: describeEvent(eventBaseCode),
      subEventType: `CAMEO ${eventCode}`,
      fatalities: 0,
      actor1: cols[COL.Actor1Name] || '',
      actor2: cols[COL.Actor2Name] || '',
      notes: '',
      source: cols[COL.SOURCEURL] ?? '',
      goldsteinScale: parseFloat(cols[COL.GoldsteinScale]) || 0,
      locationName: cols[COL.ActionGeo_FullName] || '',
      cameoCode: eventCode,
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/__tests__/gdelt.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add server/types.ts server/adapters/gdelt.ts server/__tests__/gdelt.test.ts
git commit -m "feat(10): replace drone/missile types with 10 CAMEO-based ConflictEventType categories"
```

---

## Task 3: UI Types — Shared Constants and New Toggles

**Files:**

- Modify: `src/types/ui.ts`

- [ ] **Step 1: Add ConflictEventType import and shared constants to ui.ts**

Add at the top of `src/types/ui.ts`, after the `FlightSource` type:

```typescript
// Re-export for frontend convenience
export type { ConflictEventType } from '../../server/types.js';

import type { ConflictEventType } from '../../server/types.js';

export const CONFLICT_TOGGLE_GROUPS = {
  showAirstrikes: ['airstrike'] as const,
  showGroundCombat: ['ground_combat', 'shelling', 'bombing'] as const,
  showTargeted: ['assassination', 'abduction'] as const,
  showOtherConflict: [
    'assault',
    'blockade',
    'ceasefire_violation',
    'mass_violence',
    'wmd',
  ] as const,
} as const;

export type ConflictToggleKey = keyof typeof CONFLICT_TOGGLE_GROUPS;

// Derived from toggle groups — single source of truth
const CONFLICT_EVENT_TYPES = new Set<string>(Object.values(CONFLICT_TOGGLE_GROUPS).flat());

export function isConflictEventType(type: string): type is ConflictEventType {
  return CONFLICT_EVENT_TYPES.has(type);
}

/** Human-readable labels for each ConflictEventType. Shared across tooltip, detail panel, etc. */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  airstrike: 'Airstrike',
  ground_combat: 'Ground Combat',
  shelling: 'Shelling',
  bombing: 'Bombing',
  assassination: 'Assassination',
  abduction: 'Abduction',
  assault: 'Assault',
  blockade: 'Blockade',
  ceasefire_violation: 'Ceasefire Violation',
  mass_violence: 'Mass Violence',
  wmd: 'WMD',
};
```

- [ ] **Step 2: Replace showDrones/showMissiles/showNews in LayerToggles and UIState**

Update `LayerToggles`:

```typescript
export interface LayerToggles {
  showFlights: boolean;
  showShips: boolean;
  showAirstrikes: boolean;
  showGroundCombat: boolean;
  showTargeted: boolean;
  showOtherConflict: boolean;
  showGroundTraffic: boolean;
  pulseEnabled: boolean;
}

export const LAYER_TOGGLE_DEFAULTS: LayerToggles = {
  showFlights: true,
  showShips: true,
  showAirstrikes: true,
  showGroundCombat: true,
  showTargeted: true,
  showOtherConflict: true,
  showGroundTraffic: false,
  pulseEnabled: true,
};
```

Update `UIState` — remove `toggleDrones`, `toggleMissiles`, `toggleNews`; add `toggleAirstrikes`, `toggleGroundCombat`, `toggleTargeted`, `toggleOtherConflict`:

```typescript
export interface UIState {
  isDetailPanelOpen: boolean;
  isStatusCollapsed: boolean;
  isCountersCollapsed: boolean;
  isLayersCollapsed: boolean;
  pulseEnabled: boolean;
  showGroundTraffic: boolean;
  showFlights: boolean;
  showShips: boolean;
  showAirstrikes: boolean;
  showGroundCombat: boolean;
  showTargeted: boolean;
  showOtherConflict: boolean;
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  openDetailPanel: () => void;
  closeDetailPanel: () => void;
  toggleStatus: () => void;
  toggleCounters: () => void;
  toggleLayers: () => void;
  togglePulse: () => void;
  toggleGroundTraffic: () => void;
  toggleFlights: () => void;
  toggleShips: () => void;
  toggleAirstrikes: () => void;
  toggleGroundCombat: () => void;
  toggleTargeted: () => void;
  toggleOtherConflict: () => void;
  selectEntity: (id: string | null) => void;
  hoverEntity: (id: string | null) => void;
}
```

- [ ] **Step 3: Verify TypeScript shows errors only in expected downstream files**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: Errors in uiStore.ts, LayerTogglesSlot.tsx, StatusPanel.tsx, BaseMap.tsx, useEntityLayers.ts — all expected.

---

## Task 4: UI Store — New Toggles + localStorage Migration

**Files:**

- Modify: `src/stores/uiStore.ts`
- Modify: `src/__tests__/uiStore.test.ts`

- [ ] **Step 1: Update uiStore.test.ts**

Replace all `showDrones`/`showMissiles`/`showNews` references with the 4 new toggles. Update `beforeEach` reset states, default tests, toggle action tests, and localStorage persistence tests. Key changes:

- Reset state: `showAirstrikes: true, showGroundCombat: true, showTargeted: true, showOtherConflict: true`
- Default tests: 4 new defaults (all `true`)
- Toggle tests: `toggleAirstrikes`, `toggleGroundCombat`, `toggleTargeted`, `toggleOtherConflict`
- Remove: `showDrones`, `showMissiles`, `showNews` tests
- Add localStorage migration test:

```typescript
it('migrates old showDrones/showMissiles localStorage to full defaults', () => {
  storageMock[STORAGE_KEY] = JSON.stringify({
    showFlights: false,
    showDrones: true,
    showMissiles: false,
  });
  const loaded = loadPersistedToggles();
  // Old schema detected — discard everything, return full defaults
  expect(loaded.showAirstrikes).toBe(true);
  expect(loaded.showGroundCombat).toBe(true);
  expect(loaded.showTargeted).toBe(true);
  expect(loaded.showOtherConflict).toBe(true);
  expect(loaded.showFlights).toBe(true); // defaults, NOT preserved
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/uiStore.test.ts`
Expected: FAIL — store still has old toggle names.

- [ ] **Step 3: Update uiStore.ts**

Replace `showDrones`/`showMissiles`/`showNews` state + toggle actions with:

```typescript
showAirstrikes: initial.showAirstrikes,
showGroundCombat: initial.showGroundCombat,
showTargeted: initial.showTargeted,
showOtherConflict: initial.showOtherConflict,
```

Add toggle actions (same pattern as existing ones):

```typescript
toggleAirstrikes: () => {
  set((s) => ({ showAirstrikes: !s.showAirstrikes }));
  persistToggles(getToggles(get()));
},
toggleGroundCombat: () => {
  set((s) => ({ showGroundCombat: !s.showGroundCombat }));
  persistToggles(getToggles(get()));
},
toggleTargeted: () => {
  set((s) => ({ showTargeted: !s.showTargeted }));
  persistToggles(getToggles(get()));
},
toggleOtherConflict: () => {
  set((s) => ({ showOtherConflict: !s.showOtherConflict }));
  persistToggles(getToggles(get()));
},
```

Remove `toggleDrones`, `toggleMissiles`, `toggleNews` actions.

Update `getToggles` helper to return new keys.

Add localStorage migration in `loadPersistedToggles`:

```typescript
export function loadPersistedToggles(): LayerToggles {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration: discard old schema if it has showDrones/showMissiles/showNews
      if ('showDrones' in parsed || 'showMissiles' in parsed || 'showNews' in parsed) {
        return { ...LAYER_TOGGLE_DEFAULTS };
      }
      return { ...LAYER_TOGGLE_DEFAULTS, ...parsed };
    }
  } catch {
    /* localStorage unavailable or corrupted JSON */
  }
  return { ...LAYER_TOGGLE_DEFAULTS };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/uiStore.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/ui.ts src/stores/uiStore.ts src/__tests__/uiStore.test.ts
git commit -m "feat(10): replace drone/missile/news toggles with 4 CAMEO-based conflict category toggles"
```

---

## Task 5: Layer Constants — Colors, Dot Colors, Icon Sizes

**Files:**

- Modify: `src/components/map/layers/constants.ts`

- [ ] **Step 1: Replace drone/missile entries with 4 conflict category entries**

```typescript
export const ENTITY_COLORS = {
  flight: [234, 179, 8] as const,
  flightUnidentified: [239, 68, 68] as const,
  ship: [156, 163, 175] as const,
  airstrike: [255, 59, 48] as const,
  groundCombat: [239, 68, 68] as const,
  targeted: [139, 30, 30] as const,
  otherConflict: [239, 68, 68] as const,
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
  flight: { meters: 8000, minPixels: 24, maxPixels: 160 },
  ship: { meters: 8000, minPixels: 24, maxPixels: 160 },
  airstrike: { meters: 8000, minPixels: 24, maxPixels: 160 },
  groundCombat: { meters: 8000, minPixels: 24, maxPixels: 160 },
  targeted: { meters: 8000, minPixels: 24, maxPixels: 160 },
  otherConflict: { meters: 8000, minPixels: 24, maxPixels: 160 },
} as const;
```

---

## Task 6: Icon Atlas — New Shapes

**Files:**

- Modify: `src/components/map/layers/icons.ts`

- [ ] **Step 1: Add explosion and crosshair icons**

Add to `ICON_MAPPING`:

```typescript
explosion:      { x: 160, y: 0, width: 32, height: 32, mask: true },
crosshair:      { x: 192, y: 0, width: 32, height: 32, mask: true },
```

Update comment from "5 entity shapes" to "7 entity shapes".

Expand canvas width from 160 to 224.

Add drawing code after the chevronGround icon (Icon 4):

```typescript
// Icon 5 (offset 160): Explosion -- radiating burst (8-point, uneven rays)
ctx.fillStyle = 'white';
ctx.strokeStyle = 'white';
const cx5 = 176;
const cy5 = 16;
ctx.beginPath();
for (let i = 0; i < 16; i++) {
  const angle = (Math.PI / 8) * i - Math.PI / 2;
  const r = i % 2 === 0 ? 14 : 7;
  const x = cx5 + r * Math.cos(angle);
  const y = cy5 + r * Math.sin(angle);
  if (i === 0) ctx.moveTo(x, y);
  else ctx.lineTo(x, y);
}
ctx.closePath();
ctx.fill();

// Icon 6 (offset 192): Crosshair -- targeting reticle
const cx6 = 208;
const cy6 = 16;
ctx.lineWidth = 2;
ctx.lineCap = 'round';
// Circle
ctx.beginPath();
ctx.arc(cx6, cy6, 8, 0, Math.PI * 2);
ctx.stroke();
// Horizontal line
ctx.beginPath();
ctx.moveTo(cx6 - 13, cy6);
ctx.lineTo(cx6 + 13, cy6);
ctx.stroke();
// Vertical line
ctx.beginPath();
ctx.moveTo(cx6, cy6 - 13);
ctx.lineTo(cx6, cy6 + 13);
ctx.stroke();
```

- [ ] **Step 2: Commit constants and icons together**

```bash
git add src/components/map/layers/constants.ts src/components/map/layers/icons.ts
git commit -m "feat(10): add conflict category colors, icon sizes, explosion and crosshair icons"
```

---

## Task 7: useEntityLayers — 4 Conflict Layers

**Files:**

- Modify: `src/hooks/useEntityLayers.ts`
- Modify: `src/__tests__/entityLayers.test.ts`

- [ ] **Step 1: Update entityLayers.test.ts**

Replace all `drone`/`missile` references:

- `mockDroneEvent` → `mockAirstrikeEvent` with `type: 'airstrike'`
- `mockMissileEvent` → `mockGroundCombatEvent` with `type: 'ground_combat'`
- Add `mockTargetedEvent` with `type: 'assassination'` and `mockOtherEvent` with `type: 'blockade'`
- Layer count changes from 6 to 8 (ships, flights, airstrikes, groundCombat, targeted, otherConflict, entity-glow, entity-highlight)
- Layer order test: `['ships', 'flights', 'airstrikes', 'groundCombat', 'targeted', 'otherConflict', 'entity-glow', 'entity-highlight']`
- Replace `showDrones`/`showMissiles` in `beforeEach` and visibility tests with: `showAirstrikes: true, showGroundCombat: true, showTargeted: true, showOtherConflict: true`
- Update visibility toggle tests for each of the 4 new layer IDs
- Update ENTITY_COLORS tests: remove drone/missile, add airstrike/groundCombat/targeted/otherConflict
- Update ICON_SIZE tests: same replacement
- Update ICON_MAPPING test: 7 keys now (add `explosion`, `crosshair`)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/entityLayers.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement useEntityLayers changes**

Replace the `showDrones`/`showMissiles` selectors with:

```typescript
const showAirstrikes = useUIStore((s) => s.showAirstrikes);
const showGroundCombat = useUIStore((s) => s.showGroundCombat);
const showTargeted = useUIStore((s) => s.showTargeted);
const showOtherConflict = useUIStore((s) => s.showOtherConflict);
```

Import `isConflictEventType` and `CONFLICT_TOGGLE_GROUPS` from `@/types/ui`.

Replace the `drones`/`missiles` useMemo with 4 filtered arrays:

```typescript
const airstrikeEvents = useMemo(
  () =>
    events.filter((e) =>
      (CONFLICT_TOGGLE_GROUPS.showAirstrikes as readonly string[]).includes(e.type),
    ),
  [events],
);
const groundCombatEvents = useMemo(
  () =>
    events.filter((e) =>
      (CONFLICT_TOGGLE_GROUPS.showGroundCombat as readonly string[]).includes(e.type),
    ),
  [events],
);
const targetedEvents = useMemo(
  () =>
    events.filter((e) =>
      (CONFLICT_TOGGLE_GROUPS.showTargeted as readonly string[]).includes(e.type),
    ),
  [events],
);
const otherConflictEvents = useMemo(
  () =>
    events.filter((e) =>
      (CONFLICT_TOGGLE_GROUPS.showOtherConflict as readonly string[]).includes(e.type),
    ),
  [events],
);
```

Update `getIconForEntity`:

```typescript
function getIconForEntity(entity: MapEntity): string {
  switch (entity.type) {
    case 'flight':
      return (entity as FlightEntity).data.onGround ? 'chevronGround' : 'chevron';
    case 'ship':
      return 'chevron';
    case 'airstrike':
      return 'starburst';
    case 'ground_combat':
    case 'shelling':
    case 'bombing':
      return 'explosion';
    case 'assassination':
    case 'abduction':
      return 'crosshair';
    default:
      return 'xmark'; // assault, blockade, ceasefire_violation, mass_violence, wmd
  }
}
```

Update `getColorForEntity`:

```typescript
function getColorForEntity(entity: MapEntity): [number, number, number] {
  switch (entity.type) {
    case 'flight':
      return (entity as FlightEntity).data.unidentified
        ? [...ENTITY_COLORS.flightUnidentified]
        : [...ENTITY_COLORS.flight];
    case 'ship':
      return [...ENTITY_COLORS.ship];
    case 'airstrike':
      return [...ENTITY_COLORS.airstrike];
    case 'ground_combat':
    case 'shelling':
    case 'bombing':
      return [...ENTITY_COLORS.groundCombat];
    case 'assassination':
    case 'abduction':
      return [...ENTITY_COLORS.targeted];
    default:
      return [...ENTITY_COLORS.otherConflict];
  }
}
```

Replace the 2 event layers (droneLayer, missileLayer) with 4:

```typescript
const airstrikeLayer = useMemo(
  () =>
    new IconLayer<ConflictEventEntity>({
      id: 'airstrikes',
      visible: showAirstrikes,
      data: airstrikeEvents,
      iconAtlas: getIconAtlas(),
      iconMapping: ICON_MAPPING,
      getIcon: () => 'starburst',
      getPosition: (d) => [d.lng, d.lat],
      getSize: ICON_SIZE.airstrike.meters,
      sizeUnits: 'meters' as const,
      sizeMinPixels: ICON_SIZE.airstrike.minPixels,
      sizeMaxPixels: ICON_SIZE.airstrike.maxPixels,
      getAngle: () => 0,
      getColor: (d) => {
        const [r, g, b] = ENTITY_COLORS.airstrike;
        if (activeId && d.id !== activeId) return [r, g, b, DIM_ALPHA];
        return [r, g, b, 255];
      },
      billboard: false,
      pickable: true,
      updateTriggers: { getColor: [activeId] },
    }),
  [airstrikeEvents, showAirstrikes, activeId],
);

// groundCombatLayer, targetedLayer, otherConflictLayer follow the same pattern
// with their respective icon, color, size, and data
```

Return all 8 layers:

```typescript
return [
  shipLayer,
  flightLayer,
  airstrikeLayer,
  groundCombatLayer,
  targetedLayer,
  otherConflictLayer,
  glowLayer,
  highlightLayer,
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/entityLayers.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEntityLayers.ts src/__tests__/entityLayers.test.ts
git commit -m "feat(10): replace drone/missile layers with 4 CAMEO-based conflict category layers"
```

---

## Task 8: LayerTogglesSlot — New Toggle Rows

**Files:**

- Modify: `src/components/layout/LayerTogglesSlot.tsx`
- Modify: `src/__tests__/LayerToggles.test.tsx`

- [ ] **Step 1: Update LayerToggles.test.tsx**

Update `mockState` — replace `showDrones`/`showMissiles`/`showNews` and their toggle fns with `showAirstrikes`/`showGroundCombat`/`showTargeted`/`showOtherConflict` and `toggleAirstrikes`/`toggleGroundCombat`/`toggleTargeted`/`toggleOtherConflict`.

Update assertions:

- 8 toggle rows (Flights, Ground, Unidentified, Ships, Airstrikes, Ground Combat, Targeted, Other Conflict)
- Order test: `['Flights', 'Ground', 'Unidentified', 'Ships', 'Airstrikes', 'Ground Combat', 'Targeted', 'Other Conflict']`
- Remove News toggle click test; add tests for each new toggle
- Update `isLayersCollapsed` to mockState

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/LayerToggles.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update LayerTogglesSlot.tsx**

Replace the store selectors and toggle rows:

```typescript
const showAirstrikes = useUIStore((s) => s.showAirstrikes);
const showGroundCombat = useUIStore((s) => s.showGroundCombat);
const showTargeted = useUIStore((s) => s.showTargeted);
const showOtherConflict = useUIStore((s) => s.showOtherConflict);

const toggleAirstrikes = useUIStore((s) => s.toggleAirstrikes);
const toggleGroundCombat = useUIStore((s) => s.toggleGroundCombat);
const toggleTargeted = useUIStore((s) => s.toggleTargeted);
const toggleOtherConflict = useUIStore((s) => s.toggleOtherConflict);
```

Replace the Drones/Missiles/News ToggleRows with:

```tsx
<ToggleRow color={ENTITY_DOT_COLORS.airstrikes} label="Airstrikes" active={showAirstrikes} onToggle={toggleAirstrikes} />
<ToggleRow color={ENTITY_DOT_COLORS.groundCombat} label="Ground Combat" active={showGroundCombat} onToggle={toggleGroundCombat} />
<ToggleRow color={ENTITY_DOT_COLORS.targeted} label="Targeted" active={showTargeted} onToggle={toggleTargeted} />
<ToggleRow color={ENTITY_DOT_COLORS.otherConflict} label="Other Conflict" active={showOtherConflict} onToggle={toggleOtherConflict} />
```

Remove the `showNews`/`toggleNews` selectors.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/LayerToggles.test.tsx`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/LayerTogglesSlot.tsx src/__tests__/LayerToggles.test.tsx
git commit -m "feat(10): update layer toggles with 4 conflict categories replacing drones/missiles/news"
```

---

## Task 9: StatusPanel — Updated Event Counts

**Files:**

- Modify: `src/components/ui/StatusPanel.tsx`
- Modify: `src/__tests__/StatusPanel.test.tsx`

- [ ] **Step 1: Update StatusPanel.test.tsx**

Replace `makeEvent` to accept any `ConflictEventType` instead of `'drone' | 'missile'`. Update test data:

```typescript
import type { ConflictEventType } from '@/types/ui';

function makeEvent(id: string, type: ConflictEventType): ConflictEventEntity {
  return {
    id,
    type,
    lat: 32,
    lng: 51,
    timestamp: Date.now(),
    label: id,
    data: {
      eventType: '',
      subEventType: '',
      fatalities: 0,
      actor1: '',
      actor2: '',
      notes: '',
      source: '',
      goldsteinScale: 0,
      locationName: '',
      cameoCode: '',
    },
  };
}

const airstrikes = [makeEvent('a1', 'airstrike'), makeEvent('a2', 'airstrike')];
const groundCombat = [makeEvent('gc1', 'ground_combat')];
const targeted = [makeEvent('t1', 'assassination')];
const otherConflict = [makeEvent('o1', 'blockade')];
const allEvents = [...airstrikes, ...groundCombat, ...targeted, ...otherConflict];
```

Update `beforeEach`: `showAirstrikes: true, showGroundCombat: true, showTargeted: true, showOtherConflict: true`.

Replace the drone/missile count tests with per-toggle-group tests:

- All toggles ON: shows total event count (5)
- showAirstrikes OFF: shows 3 (groundCombat + targeted + other)
- showGroundCombat OFF: shows 4 (airstrikes + targeted + other)
- All conflict toggles OFF: shows 0

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/StatusPanel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update StatusPanel.tsx**

Replace the `showDrones`/`showMissiles` selectors with:

```typescript
const showAirstrikes = useUIStore((s) => s.showAirstrikes);
const showGroundCombat = useUIStore((s) => s.showGroundCombat);
const showTargeted = useUIStore((s) => s.showTargeted);
const showOtherConflict = useUIStore((s) => s.showOtherConflict);
```

Import `CONFLICT_TOGGLE_GROUPS` from `@/types/ui`.

Replace the event count computation:

```typescript
let visibleEvents = 0;
if (showAirstrikes)
  visibleEvents += events.filter((e) =>
    (CONFLICT_TOGGLE_GROUPS.showAirstrikes as readonly string[]).includes(e.type),
  ).length;
if (showGroundCombat)
  visibleEvents += events.filter((e) =>
    (CONFLICT_TOGGLE_GROUPS.showGroundCombat as readonly string[]).includes(e.type),
  ).length;
if (showTargeted)
  visibleEvents += events.filter((e) =>
    (CONFLICT_TOGGLE_GROUPS.showTargeted as readonly string[]).includes(e.type),
  ).length;
if (showOtherConflict)
  visibleEvents += events.filter((e) =>
    (CONFLICT_TOGGLE_GROUPS.showOtherConflict as readonly string[]).includes(e.type),
  ).length;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/StatusPanel.test.tsx`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/StatusPanel.tsx src/__tests__/StatusPanel.test.tsx
git commit -m "feat(10): update StatusPanel event counts for 4 conflict toggle groups"
```

---

## Task 10: BaseMap — Tooltip Gating

**Files:**

- Modify: `src/components/map/BaseMap.tsx`
- Modify: `src/__tests__/BaseMap.test.tsx`

- [ ] **Step 1: Update BaseMap.test.tsx**

Replace `mockDroneEntity` with `mockAirstrikeEntity` (type: `'airstrike'`). Replace `showNews`/`showDrones`/`showMissiles` in `beforeEach` and test setState with new toggles.

Update tooltip gating tests:

- "shows tooltip for airstrike entity when showAirstrikes is ON"
- "hides tooltip for airstrike entity when showAirstrikes is OFF"
- "still shows tooltip for flight entity when showAirstrikes is OFF"

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/BaseMap.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update BaseMap.tsx**

Remove `showNews` selector. Add:

```typescript
import { isConflictEventType, CONFLICT_TOGGLE_GROUPS } from '@/types/ui';

const showAirstrikes = useUIStore((s) => s.showAirstrikes);
const showGroundCombat = useUIStore((s) => s.showGroundCombat);
const showTargeted = useUIStore((s) => s.showTargeted);
const showOtherConflict = useUIStore((s) => s.showOtherConflict);
```

Replace the tooltip gating logic:

```typescript
// Tooltip gating — conflict events only show when their category toggle is ON
function isEntityTooltipVisible(entity: MapEntity): boolean {
  if (!isConflictEventType(entity.type)) return true;
  if ((CONFLICT_TOGGLE_GROUPS.showAirstrikes as readonly string[]).includes(entity.type))
    return showAirstrikes;
  if ((CONFLICT_TOGGLE_GROUPS.showGroundCombat as readonly string[]).includes(entity.type))
    return showGroundCombat;
  if ((CONFLICT_TOGGLE_GROUPS.showTargeted as readonly string[]).includes(entity.type))
    return showTargeted;
  if ((CONFLICT_TOGGLE_GROUPS.showOtherConflict as readonly string[]).includes(entity.type))
    return showOtherConflict;
  return true;
}

const rawTooltipEntity = hover?.entity ?? null;
const tooltipEntity =
  rawTooltipEntity && !isEntityTooltipVisible(rawTooltipEntity) ? null : rawTooltipEntity;
```

Note: `isEntityTooltipVisible` must be declared inside the component body since it reads the toggle state from the closure.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/BaseMap.test.tsx`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/map/BaseMap.tsx src/__tests__/BaseMap.test.tsx
git commit -m "feat(10): replace showNews tooltip gating with per-category conflict toggle gating"
```

---

## Task 11: EntityTooltip — Specific Event Type Labels

**Files:**

- Modify: `src/components/map/EntityTooltip.tsx`

- [ ] **Step 1: Update EntityTooltip.tsx**

Import `isConflictEventType` and `EVENT_TYPE_LABELS` from `@/types/ui`.

Update `EventContent` header:

```typescript
<span style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>
  {EVENT_TYPE_LABELS[entity.type] ?? entity.type}
</span>
```

Update the render condition at the bottom:

```typescript
{isConflictEventType(entity.type) && <EventContent entity={entity as ConflictEventEntity} />}
```

---

## Task 12: DetailPanelSlot — Updated Type Switches

**Files:**

- Modify: `src/components/layout/DetailPanelSlot.tsx`
- Modify: `src/__tests__/DetailPanel.test.tsx`

- [ ] **Step 1: Update DetailPanel.test.tsx**

Replace `mockDrone` (type `'drone'`) with `mockAirstrike` (type `'airstrike'`). Update assertions:

- Header should show `'AIRSTRIKE'` instead of `'DRONE'`
- Event type should still show `'Explosions/Remote violence'` (from `data.eventType`)

- [ ] **Step 2: Update DetailPanelSlot.tsx**

Import `isConflictEventType`, `CONFLICT_TOGGLE_GROUPS` from `@/types/ui`.
Import `ENTITY_DOT_COLORS` stays.

Import `EVENT_TYPE_LABELS` from `@/types/ui`. Update the 3 helper functions:

```typescript
function getDotColor(type: string): string {
  if (type === 'flight') return ENTITY_DOT_COLORS.flights;
  if (type === 'ship') return ENTITY_DOT_COLORS.ships;
  if (isConflictEventType(type)) {
    if ((CONFLICT_TOGGLE_GROUPS.showAirstrikes as readonly string[]).includes(type))
      return ENTITY_DOT_COLORS.airstrikes;
    if ((CONFLICT_TOGGLE_GROUPS.showGroundCombat as readonly string[]).includes(type))
      return ENTITY_DOT_COLORS.groundCombat;
    if ((CONFLICT_TOGGLE_GROUPS.showTargeted as readonly string[]).includes(type))
      return ENTITY_DOT_COLORS.targeted;
    return ENTITY_DOT_COLORS.otherConflict;
  }
  return '#9ca3af';
}

function getTypeLabel(type: string): string {
  if (type === 'flight') return 'FLIGHT';
  if (type === 'ship') return 'SHIP';
  return (EVENT_TYPE_LABELS[type] ?? type).toUpperCase();
}

function getEntityName(entity: { type: string; data: Record<string, unknown> }): string {
  switch (entity.type) {
    case 'flight': {
      const d = entity.data as FlightEntity['data'];
      return d.callsign || d.icao24;
    }
    case 'ship': {
      const d = entity.data as ShipEntity['data'];
      return d.shipName || String(d.mmsi);
    }
    default: {
      if (isConflictEventType(entity.type)) {
        const d = entity.data as ConflictEventEntity['data'];
        return d.eventType;
      }
      return '';
    }
  }
}
```

Update the render condition:

```typescript
{isConflictEventType(entity.type) && (
  <EventDetail entity={entity as ConflictEventEntity} />
)}
```

- [ ] **Step 3: Update EventDetail.tsx**

In `src/components/detail/EventDetail.tsx`, replace the hard-coded drone/missile label:

```typescript
import { EVENT_TYPE_LABELS } from '@/types/ui';
```

Replace line 11:

```typescript
// OLD: const typeLabel = entity.type === 'drone' ? 'Drone' : 'Missile';
const typeLabel = EVENT_TYPE_LABELS[entity.type] ?? entity.type;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/DetailPanel.test.tsx`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/map/EntityTooltip.tsx src/components/layout/DetailPanelSlot.tsx src/components/detail/EventDetail.tsx src/__tests__/DetailPanel.test.tsx
git commit -m "feat(10): update tooltip and detail panel for CAMEO-based event categories"
```

---

## Task 13: Remaining Files — drone/missile References Cleanup

These files still reference `'drone'`/`'missile'`/`'showNews'` and will fail compilation. Update each one:

**Files:**

- Modify: `server/__tests__/types.test.ts`
- Modify: `server/adapters/acled.ts`
- Modify: `server/__tests__/adapters/acled.test.ts`
- Modify: `server/__tests__/security.test.ts`
- Modify: `src/__tests__/eventStore.test.ts`
- Modify: `src/__tests__/useSelectedEntity.test.ts`
- Modify: `src/__tests__/useEventPolling.test.ts`

- [ ] **Step 1: Update server/**tests**/types.test.ts**

Replace `type: 'missile'` → `type: 'ground_combat'` and `type: 'drone'` → `type: 'airstrike'`. Add missing `goldsteinScale`, `locationName`, `cameoCode` fields to the mock data objects. Update EntityType assertion to list new types.

- [ ] **Step 2: Update server/adapters/acled.ts**

Replace the `classifyEventType` return type from `'missile' | 'drone'` to `ConflictEventType`. Import `ConflictEventType` from `../types.js`. Map ACLED event subtypes to appropriate CAMEO-based categories (e.g., `'Air/drone strike'` → `'airstrike'`, `'Shelling/artillery'` → `'shelling'`, etc.).

- [ ] **Step 3: Update server/**tests**/adapters/acled.test.ts**

Update type assertions from `'drone'`/`'missile'` to the new categories matching the updated ACLED adapter mappings.

- [ ] **Step 4: Update server/**tests**/security.test.ts**

Replace mock ACLED data `type: 'missile' as const` with `type: 'ground_combat' as const`. Add missing `goldsteinScale`, `locationName`, `cameoCode` fields.

- [ ] **Step 5: Update src/**tests**/eventStore.test.ts**

Replace `mockDroneEvent` (`type: 'drone'`) with `type: 'airstrike'`. Replace `mockMissileEvent` (`type: 'missile'`) with `type: 'ground_combat'`.

- [ ] **Step 6: Update src/**tests**/useSelectedEntity.test.ts**

Replace mock event `type: 'drone'` with `type: 'airstrike'`.

- [ ] **Step 7: Update src/**tests**/useEventPolling.test.ts**

Replace inline entity `type: 'drone'` with `type: 'airstrike'`.

- [ ] **Step 8: Commit**

```bash
git add server/__tests__/types.test.ts server/adapters/acled.ts server/__tests__/adapters/acled.test.ts server/__tests__/security.test.ts src/__tests__/eventStore.test.ts src/__tests__/useSelectedEntity.test.ts src/__tests__/useEventPolling.test.ts
git commit -m "fix(10): update remaining drone/missile references across tests and acled adapter"
```

---

## Task 14: Final — Full Test Suite + Type Check

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: Clean, no errors.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Fix any remaining failures**

Grep for any surviving references: `grep -r "drone\|missile\|showNews\|showDrones\|showMissiles" --include="*.ts" --include="*.tsx" src/ server/`

Fix anything found.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(10): resolve remaining references from event category reclassification"
```
