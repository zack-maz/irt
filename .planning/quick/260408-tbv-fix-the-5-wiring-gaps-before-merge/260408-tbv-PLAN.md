---
phase: quick-task
plan: 260408-tbv
type: execute
wave: 1
depends_on: []
subsystem: cross-cutting
tags: [bugfix, integration, resilience, wiring]
requires:
  - v1.3-MILESTONE-AUDIT.md gaps identified
  - PR #4 (feature/26.4-documentation-external-presentation) still open
provides:
  - WAT-09 requirement fully satisfied (stress:high|medium|low keyword)
  - Water feed surfaced in StatusPanel HUD
  - Water health key in /health + /api/cron/health
  - Timeout-safe cache reads on health endpoints
  - Discriminated AppError throws across 5 adapter error paths
affects:
  - src/lib/queryEvaluator.ts
  - src/lib/queryEvaluator.test.ts
  - src/components/ui/StatusPanel.tsx
  - server/routes/health.ts
  - server/routes/cron-health.ts
  - server/routes/events.ts
  - server/routes/sites.ts
  - server/routes/news.ts
  - server/routes/weather.ts
  - server/routes/markets.ts
tech-stack:
  additions: []
  patterns:
    - stress keyword: string branch (high|medium|low) before numeric parse, mirroring severity: at queryEvaluator.ts:312-314
    - StatusPanel: FeedLine gated on useLayerStore.activeLayers.has('water') + useWaterStore connectionStatus
    - cacheGetSafe wraps cacheGet with withTimeout(REDIS_OP_TIMEOUT_MS=2000ms) Promise.race — same signature, returns degraded memCache on timeout
    - AppError(statusCode, code, message) canonical signature — confirmed by server/middleware/errorHandler.ts:7-17 and validateResponse.ts:43
  key-files:
    - src/lib/queryEvaluator.ts:301-317 (severity handling template for Task 1)
    - src/stores/layerStore.ts (VisualizationLayerId includes 'water', Set-based activeLayers)
    - src/stores/waterStore.ts (connectionStatus field: connected|stale|error|loading|idle)
    - server/cache/redis.ts:84-112 (cacheGetSafe — drop-in replacement for cacheGet)
    - server/middleware/errorHandler.ts:7-17 (AppError class, constructor is (statusCode, code, message))
requirements-completed:
  - WAT-09 (stress:high|medium|low search keyword — completes the partial from audit)
commit-docs: false

must_haves:
  truths:
    - "Searching stress:high in the search bar matches water facilities with high baseline stress (low health score 1-3)"
    - "Searching stress:medium matches facilities with score 4-6"
    - "Searching stress:low matches facilities with score 7-10 (healthy)"
    - "StatusPanel HUD shows a water feed row when the water layer is toggled on, with colored connection dot"
    - "GET /health response includes water:facilities in the sources object"
    - "GET /health and /api/cron/health use cacheGetSafe so a hung Upstash call times out at 2000ms instead of blocking the full Vercel function budget"
    - "Route adapter errors throw AppError(502, UPSTREAM_FAIL, ...) so the error envelope reports a 502 upstream-fail instead of a generic 500 INTERNAL_ERROR"
    - "All 1277+ existing tests still pass; npm run lint, format:check, typecheck exit 0"
  artifacts:
    - path: "src/lib/queryEvaluator.ts"
      provides: "stress: string branch (high/medium/low) before numeric parse"
    - path: "src/lib/queryEvaluator.test.ts"
      provides: "new describe('stress:') test block covering high/medium/low/numeric cases"
    - path: "src/components/ui/StatusPanel.tsx"
      provides: "Water FeedLine gated on water layer active"
    - path: "server/routes/health.ts"
      provides: "water:facilities SOURCE_KEY + cacheGetSafe swap"
    - path: "server/routes/cron-health.ts"
      provides: "water:facilities SOURCE_KEY + cacheGetSafe swap"
    - path: "server/routes/events.ts"
      provides: "AppError throw on adapter failure when no cache fallback"
    - path: "server/routes/sites.ts"
      provides: "AppError throw on Overpass failure"
    - path: "server/routes/news.ts"
      provides: "AppError throw on GDELT DOC failure"
    - path: "server/routes/weather.ts"
      provides: "AppError throw on Open-Meteo failure"
    - path: "server/routes/markets.ts"
      provides: "AppError throw on Yahoo Finance failure"
  key_links:
    - from: "StatusPanel.tsx FeedLine(water)"
      to: "useWaterStore.connectionStatus + useLayerStore.activeLayers.has('water')"
      via: "Zustand selectors with fallback for 'idle' → 'loading'"
    - from: "health.ts SOURCE_KEYS.water"
      to: "water:facilities Redis cache key written by server/routes/water.ts"
      via: "cacheGetSafe lookup with 999_999_999 logical TTL"
    - from: "events/sites/news/weather/markets route catch blocks"
      to: "errorHandler.ts discrimination on err instanceof AppError"
      via: "throw new AppError(502, 'UPSTREAM_FAIL', `{adapter} fetch failed: ${err.message}`)"
