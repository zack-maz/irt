---
slug: reservoirs-missing-after-05
status: awaiting_user_evidence
trigger: "I'm seeing 0 reservoirs and 4 desal plants — DAM_IN_NAME_RE fix applied, /api/water?refresh=true hit, still 0 reservoirs"
created: 2026-04-18T12:42:00Z
updated: 2026-04-18T13:50:00Z
phase: 27.3-water-facility-filtering-improvements
---

## ROUND 2 — regex fix insufficient

H1 (regex too greedy) was partial truth but NOT the full story. User hit /api/water?refresh=true after the `/\bdam\s*$/i` narrowing applied; result unchanged: 0 reservoirs, ~4 desalination. Reopening the session to investigate remaining causes.

### Additional hypotheses tested via code inspection

**H5 (eliminated):** `hasName()` is permissive — accepts any non-empty `name` tag in any script. Persian/Arabic names pass. Not the issue.

**H6 (strong candidate, code-confirmed):** REV-2 `not_notable` gate is `isNotable(tags) || (inPriority && hasName(tags))`. Non-priority named reservoirs without wikidata get rejected. PRIORITY_COUNTRIES includes only Israel, Jordan, Lebanon, Syria, Iraq, Iran, Afghanistan — it **excludes Turkey, Egypt, Saudi Arabia, UAE, Kuwait, Qatar**, which hold the bulk of Middle East reservoirs. Any named Turkish/Egyptian/Saudi reservoir without wikidata gets rejected here.

**H7 (deferred):** Cannot directly inspect raw Overpass response without user help.

**H8 (diagnostic):** DevApiStatus filterStats would definitively pinpoint rejection bucket (raw/filtered/not_notable/low_score/no_city).

**H9 (eliminated):** Client-side filter defaults (filterStore.ts:210-219):

- `enabledWaterTypes`: all three (dam, reservoir, desalination) default ON
- `showWater`: true
- `showHighStress`, `showMediumStress`, `showLowStress`: all true
- `showHealthyWater`, `showAttackedWater`: both true
- `proximityPin`: null
- `waterNameFilter`: empty string
  None of these would default-hide reservoirs.

**H10 (eliminated):** `findNearestCity` range is 150 km and CITY_DATA list has 54 entries including Tabqa, Dukan, Tarbela, Mangla, Kajaki, Aswan, Diyarbakir (Phase 27.3 REV-1 expanded). Most priority-country reservoirs ARE within 150 km of a CITY_DATA city. Iraqi/Iranian/Syrian reservoirs in conflict zones fall near cities.

### Code-trace analysis: where do reservoirs survive?

For a named reservoir in **priority country** (Iran, Iraq, Syria, etc.):

- Score: 15 (name) + 15 (priority) = 30 → passes MIN_NOTABILITY_SCORE=25 ✓
- REV-2: `false || (true && true)` → passes ✓
- no_city: exempt via `isNamedInPriorityCountry = true` ✓
- → **Should survive.**

For a named reservoir in **non-priority country** (Turkey, Egypt, Saudi, UAE, etc.):

- Score: 15 (name only, no priority bonus) → **rejected by low_score** ✗
- OR if it has operator: 15 + 10 = 25 → passes score gate, but REV-2 fails: `false || (false && true)` → **rejected by not_notable** ✗
- OR if it has wikidata: passes REV-2 via isNotable ✓

**Conclusion:** REV-2 is filtering the bulk of non-priority Middle East reservoirs. Any Turkish/Egyptian/Saudi reservoir without an explicit wikidata tag on its OSM element is dropped. The major named reservoirs (Atatürk, Keban, Karakaya, Lake Nasser, Mosul Dam Lake) usually HAVE wikidata, so they should survive. If user sees literally zero, the priority-country exemption may also not be triggering many — which would point at H7 (few raw reservoirs returned by Overpass) or a deployment/cache issue.

## Current Focus

hypothesis: H6+H8 — REV-2 is the dominant rejection path for non-priority reservoirs. Need the user's DevApiStatus filterStats output to confirm which specific rejection bucket is absorbing the reservoirs and whether raw_reservoirs is even non-zero.

test: user pastes the DevApiStatus Water Filters panel output from the live /api/water?refresh=true response. Specifically need:

- `filteredCounts.reservoirs` vs `rawCounts.reservoirs`
- `rejections.not_notable`, `rejections.low_score`, `rejections.no_city`

expecting: if rawCounts.reservoirs is very low (<10), root cause is upstream (Overpass query or bbox). If rawCounts.reservoirs is high (100+) but rejections.not_notable is correspondingly high, root cause is REV-2 and the fix is to expand PRIORITY_COUNTRIES (add Turkey at minimum) or loosen REV-2 to rely on score threshold.

next_action: checkpoint to user — request DevApiStatus Water Filters panel output. Based on the panel contents, apply one of:
(a) Expand PRIORITY_COUNTRIES to include Turkey (and possibly Egypt) — addresses H6 directly.
(b) Loosen REV-2 to `isNotable(tags) || hasName(tags)` — relies on score gate as authoritative.
(c) Investigate raw Overpass response — if raw counts are anomalously low.

## Prepared fixes (pending user evidence)

### Primary fix (if rejections.not_notable is high)

**File:** `server/adapters/overpass-water.ts`
**Line:** 58-66

Expand `PRIORITY_COUNTRIES` to include Turkey. This captures the SE Turkey Kurdish conflict zone's major reservoirs (Atatürk Dam Reservoir, Keban, Karakaya, Birecik, Ilısu/Tigris) which are already scoped to SE Turkey via `isExcludedLocation` (>600 km from Diyarbakir = excluded). Turkey controls Tigris/Euphrates headwaters — directly water-war-relevant.

