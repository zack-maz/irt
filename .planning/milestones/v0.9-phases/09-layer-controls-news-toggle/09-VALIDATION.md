---
phase: 9
slug: layer-controls-news-toggle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                             |
| ---------------------- | --------------------------------------------------------------------------------- |
| **Framework**          | Vitest 3.x with jsdom (frontend), node (server)                                   |
| **Config file**        | `vite.config.ts` (test section)                                                   |
| **Quick run command**  | `npx vitest run src/__tests__/uiStore.test.ts src/__tests__/entityLayers.test.ts` |
| **Full suite command** | `npx vitest run`                                                                  |
| **Estimated runtime**  | ~10 seconds                                                                       |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/uiStore.test.ts src/__tests__/entityLayers.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command                                       | File Exists     | Status     |
| -------- | ---- | ---- | ----------- | --------- | ------------------------------------------------------- | --------------- | ---------- |
| 09-01-01 | 01   | 1    | CTRL-01     | unit      | `npx vitest run src/__tests__/uiStore.test.ts -x`       | Extend existing | ⬜ pending |
| 09-01-02 | 01   | 1    | CTRL-01     | unit      | `npx vitest run src/__tests__/entityLayers.test.ts -x`  | Extend existing | ⬜ pending |
| 09-01-03 | 01   | 1    | CTRL-01     | unit      | `npx vitest run src/__tests__/uiStore.test.ts -x`       | Extend existing | ⬜ pending |
| 09-02-01 | 02   | 2    | CTRL-01     | unit      | `npx vitest run src/__tests__/LayerToggles.test.tsx -x` | ❌ W0           | ⬜ pending |
| 09-02-02 | 02   | 2    | CTRL-04     | unit      | `npx vitest run src/__tests__/entityLayers.test.ts -x`  | Extend existing | ⬜ pending |
| 09-02-03 | 02   | 2    | CTRL-04     | unit      | `npx vitest run server/__tests__/gdelt.test.ts -x`      | Extend existing | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/__tests__/LayerToggles.test.tsx` — stubs for CTRL-01 toggle panel rendering and click behavior
- [ ] Extend `src/__tests__/entityLayers.test.ts` — layer filtering tests for each toggle
- [ ] Extend `src/__tests__/uiStore.test.ts` — new toggle state tests + localStorage persistence
- [ ] Extend `server/__tests__/gdelt.test.ts` — metadata passthrough tests (goldsteinScale, locationName, cameoCode)

_Existing infrastructure covers framework install — Vitest already configured._

---

## Manual-Only Verifications

| Behavior                                   | Requirement | Why Manual                                       | Test Instructions                                                                                |
| ------------------------------------------ | ----------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Tooltip appears on hover over event marker | CTRL-04     | Requires Deck.gl canvas rendering + mouse events | 1. Enable news toggle 2. Hover over a drone/missile marker 3. Verify tooltip with GDELT metadata |
| Opacity dimming on toggle off              | CTRL-01     | Visual CSS verification                          | 1. Click a toggle row 2. Verify row dims to ~40% opacity 3. Verify map layer hides               |
| localStorage survives refresh              | CTRL-01     | Browser persistence test                         | 1. Toggle layers off 2. Refresh page 3. Verify toggles restore                                   |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