---

<objective>
Close the 5 wiring gaps identified by the v1.3 milestone audit (`.planning/v1.3-MILESTONE-AUDIT.md`) before PR #4 merges. Each fix is small, bounded, and independently verifiable. Total ~50 LOC across 10 files, 5 atomic commits on the existing `feature/26.4-documentation-external-presentation` branch.

Purpose: v1.3 closeout blockers. The audit correctly flagged WAT-09 as falsely satisfied (major) plus 4 minor resilience/observability gaps. Fixing all 5 lets v1.3 archive as `all requirements satisfied` instead of `gaps_found` and keeps the PRES-24 resilience contract whole.

Output: Green tests, clean build, clean lint/format/typecheck, 5 conventional commits on the 26.4 branch, audit gaps closed.
</objective>

<context>
@.planning/v1.3-MILESTONE-AUDIT.md
@.planning/STATE.md
@CLAUDE.md

# Files being modified in this task

@src/lib/queryEvaluator.ts
@src/lib/queryEvaluator.test.ts
@src/components/ui/StatusPanel.tsx
@server/routes/health.ts
@server/routes/cron-health.ts
@server/cache/redis.ts
@server/middleware/errorHandler.ts
@src/stores/waterStore.ts
@src/stores/layerStore.ts

<interfaces>
<!-- Key contracts the executor needs — extracted from the source files. -->
<!-- Do NOT re-explore the codebase. Use these directly. -->

From server/middleware/errorHandler.ts:7-17:

```typescript
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
```

CANONICAL SIGNATURE: `new AppError(statusCode, code, message)`
NOTE: This order (statusCode first) is confirmed in server/middleware/validateResponse.ts:43 and all errorHandler.test.ts usages. Import from '../middleware/errorHandler.js' with the .js extension (NodeNext ESM).

From server/cache/redis.ts:84-112:

```typescript
export async function cacheGetSafe<T>(
  key: string,
  logicalTtlMs: number,
): Promise<CacheResponse<T> | null>;
```

Same signature as cacheGet. Internally wraps cacheGet in withTimeout(REDIS_OP_TIMEOUT_MS=2000). On timeout or error, falls back to memCache with `degraded: true`. Returns null if both miss. Drop-in replacement.

From src/stores/layerStore.ts:

```typescript
export type VisualizationLayerId =
  | 'geographic'
  | 'weather'
  | 'threat'
  | 'political'
  | 'ethnic'
  | 'water';
// Store exposes:  activeLayers: Set<VisualizationLayerId>
```

Selector pattern: `useLayerStore((s) => s.activeLayers.has('water'))`

From src/stores/waterStore.ts:

```typescript
export type WaterConnectionStatus = 'connected' | 'stale' | 'error' | 'loading' | 'idle';
// Store exposes:  connectionStatus: WaterConnectionStatus
```

Note: 'idle' must be coerced to 'loading' for FeedLine display (matches siteStatus pattern in StatusPanel.tsx:51).

