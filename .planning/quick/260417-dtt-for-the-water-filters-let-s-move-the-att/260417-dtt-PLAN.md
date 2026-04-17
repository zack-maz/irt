---
id: 260417-dtt
description: Move water "Attacked" toggle below "Healthy" and change its dot color from orange to black
status: planned
date: 2026-04-17
---

# Quick Task 260417-dtt

## Scope

In the water section of the filter panel:

1. Reorder the two state toggles so "Healthy" comes first and "Attacked" comes second.
2. Change the color dot on the water "Attacked" toggle from the shared orange (`siteAttacked` / `#f97316`) to black (`#000000`).

Only the water filter's attacked dot should change — the Sites section must remain orange.

## Tasks

### Task 1 — Add `waterAttacked` color constant

**File:** `src/components/map/layers/constants.ts`

**Action:** Add `waterAttacked: '#000000'` entry to the `ENTITY_DOT_COLORS` object.

**Verify:** `grep "waterAttacked" src/components/map/layers/constants.ts` returns a match.

**Done:** New constant exported alongside existing dot colors.

### Task 2 — Reorder toggles and swap color

**File:** `src/components/layout/FilterPanelSlot.tsx`

**Action:**

- In the water section toggle block (around line 578-592), swap so the Healthy `SliderToggle` renders first and the Attacked `SliderToggle` renders second.
- Update the comment from `{/* Attacked / Healthy toggles */}` to `{/* Healthy / Attacked toggles */}`.
- Change the Attacked toggle's `color` prop from `ENTITY_DOT_COLORS.siteAttacked` to `ENTITY_DOT_COLORS.waterAttacked`.

**Verify:**

- Healthy toggle appears above Attacked in file order.
- Attacked toggle uses `ENTITY_DOT_COLORS.waterAttacked`.
- The Sites section (around line 511-524) is untouched and still uses `siteAttacked`.

**Done:** File compiles, toggle order matches spec, only the water attacked dot changes color.

## must_haves

- `ENTITY_DOT_COLORS.waterAttacked` exists and equals `'#000000'`.
- Water section toggle order: Healthy → Attacked (top to bottom).
- Water Attacked toggle `color` prop references `waterAttacked`, not `siteAttacked`.
- Sites section toggles and on-map site rendering colors are unchanged.