```ts
const PRIORITY_COUNTRIES = new Set([
  'Israel',
  'Jordan',
  'Lebanon',
  'Syria',
  'Iraq',
  'Iran',
  'Afghanistan',
  'Turkey', // Added: SE Turkey conflict zone, Tigris/Euphrates headwaters
]);
```

### Alternative fix (if rejections.low_score is high)

Loosen REV-2 to `isNotable(tags) || hasName(tags)` — any named reservoir passes REV-2, and MIN_NOTABILITY_SCORE=25 does the final filtering via the holistic score. This is more aligned with the "holistic filter" design goal.

## Evidence

(Previous round evidence retained)

- timestamp: 2026-04-18T12:55:00Z — H1 confirmed via static analysis of `DAM_IN_NAME_RE = /\bdam\b/i` and OSM naming conventions.

  **Regex test against typical OSM reservoir features:**
  | OSM name | `\bdam\b` match | Current classification | Correct classification |
  |---|---|---|---|
  | "Hub Dam" | YES | dam | dam ✓ (intended) |
  | "Atatürk Dam" | YES | dam | dam ✓ (intended) |
  | "Tishrin Dam" (name:en) | YES | dam | dam ✓ (intended) |
  | "Mosul Dam Lake" | **YES** | dam | **reservoir** ✗ |
  | "Tabqa Dam Reservoir" | **YES** | dam | **reservoir** ✗ |
  | "Atatürk Dam Reservoir" | **YES** | dam | **reservoir** ✗ |
  | "Karkheh Dam Reservoir" | **YES** | dam | **reservoir** ✗ |
  | "Dam Lake" (any X Dam Lake) | **YES** | dam | **reservoir** ✗ |
  | "Damascus Reservoir" | NO | reservoir | reservoir ✓ |

  **OSM pattern:** Dams (`waterway=dam`) are typically named "X Dam". The impoundments behind them (`natural=water, water=reservoir` or `landuse=reservoir`) are often named "X Dam Lake", "X Dam Reservoir", or sometimes just "X Lake". The current `/\bdam\b/i` regex catches "Dam" anywhere word-bounded in the name, so **every reservoir whose name contains the associated dam's name gets reclassified to dam**.

- timestamp: 2026-04-18T12:58:00Z — Evidence that this is a Plan 05 regression (not pre-existing):

  Git diff for commit 8f18bc9 (Plan 05) shows `DAM_IN_NAME_RE` was added in that commit. Pre-Plan-05 `classifyWaterType` had no name-based override — reservoirs stayed reservoirs based on OSM tags alone. The Plan 04 UAT feedback was "too little desal, no dams at all" (not "no reservoirs"). Plan 05's only additive filter in `classifyWaterType` is this override.

- timestamp: 2026-04-18T13:02:00Z — Existing tests pin the regex's narrow intent but don't exercise the "Dam Lake"/"Dam Reservoir" suffix patterns that cause the regression.

  None of the existing tests cover "Mosul Dam Lake", "Tabqa Dam Reservoir", "Atatürk Dam Reservoir" — the exact pattern that triggers the regression. Added as regression tests in Round 1.

- timestamp: 2026-04-18T13:05:00Z — H3 (desal count of 4) analysis — out of scope for this debug session. Pre-existing behavior from MIN_NOTABILITY_SCORE=25 gate, not caused by Plan 05.

- timestamp: 2026-04-18T13:45:00Z — Round 2 code trace. Round 1 regex fix is confirmed in place at overpass-water.ts:319 (`/\bdam\s*$/i`). Tests: 77/77 passing. The regex fix is not the blocker for Round 2; the question is why 0 reservoirs survive even with the fix.

  Code path trace (named non-priority reservoir in Turkey/Egypt/Saudi):
  - classifyWaterType: "Atatürk Dam Reservoir" with landuse=reservoir → still 'reservoir' (post-fix) ✓
  - isExcludedLocation for SE Turkey: not excluded ✓
  - isPriorityCountry: Turkey NOT in priority set → false
  - REV-2 gate at line 507-513: `isNotable || (false && hasName)` → requires wikidata to survive
  - If no wikidata: **rejected as not_notable**

  Major dam-associated reservoirs (Atatürk/Keban/Karakaya/Tabqa/Lake Nasser) typically have wikidata in OSM, so they SHOULD survive REV-2 even pre-fix. If user sees zero, two possibilities:
  1. Bulk rejection at REV-2 of smaller named Turkish/Egyptian/Saudi reservoirs.
  2. Deployment/cache issue preventing Round 1 fix from being active.

  DevApiStatus filterStats would disambiguate in one glance.

## Eliminated

- H2 — not the primary driver
- H3 (as a Plan 05 regression) — pre-existing
- H4 — client-side only affects display
- H5 — `hasName` is permissive
- H9 — filterStore defaults are all wide-open
- H10 — findNearestCity has 54 entries including REV-1 dam-adjacent cities; 150 km range

## Root Cause (Round 1)

**File:** `server/adapters/overpass-water.ts`
**Line:** 311 (regex definition), 331 (regex use) — now line 319
**Commit:** 8f18bc9 (Plan 05), fixed in Round 1

The `DAM_IN_NAME_RE = /\bdam\b/i` regex was too broad. Fixed to `/\bdam\s*$/i`.

## Fix (Round 1)

`DAM_IN_NAME_RE = /\bdam\s*$/i` — terminal-anchored. Applied. Tests pass.

## Round 2 status

**Awaiting DevApiStatus filterStats output from user.** Fix prepared (add Turkey to PRIORITY_COUNTRIES) but held until evidence confirms rejection bucket.
