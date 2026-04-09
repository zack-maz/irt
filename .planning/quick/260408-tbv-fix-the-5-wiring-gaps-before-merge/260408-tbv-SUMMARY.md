---
phase: quick-task
plan: 260408-tbv
subsystem: cross-cutting
tags: [bugfix, integration, resilience, wiring, v1.3-audit-closure]
completed: 2026-04-09T04:28:16Z
duration: '~12 minutes'
branch: feature/26.4-documentation-external-presentation
pr: '#4'
commits:
  - hash: c92bded
    type: fix
    subject: implement WAT-09 stress:high|medium|low search keyword
  - hash: 98116b4
    type: feat
    subject: surface water feed in StatusPanel HUD
  - hash: 3d69cdd
    type: fix
    subject: include water:facilities in /health source rollup
  - hash: ae43663
    type: fix
    subject: use cacheGetSafe in /health and /api/cron/health
  - hash: 4ec581c
    type: fix
    subject: throw AppError(502, UPSTREAM_FAIL) in 5 adapter routes
  - hash: 6a44b7e
    type: test
    subject: mock cacheGetSafe in health.test.ts for Task 4 swap (deviation)
requirements-completed:
  - WAT-09
files-modified:
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
  - server/__tests__/routes/events.test.ts
  - server/__tests__/routes/news.test.ts
  - server/__tests__/routes/weather.test.ts
  - server/__tests__/routes/health.test.ts
tests:
  before: 1277
  after: 1283
  delta: +6 (stress: describe block, 6 new assertions)
decisions:
  - 'mediumStress fixture uses score 6 not 5 because Math.round(4.5)=5 in JS, +1 offset yields 6'
  - 'test file updates for 500→502 status change bundled into Task 5 commit (direct consequence of AppError throw)'
  - 'health.test.ts mock fix (cacheGetSafe export) split into follow-up commit — caused by Task 4 but surfaced in Task 5 verification wave'
---

# Phase quick-task: Fix 5 Wiring Gaps Before PR #4 Merge — Summary

**One-liner:** Closed the 5 v1.3 milestone audit gaps (WAT-09 partial + 4 wiring/resilience minors) on the open PR #4 branch with 6 atomic commits, 14 files modified, 6 new unit tests, and full 1283/1283 test suite green.

## Audit Gap Closure Matrix

| Gap ID                 | Severity                       | Evidence in Plan             | Fix Commit | Verify                                  |
| ---------------------- | ------------------------------ | ---------------------------- | ---------- | --------------------------------------- |
| WAT-09 partial         | **major** (false-complete req) | queryEvaluator.ts:351-358    | `c92bded`  | 6 new stress: tests green               |
| water-statuspanel-hud  | minor                          | StatusPanel.tsx:43-102       | `98116b4`  | 12 StatusPanel tests green              |
| water-health-endpoint  | minor                          | health.ts:7-15 + cron-health | `3d69cdd`  | 514 server tests green                  |
| health-cacheGet-unsafe | minor                          | health.ts:44 + cron-health   | `ae43663`  | 10/10 redis-death chaos tests green     |
| app-error-never-thrown | minor                          | 5 route files                | `4ec581c`  | 514 server tests green (3 test updates) |

**Result:** 5 / 5 gaps closed. The WAT-09 false-complete is now functionally satisfied; the 4 minor wiring gaps close the PRES-24 resilience + CLN-04 envelope contracts that were half-realized.

## Per-Task Execution

### Task 1: WAT-09 stress:high|medium|low keyword (`c92bded`)

- Added string branch (high=1-3, medium=4-6, low=7-10) before numeric parse in `case 'stress':`, mirroring the `case 'severity':` pattern
- Added 6 unit tests covering high/medium/low matching, numeric backwards-compat, non-water entity rejection, unknown string rejection
- **One test fixture correction:** the plan's mediumStress fixture at compositeHealth 0.5 yields score 6 (not 5), because `Math.round(4.5)` rounds to 5 in JavaScript and then the `+1` offset lands on 6. Updated the test comment + the numeric assertion to use `'6'`. This is a score-math correction, not a deviation from the plan's intent — the three string-branch tests (`stress:high`, `stress:medium`, `stress:low`) still map compositeHealth 0.5 to the medium bucket as designed.
- Files: `src/lib/queryEvaluator.ts`, `src/lib/queryEvaluator.test.ts`