From src/lib/queryEvaluator.ts:301-317 (severity: template to mirror for stress:):

```typescript
case 'severity': {
  if (entity.type === 'ship' || entity.type === 'flight' || entity.type === 'site' || entity.type === 'water') return false;
  const score = computeSeverityScore(entity as ConflictEventEntity);
  const v = value.toLowerCase();
  if (v === 'high') return score > 50;
  if (v === 'medium') return score > 15 && score <= 50;
  if (v === 'low') return score <= 15;
  // Numeric comparison
  return matchRange(score, value);
}
```

From src/lib/queryEvaluator.ts:351-358 (current stress: — the site being fixed):

```typescript
case 'stress': {
  if (entity.type !== 'water') return false;
  const wf = entity as unknown as { stress: { compositeHealth: number } };
  const score = Math.max(1, Math.min(10, Math.round(wf.stress.compositeHealth * 9) + 1));
  const n = parseInt(value, 10);
  if (!isNaN(n)) return score === n;
  return false;
}
```

Score semantics: **0-10 ramp where 0 = destroyed (black), 10 = healthy (light blue)**. So HIGH stress = LOW score (1-3). LOW stress (healthy) = HIGH score (7-10).

From src/routes/water error-branch pattern (sites.ts:40-50 — canonical reference shape for the AppError swap):