### Task 2: StatusPanel water FeedLine (`98116b4`)

- Added `useWaterStore` + `useLayerStore` imports
- Added `waterLayerActive`, `waterConnectionStatus`, `waterStatus`, `waterFacilities`, `visibleWater` selectors with `'idle' → 'loading'` coercion matching the existing `siteStatus` pattern
- Added gated `<FeedLine>` for water after the sites row
- Prettier collapsed the JSX into a single line (noted in system reminder) — semantically identical
- Files: `src/components/ui/StatusPanel.tsx`

### Task 3: water:facilities in /health SOURCE_KEYS (`3d69cdd`)

- Added `water: 'water:facilities'` as the 8th entry in both `SOURCE_KEYS` records
- Files: `server/routes/health.ts`, `server/routes/cron-health.ts`

### Task 4: cacheGetSafe in health routes (`ae43663`)

- Swapped `cacheGet` → `cacheGetSafe` imports and call sites in both health.ts and cron-health.ts
- Redis-death chaos test (10 tests) still green, confirming the broader resilience contract now covers health probes
- Files: `server/routes/health.ts`, `server/routes/cron-health.ts`

### Task 5: AppError(502, UPSTREAM_FAIL) in 5 routes (`4ec581c`)

- Added `import { AppError } from '../middleware/errorHandler.js';` to all 5 files
- Replaced `throw err` with `throw new AppError(502, 'UPSTREAM_FAIL', '{adapter} fetch failed: ...')` in:
  - events.ts — `gdelt fetch failed`
  - sites.ts — `overpass fetch failed`
  - news.ts — `news fetch failed`
  - weather.ts — `open-meteo fetch failed`
  - markets.ts — `yahoo-finance fetch failed`
- Skipped `water.ts` per plan guidance (falls through to empty-array response, no throw site)
- **Bundled test updates** into this commit (3 files) because they're direct consequences of the 500→502 behavior change:
  - `events.test.ts` — updated `returns 500 when fetchEvents throws...` → `returns 502 when fetchEvents throws...` + added `body.code === 'UPSTREAM_FAIL'` assertion
  - `news.test.ts` — same pattern for `GDELT failure with no cache returns 502 UPSTREAM_FAIL`
  - `weather.test.ts` — same pattern for `returns 502 UPSTREAM_FAIL when upstream fails and no cache exists`
- Files: `server/routes/events.ts`, `server/routes/sites.ts`, `server/routes/news.ts`, `server/routes/weather.ts`, `server/routes/markets.ts`, plus 3 route test files

### Deviation Commit: health.test.ts cacheGetSafe mock (`6a44b7e`)

- **Root cause:** Task 4 swapped `cacheGet` → `cacheGetSafe` in health.ts, but the unit test at `server/__tests__/routes/health.test.ts` only mocked `cacheGet` in its `vi.mock('../../cache/redis.js', ...)` factory. When the route tried to call `cacheGetSafe`, the mock returned `undefined`, so the test "includes sources object with timestamp numbers" saw `null` instead of the seeded lastFresh values.
- **Why this slipped Task 4's verify gate:** Task 4's plan verification specified only `npx vitest run server/__tests__/resilience/redis-death.test.ts`, which doesn't cover the route-level health.test.ts. The gap was caught by Task 5's broader `npx vitest run server/` gate.
- **Fix:** Added `cacheGetSafe: (...args) => mockCacheGet(...args)` to the mock factory so both functions route through the same mock. Happy-path behavior is identical between cacheGet and cacheGetSafe.
- **Why split into its own commit:** Preserves Task 4's atomic boundary (Task 4 = "swap in health routes") while acknowledging this as a follow-up test cleanup caused by that swap. A single commit bundling both would conflate Task 4's behavior change with a test mock update.
- Files: `server/__tests__/routes/health.test.ts`

## Deviations from Plan

### 1. [Rule 1 - Bug] mediumStress test fixture yields score 6 not 5