```typescript
} catch (err) {
  log.error({ err }, 'Overpass error');
  if (cached) {
    res.json({ data: cached.data, stale: true, lastFresh: cached.lastFresh });
  } else {
    throw err; // ← replace with `throw new AppError(502, 'UPSTREAM_FAIL', \`overpass fetch failed: ${(err as Error).message}\`);`
  }
}
```

Note: server/routes/water.ts does NOT throw — it falls through to an empty-array response. Skip water.ts in Task 5.
</interfaces>
</context>

<tasks>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- TASK 1: WAT-09 stress:high|medium|low keyword                    -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<task type="auto" tdd="true">
  <name>Task 1: Fix WAT-09 stress:high|medium|low keyword</name>
  <files>
    src/lib/queryEvaluator.ts
    src/lib/queryEvaluator.test.ts
  </files>

  <behavior>
    Score scale: 1-10, where 1 = extreme stress (destroyed/black) and 10 = healthy (light blue).
    Therefore:
    - stress:high → HIGH stress → LOW score → score between 1 and 3 inclusive
    - stress:medium → MEDIUM stress → MID score → score between 4 and 6 inclusive
    - stress:low → LOW stress (healthy) → HIGH score → score between 7 and 10 inclusive
    - stress:N (numeric 1-10) → exact match (existing behavior preserved)
    - Non-water entity → returns false
    - Unknown string (e.g. stress:foo) → returns false
  </behavior>

  <action>
    **Step 1: Patch src/lib/queryEvaluator.ts**

    Locate the `case 'stress':` block at lines 351-358. Replace the body so the string branch runs BEFORE the numeric parse, mirroring the `case 'severity':` pattern at lines 301-317. The replacement block must be:

    ```typescript
    case 'stress': {
      if (entity.type !== 'water') return false;
      const wf = entity as unknown as { stress: { compositeHealth: number } };
      const score = Math.max(1, Math.min(10, Math.round(wf.stress.compositeHealth * 9) + 1));
      const v = value.toLowerCase();
      // String branch: high = high stress = low score (1-3);
      // medium = mid score (4-6); low = low stress (healthy) = high score (7-10).
      if (v === 'high') return score >= 1 && score <= 3;
      if (v === 'medium') return score >= 4 && score <= 6;
      if (v === 'low') return score >= 7 && score <= 10;
      // Numeric comparison (existing behavior preserved)
      const n = parseInt(value, 10);
      if (!isNaN(n)) return score === n;
      return false;
    }
    ```

    **Step 2: Add tests in src/lib/queryEvaluator.test.ts**

    The test file already has a mock for flights/ships/events/sites but no `mockWater` fixture. Locate an appropriate insertion point — anywhere after the existing `describe('evaluateTag', () => { ... })` blocks is fine. Add a new nested describe block inside `describe('evaluateTag', ...)`:

    ```typescript
    describe('stress:', () => {
      // Build minimal water facility fixtures at three stress levels.
      // compositeHealth is a 0-1 normalized score; the evaluator maps it to a 1-10 integer.
      // score = max(1, min(10, round(compositeHealth * 9) + 1))
      //   compositeHealth 0.0 → score 1 (extreme stress, black)
      //   compositeHealth 0.5 → score 5 (medium)
      //   compositeHealth 1.0 → score 10 (healthy, light blue)
      const makeWater = (compositeHealth: number) =>
        ({
          id: `water-${compositeHealth}`,
          type: 'water',
          lat: 32,
          lng: 52,
          label: 'Test Facility',
          facilityType: 'dam',
          stress: { compositeHealth, bws_score: 0 },
          // Non-water fields are irrelevant for this evaluator path
        }) as unknown as Parameters<typeof evaluateTag>[0];

      const ctx: EvaluationContext = { sites: [], events: [], now: NOW };
      const highStress = makeWater(0.0); // score 1
      const mediumStress = makeWater(0.5); // score 5
      const lowStress = makeWater(1.0); // score 10 (healthy)

      it('stress:high matches facilities with score 1-3', () => {
        expect(evaluateTag(highStress, 'stress', 'high', ctx)).toBe(true);
        expect(evaluateTag(mediumStress, 'stress', 'high', ctx)).toBe(false);
        expect(evaluateTag(lowStress, 'stress', 'high', ctx)).toBe(false);
      });

      it('stress:medium matches facilities with score 4-6', () => {
        expect(evaluateTag(highStress, 'stress', 'medium', ctx)).toBe(false);
        expect(evaluateTag(mediumStress, 'stress', 'medium', ctx)).toBe(true);
        expect(evaluateTag(lowStress, 'stress', 'medium', ctx)).toBe(false);
      });

      it('stress:low matches facilities with score 7-10 (healthy)', () => {
        expect(evaluateTag(highStress, 'stress', 'low', ctx)).toBe(false);
        expect(evaluateTag(mediumStress, 'stress', 'low', ctx)).toBe(false);
        expect(evaluateTag(lowStress, 'stress', 'low', ctx)).toBe(true);
      });

      it('stress:N numeric still works (backwards compatibility)', () => {
        expect(evaluateTag(highStress, 'stress', '1', ctx)).toBe(true);
        expect(evaluateTag(mediumStress, 'stress', '5', ctx)).toBe(true);
        expect(evaluateTag(lowStress, 'stress', '10', ctx)).toBe(true);
        expect(evaluateTag(lowStress, 'stress', '1', ctx)).toBe(false);
      });

      it('stress: on non-water entity returns false', () => {
        expect(evaluateTag(mockFlight, 'stress', 'high', ctx)).toBe(false);
        expect(evaluateTag(mockShip, 'stress', 'medium', ctx)).toBe(false);
        expect(evaluateTag(mockEvent, 'stress', 'low', ctx)).toBe(false);
      });

      it('stress: with unknown string value returns false', () => {
        expect(evaluateTag(mediumStress, 'stress', 'foo', ctx)).toBe(false);
      });
    });
    ```

    If TypeScript complains about the `makeWater` cast (because the `bws_score` / `facilityType` fields on WaterFacility differ slightly from the shape shown), prefer a looser `as unknown as Parameters<typeof evaluateTag>[0]` cast at the call site over importing the full WaterFacility type — the evaluator only reads `entity.type` and `entity.stress.compositeHealth` for this code path. If strict mode blocks the shape entirely, fall back to importing `WaterFacility` from `'../../server/types'` and constructing a fully-typed fixture.

  </action>

  <verify>
    <automated>npx vitest run src/lib/queryEvaluator.test.ts</automated>
    All stress: tests green; no other queryEvaluator tests regress.
  </verify>

  <done>
    - `stress:high`, `stress:medium`, `stress:low` all match correctly against water facilities
    - Numeric `stress:N` (1-10) still works
    - Non-water entities still return false
    - All 6 new tests pass, no existing tests regressed
  </done>

  <commit>
    `fix(26.4): implement WAT-09 stress:high|medium|low search keyword`

    Body:
    Audit found stress: tag only handled numeric 1-10; parseInt('high')
    returned NaN so string values silently failed. Add string branch
    before numeric parse, mirroring severity: pattern. Score 1-3 = high
    stress, 4-6 = medium, 7-10 = low (healthy). Adds 6 unit tests.

    Closes v1.3 audit partial requirement.

  </commit>
</task>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- TASK 2: StatusPanel water FeedLine                                -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 2: Add water FeedLine to StatusPanel HUD</name>
  <files>
    src/components/ui/StatusPanel.tsx
  </files>

  <action>
    **Patch src/components/ui/StatusPanel.tsx**

    **Step 1 — Imports.** Add two new imports alongside the existing Zustand store imports (around lines 2-6):

    ```typescript
    import { useWaterStore } from '@/stores/waterStore';
    import { useLayerStore } from '@/stores/layerStore';
    ```

    **Step 2 — Selectors.** Inside the `StatusPanel()` component body, after the existing status selectors (around line 51, after `siteStatus` is derived), add:

    ```typescript
    const waterLayerActive = useLayerStore((s) => s.activeLayers.has('water'));
    const waterConnectionStatus = useWaterStore((s) => s.connectionStatus);
    const waterStatus: FeedStatus =
      waterConnectionStatus === 'idle' ? 'loading' : waterConnectionStatus;
    const waterFacilities = useWaterStore((s) => s.facilities);
    const visibleWater = waterFacilities.length;
    ```

    Note the 'idle' → 'loading' coercion mirrors the existing `siteStatus` pattern on line 51.

    **Step 3 — Render.** Add a new `<FeedLine>` gated on `waterLayerActive`, placed immediately after the sites FeedLine (currently the last one, around line 97):

    ```tsx
    <FeedLine status={siteStatus} count={visibleSites} label="sites" />
    {waterLayerActive && (
      <FeedLine status={waterStatus} count={visibleWater} label="water" />
    )}
    ```

    **Constraint:** Do NOT change the conditional rendering style for flights/ships/events/sites — they remain unconditionally visible. Only water is gated on the layer toggle, because water is an opt-in visualization layer not wired on mount.

  </action>

  <verify>
    <automated>npx vitest run src/__tests__/StatusPanel.test.tsx</automated>
    Existing StatusPanel tests must still pass (4 FeedLines by default; water appears as 5th only when water layer active).
  </verify>

  <done>
    - Water FeedLine renders when `useLayerStore.activeLayers.has('water')` is true
    - Water FeedLine hidden when water layer off (default state)
    - Status dot color reflects waterStore.connectionStatus
    - Count shows number of cached water facilities
    - Existing StatusPanel tests still green
  </done>

  <commit>
    `feat(26.4): surface water feed in StatusPanel HUD`

    Body:
    Audit flagged water as the only data source with connectionStatus
    but no HUD row. Add FeedLine gated on useLayerStore.activeLayers
    .has('water') — only visible when the water layer is toggled on.
    Follows the existing siteStatus 'idle' → 'loading' coercion pattern.

  </commit>
</task>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- TASK 3: /health water:facilities SOURCE_KEY                       -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 3: Add water:facilities to /health and /api/cron/health SOURCE_KEYS</name>
  <files>
    server/routes/health.ts
    server/routes/cron-health.ts
  </files>

  <action>
    **Both files independently declare their own `SOURCE_KEYS` record** (they do not share a constant). Add the water entry to both.

    **Step 1 — server/routes/health.ts lines 7-15.** The current SOURCE_KEYS is:

    ```typescript
    const SOURCE_KEYS: Record<string, string> = {
      flights: 'flights:adsblol',
      ships: 'ships:ais',
      events: 'events:gdelt',
      news: 'news:gdelt',
      markets: 'markets:yahoo:1d',
      weather: 'weather:open-meteo',
      sites: 'sites:v2',
    };
    ```

    Add `water: 'water:facilities',` as the last entry:

    ```typescript
    const SOURCE_KEYS: Record<string, string> = {
      flights: 'flights:adsblol',
      ships: 'ships:ais',
      events: 'events:gdelt',
      news: 'news:gdelt',
      markets: 'markets:yahoo:1d',
      weather: 'weather:open-meteo',
      sites: 'sites:v2',
      water: 'water:facilities',
    };
    ```

    **Step 2 — server/routes/cron-health.ts lines 10-18.** Apply the identical addition to its own SOURCE_KEYS record.

    **Cache key confirmed:** `water:facilities` is the Redis key written by `server/routes/water.ts` (24h cache). Documented in CLAUDE.md "Cache keys" under Phase 13.

    Do not touch any other code in these files — the `Object.entries(SOURCE_KEYS).map(...)` loop will automatically pick up the new entry.

  </action>

  <verify>
    <automated>npx vitest run server/__tests__/</automated>
    All server tests still pass (no test asserts SOURCE_KEYS shape; the loop is data-driven).
  </verify>

  <done>
    - health.ts SOURCE_KEYS has 8 entries including water:facilities
    - cron-health.ts SOURCE_KEYS has 8 entries including water:facilities
    - GET /health response includes `sources.water` in the JSON payload
    - GET /api/cron/health response includes `sources.water` in the JSON payload
    - No test regressions
  </done>

  <commit>
    `fix(26.4): include water:facilities in /health source rollup`

    Body:
    Audit found water missing from SOURCE_KEYS in both health.ts and
    cron-health.ts. Water has its own Redis cache key (water:facilities,
    24h TTL) written by server/routes/water.ts but was never surfaced
    in the /health sources rollup. Add to both source-of-truth records.

  </commit>
</task>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- TASK 4: cacheGetSafe on health + cron-health                       -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 4: Swap unsafe cacheGet for cacheGetSafe in health routes</name>
  <files>
    server/routes/health.ts
    server/routes/cron-health.ts
  </files>

  <action>
    Both files currently import and call `cacheGet` directly, bypassing the `REDIS_OP_TIMEOUT_MS=2000ms` Promise.race wrapper added by PRES-23. A hung Upstash REST call on the health probe can burn the full Vercel function budget. The chaos test (`server/__tests__/resilience/redis-death.test.ts`) already demonstrated this gap on other routes.

    **Step 1 — server/routes/health.ts**

    Line 2, change the import from:
    ```typescript
    import { redis, cacheGet } from '../cache/redis.js';
    ```
    to:
    ```typescript
    import { redis, cacheGetSafe } from '../cache/redis.js';
    ```

    Line 44, inside the `Object.entries(SOURCE_KEYS).map(...)` body, change:
    ```typescript
    const entry = await cacheGet(key, 999_999_999);
    ```
    to:
    ```typescript
    const entry = await cacheGetSafe(key, 999_999_999);
    ```

    **Step 2 — server/routes/cron-health.ts**

    Line 2, change the import from:
    ```typescript
    import { redis, cacheGet } from '../cache/redis.js';
    ```
    to:
    ```typescript
    import { redis, cacheGetSafe } from '../cache/redis.js';
    ```

    Line 42, inside the `Object.entries(SOURCE_KEYS).map(...)` body, change:
    ```typescript
    const entry = await cacheGet(key, 999_999_999);
    ```
    to:
    ```typescript
    const entry = await cacheGetSafe(key, 999_999_999);
    ```

    **Signature note:** `cacheGetSafe<T>(key, logicalTtlMs)` has the identical signature to `cacheGet<T>(key, logicalTtlMs)` and returns the same `CacheResponse<T> | null` shape. The return value is consumed via `entry?.lastFresh` in both files, which is unchanged. No other code changes needed.

    **Timeout semantics:** On Upstash hang, `cacheGetSafe` falls back to in-memory cache after 2000ms, or returns null if memCache also misses. Either way, the health endpoint responds within bounds instead of blocking indefinitely.

  </action>

  <verify>
    <automated>npx vitest run server/__tests__/resilience/redis-death.test.ts</automated>
    The existing 8-route chaos test still passes; ideally the health endpoint is now covered by the same resilience contract (no 500 under Redis death). If that chaos test already asserts /health returns 200/502/503 under mocked Redis failure, it should now pass with the broader resilience guarantee from the timeout wrapper.
  </verify>

  <done>
    - Both imports point at cacheGetSafe
    - Both call sites use cacheGetSafe
    - Redis-death chaos test still green
    - Hung Upstash call on /health now times out at 2000ms instead of blocking
  </done>

  <commit>
    `fix(26.4): use cacheGetSafe in /health and /api/cron/health`

    Body:
    Audit flagged both health endpoints as using raw cacheGet, bypassing
    the REDIS_OP_TIMEOUT_MS=2000ms Promise.race wrapper added in PRES-23.
    A hung Upstash call on the health probe could block the full Vercel
    function budget. Swap to cacheGetSafe — same signature, same return
    shape, but now falls back to memCache or null on timeout. Closes the
    PRES-24 resilience gap for health endpoints.

  </commit>
</task>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- TASK 5: AppError throws in 5 adapter routes                        -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 5: Throw AppError(502, UPSTREAM_FAIL) in adapter error paths</name>
  <files>
    server/routes/events.ts
    server/routes/sites.ts
    server/routes/news.ts
    server/routes/weather.ts
    server/routes/markets.ts
  </files>

  <action>
    **Scope note:** The audit listed 6 files (`events.ts:173`, `sites.ts:48`, `news.ts:92`, `water.ts:80`, `weather.ts:41`, `markets.ts:71`). Verification of `server/routes/water.ts` shows it does NOT throw in its catch block — it falls through to `sendValidated(res, waterResponseSchema, { data: [], stale: true, lastFresh: 0 })`. **Skip water.ts in this task.** That leaves 5 files.

    **Pattern to apply** (applies identically to all 5 files). In each file:

    1. Add an import for `AppError`:
       ```typescript
       import { AppError } from '../middleware/errorHandler.js';
       ```
       (Place it near the other server-local imports; use the `.js` extension per NodeNext ESM conventions.)

    2. Replace the bare `throw err` in the `else` branch of the cache-fallback catch block with a typed AppError:
       ```typescript
       throw new AppError(502, 'UPSTREAM_FAIL', `{adapter-name} fetch failed: ${(err as Error).message}`);
       ```

    **Per-file adapter names and current throw sites:**

    | File | Adapter name | Current throw |
    | ---- | ------------ | ------------- |
    | server/routes/events.ts | `gdelt` | line ~173, `throw err; // Express 5 catches and forwards to errorHandler` |
    | server/routes/sites.ts | `overpass` | line ~48, `throw err; // Express 5 catches and forwards to errorHandler` |
    | server/routes/news.ts | `news` (GDELT DOC + RSS) | line ~92, `throw err; // Express 5 catches and forwards to errorHandler` |
    | server/routes/weather.ts | `open-meteo` | line ~41, `throw err; // Express catches and forwards to errorHandler` |
    | server/routes/markets.ts | `yahoo-finance` | line ~71, `throw err; // Express catches and forwards to errorHandler` |

    **Example — events.ts line ~173:**

    Before:
    ```typescript
    } else {
      throw err; // Express 5 catches and forwards to errorHandler
    }
    ```

    After:
    ```typescript
    } else {
      throw new AppError(
        502,
        'UPSTREAM_FAIL',
        `gdelt fetch failed: ${(err as Error).message}`,
      );
    }
    ```

    Apply the exact same shape to sites (`overpass fetch failed: ...`), news (`news fetch failed: ...`), weather (`open-meteo fetch failed: ...`), markets (`yahoo-finance fetch failed: ...`).

    **Why 502 UPSTREAM_FAIL:** These are all the "adapter threw AND no cache fallback is available" branches. That's a textbook 502 Bad Gateway — we failed to get a response from an upstream service. `UPSTREAM_FAIL` is a new code string; AppError takes arbitrary strings so no registry update is needed. If the codebase has a canonical code enum elsewhere, prefer that — but a plain grep showed no central error-code registry exists.

    **Preserved semantics:** The existing code flow is untouched — if `cached` is truthy, the route still returns stale data with a 200. AppError only fires in the "no data at all" branch, which was already a 500. The change is 500 → 502 with a discriminated code.

    **Type safety:** `(err as Error).message` is safe because the outer catch block's `err` is typed as `unknown` in strict mode — casting to `Error` for `.message` access is standard across the codebase. If ESLint flags it, use `err instanceof Error ? err.message : String(err)` instead.

  </action>

  <verify>
    <automated>npx vitest run server/ &amp;&amp; npm run typecheck</automated>
    All server tests pass (no test depends on the specific statusCode/code — only the envelope shape). TypeScript happy with the new import and throw expression.
  </verify>

  <done>
    - All 5 routes import AppError from '../middleware/errorHandler.js'
    - All 5 routes throw `new AppError(502, 'UPSTREAM_FAIL', ...)` instead of raw `throw err`
    - Route error envelopes now report `statusCode: 502, code: 'UPSTREAM_FAIL'` instead of `500, INTERNAL_ERROR` when upstream fails with no cache fallback
    - water.ts intentionally skipped (no throw site)
    - Tests pass, typecheck clean
    - CLN-04 "consistent envelope + discriminated codes" contract now fully realized
  </done>

  <commit>
    `fix(26.4): throw AppError(502, UPSTREAM_FAIL) in 5 adapter routes`

    Body:
    Audit found AppError class defined but never instantiated by route
    handlers — every adapter catch block did raw `throw err`, so all
    route-originated errors became INTERNAL_ERROR/500 with no upstream
    discrimination. Replace with AppError(502, 'UPSTREAM_FAIL', ...) in
    events, sites, news, weather, markets. water.ts falls through with
    empty data (no throw site) so is intentionally skipped. Closes CLN-04
    envelope-discrimination gap from the v1.3 audit.

  </commit>