- **Found during:** Task 1 verify (first vitest run failed on `stress:5` match against mediumStress)
- **Issue:** Plan comment said `compositeHealth 0.5 → score 5` but the actual math is `Math.round(0.5 * 9) + 1 = Math.round(4.5) + 1 = 5 + 1 = 6`
- **Fix:** Updated both the docstring comment and the numeric backwards-compat test to use `'6'` as the expected score for mediumStress. The three string-branch tests (`stress:high|medium|low`) remain correct — mediumStress at score 6 still falls in the medium bucket (4-6 range), as intended
- **Commit:** `c92bded` (bundled with Task 1 to preserve atomicity)

### 2. [Rule 1 - Bug] 3 route tests asserted the old 500 status code

- **Found during:** Task 5 verify (`npx vitest run server/` showed 4 failures)
- **Issue:** events.test.ts, news.test.ts, weather.test.ts each had one test asserting the legacy `INTERNAL_ERROR/500` envelope that Task 5 intentionally changed to `UPSTREAM_FAIL/502`
- **Fix:** Updated each test to assert `status: 502` + `body.code === 'UPSTREAM_FAIL'`, strengthening the assertions to cover the new discriminated envelope contract
- **Commit:** `4ec581c` (bundled with Task 5's route changes — these are direct consequences of the same behavior change)

### 3. [Rule 1 - Bug] health.test.ts mock only exposed cacheGet

- **Found during:** Task 5 verify (health.test.ts sources-rollup assertion read null)
- **Issue:** Task 4's cacheGet→cacheGetSafe swap broke the sources test because the vi.mock factory only mocked cacheGet. The test had been passing previously because health.ts called cacheGet directly
- **Fix:** Added cacheGetSafe as an alias to the same mockCacheGet function in the mock factory
- **Commit:** `6a44b7e` (separate follow-up commit to keep Task 4's scope atomic — see "Deviation Commit" section above for rationale)

### Planner-Flagged Scope Notes (Confirmed)

- **water.ts skip** — confirmed: `server/routes/water.ts` falls through to an empty-array response in its catch block, no `throw err` site exists. Per plan guidance, intentionally excluded from Task 5
- **AppError signature** — confirmed: `new AppError(statusCode, code, message)`, matches plan and errorHandler.ts:11
- **No new dependencies added** — plan was correct: AppError was already defined, cacheGetSafe was already defined, all fixes use existing infrastructure

## Verification Matrix (Final Pre-Merge Gate)

| Gate                    | Command                                                          | Result                                                                                         |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Lint                    | `npm run lint`                                                   | 0 errors, 20 warnings (baseline)                                                               |
| Format (in-scope files) | `npx prettier --check [14 modified files]`                       | All matched files clean                                                                        |
| Format (tree-wide)      | `npm run format:check`                                           | Pre-existing failures on out-of-scope v0.9 milestone moves and plan .md — see Scope Note below |
| Typecheck               | `npm run typecheck`                                              | 97.05% coverage, type-coverage success                                                         |
| Full test suite         | `npx vitest run`                                                 | **1283 / 1283 passed (101 files)**                                                             |
| Server-only subset      | `npx vitest run server/`                                         | 514 / 514 passed (47 files)                                                                    |
| Redis-death chaos       | `npx vitest run server/__tests__/resilience/redis-death.test.ts` | 10 / 10 passed                                                                                 |
| StatusPanel             | `npx vitest run src/__tests__/StatusPanel.test.tsx`              | 12 / 12 passed                                                                                 |
| queryEvaluator          | `npx vitest run src/lib/queryEvaluator.test.ts`                  | 52 / 52 passed (was 46 before, +6)                                                             |

### Scope Note on format:check

Tree-wide `format:check` fails on files **outside the scope of this task**:

1. `.planning/milestones/v0.9-*` moved files (pre-existing untracked noise per constraints — multiple prior plans deliberately left them alone)
2. `.planning/quick/260408-tbv-.../260408-tbv-PLAN.md` — the new quick-task plan markdown itself; `.prettierignore` covers `.planning/phases/*/quick/**` but not the top-level `.planning/quick/**` directory

These were failing before any of the 5 tasks ran. All 14 files modified by this task (10 in-scope + 4 test files) are prettier-clean and passed through lint-staged on each commit. No action taken on the pre-existing failures per the task constraints.

## Test Delta

- **Before:** 1277 passing across 101 files (v1.3 audit snapshot)
- **After:** 1283 passing across 101 files
- **Net:** +6 new stress: tests (Task 1)
- **Also modified:** 3 existing route tests (events/news/weather) updated from `500` to `502` + `UPSTREAM_FAIL` assertions; 1 mock factory update (health.test.ts). Net test count unchanged for those 4 files.

## Key Files Touched

**Production source (10 files — the 10 from the plan spec):**

- `src/lib/queryEvaluator.ts` — stress: string branch
- `src/lib/queryEvaluator.test.ts` — 6 new stress: tests
- `src/components/ui/StatusPanel.tsx` — water FeedLine + imports + selectors
- `server/routes/health.ts` — water key + cacheGetSafe
- `server/routes/cron-health.ts` — water key + cacheGetSafe
- `server/routes/events.ts` — AppError(502, UPSTREAM_FAIL)
- `server/routes/sites.ts` — AppError(502, UPSTREAM_FAIL)
- `server/routes/news.ts` — AppError(502, UPSTREAM_FAIL)
- `server/routes/weather.ts` — AppError(502, UPSTREAM_FAIL)
- `server/routes/markets.ts` — AppError(502, UPSTREAM_FAIL)

**Test updates (4 files — deviation consequence):**

- `server/__tests__/routes/events.test.ts` — 500 → 502 assertion update
- `server/__tests__/routes/news.test.ts` — 500 → 502 assertion update
- `server/__tests__/routes/weather.test.ts` — 500 → 502 assertion update
- `server/__tests__/routes/health.test.ts` — added cacheGetSafe to mock factory

## What's Next

- Re-run `/gsd-audit-milestone v1.3` — expect `gaps: []` and `status: all_requirements_satisfied`
- Merge PR #4 at user's discretion
- Run `/gsd-complete-milestone v1.3` once PR #4 is merged and the 41 stale traceability rows are flipped (tracked as a separate doc-hygiene pass per audit recommendations 6-9)

## Self-Check: PASSED

### Commit Hash Verification

- `c92bded fix(26.4): implement WAT-09 stress:high|medium|low search keyword` — FOUND
- `98116b4 feat(26.4): surface water feed in StatusPanel HUD` — FOUND
- `3d69cdd fix(26.4): include water:facilities in /health source rollup` — FOUND
- `ae43663 fix(26.4): use cacheGetSafe in /health and /api/cron/health` — FOUND
- `4ec581c fix(26.4): throw AppError(502, UPSTREAM_FAIL) in 5 adapter routes` — FOUND
- `6a44b7e test(26.4): mock cacheGetSafe in health.test.ts for Task 4 swap` — FOUND

### Contract Verification

- `stress:high` matches score 1-3 — **test passing**
- `stress:medium` matches score 4-6 — **test passing**
- `stress:low` matches score 7-10 — **test passing**
- `stress:N` numeric backwards-compat — **test passing**
- StatusPanel water FeedLine present in DOM when `useLayerStore.activeLayers.has('water')` — **StatusPanel tests still green**
- `/health` SOURCE_KEYS includes `water: 'water:facilities'` — **file contents confirmed**
- `/api/cron/health` SOURCE_KEYS includes `water: 'water:facilities'` — **file contents confirmed**
- health.ts imports `cacheGetSafe` — **confirmed**
- cron-health.ts imports `cacheGetSafe` — **confirmed**
- events/sites/news/weather/markets routes import and throw AppError(502, UPSTREAM_FAIL) — **confirmed (all 5 files)**
- water.ts intentionally skipped — **confirmed (no throw site exists)**
- Full test suite 1283/1283 — **confirmed**
- Typecheck clean — **confirmed (97.05% coverage, type-coverage success)**
- Lint 0 errors — **confirmed**
- All 14 modified files prettier-clean — **confirmed via file-scoped prettier --check**

All claims verified. Zero missing items.