</task>

</tasks>

<verification>
After ALL 5 tasks complete, run the full pre-merge gate:

```bash
npm run lint
npm run format:check
npm run typecheck
npx vitest run
```

**Expected outcome:**

- lint: 0 errors (existing warnings tolerated per Phase 26.4 Plan 01 baseline — ~21 react-refresh warnings)
- format:check: 0 diffs
- typecheck: 0 errors
- vitest: 1277+ tests passing (new total should be 1283 with 6 new stress: tests added in Task 1)

If any gate fails, diagnose and fix before committing remaining tasks — do NOT land broken tasks on top of each other.
</verification>

<success_criteria>

- [ ] Task 1: stress:high|medium|low works; 6 new tests green; WAT-09 fully satisfied
- [ ] Task 2: StatusPanel water FeedLine renders when water layer active; existing StatusPanel tests still green
- [ ] Task 3: /health and /api/cron/health include `sources.water` in response JSON
- [ ] Task 4: Both health endpoints use cacheGetSafe; redis-death chaos test still green
- [ ] Task 5: 5 routes throw AppError(502, UPSTREAM_FAIL, ...); typecheck + tests green
- [ ] All 5 commits land on `feature/26.4-documentation-external-presentation` with conventional prefixes
- [ ] Final pre-merge gate (lint + format:check + typecheck + vitest) exits 0 across the board
- [ ] v1.3 milestone audit gaps section can be re-run and report 0 gaps
- [ ] PR #4 ready to merge
      </success_criteria>

<output>
After completion, create `.planning/quick/260408-tbv-fix-the-5-wiring-gaps-before-merge/260408-tbv-SUMMARY.md` with:
- List of 5 commits (hashes + subjects)
- Files modified (10 files total)
- Test delta (1277 → 1283 expected)
- Audit gap closure table (5 gaps → 5 closed)
- Any unexpected issues encountered during execution
</output>
