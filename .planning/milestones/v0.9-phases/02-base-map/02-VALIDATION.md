---
phase: 02
slug: base-map
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                               |
| ---------------------- | --------------------------------------------------- |
| **Framework**          | Vitest 4.1.0 + @testing-library/react 16.3.2        |
| **Config file**        | `vite.config.ts` (test block) + `src/test/setup.ts` |
| **Quick run command**  | `npx vitest run`                                    |
| **Full suite command** | `npx vitest run`                                    |
| **Estimated runtime**  | ~5 seconds                                          |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command                                                | File Exists | Status     |
| -------- | ---- | ---- | ----------- | --------- | ---------------------------------------------------------------- | ----------- | ---------- |
| 02-01-01 | 01   | 1    | MAP-01a     | unit      | `npx vitest run src/__tests__/BaseMap.test.tsx -t "renders"`     | ❌ W0       | ⬜ pending |
| 02-01-02 | 01   | 1    | MAP-01b     | unit      | `npx vitest run src/__tests__/DeckGLOverlay.test.tsx`            | ❌ W0       | ⬜ pending |
| 02-01-03 | 01   | 1    | MAP-01c     | unit      | `npx vitest run src/__tests__/mapStore.test.ts`                  | ❌ W0       | ⬜ pending |
| 02-01-04 | 01   | 1    | MAP-01d     | unit      | `npx vitest run src/__tests__/BaseMap.test.tsx -t "road labels"` | ❌ W0       | ⬜ pending |
| 02-01-05 | 01   | 1    | MAP-01e     | unit      | `npx vitest run src/__tests__/CoordinateReadout.test.tsx`        | ❌ W0       | ⬜ pending |
| 02-01-06 | 01   | 1    | MAP-01f     | unit      | `npx vitest run src/__tests__/MapLoadingScreen.test.tsx`         | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/__tests__/BaseMap.test.tsx` — stubs for MAP-01a, MAP-01d (mock maplibre-gl, test component renders + style customization calls)
- [ ] `src/__tests__/DeckGLOverlay.test.tsx` — stubs for MAP-01b (mock @deck.gl/mapbox, verify useControl called)
- [ ] `src/__tests__/mapStore.test.ts` — stubs for MAP-01c (Zustand store defaults and actions)
- [ ] `src/__tests__/CoordinateReadout.test.tsx` — stubs for MAP-01e (renders lat/lon from store)
- [ ] `src/__tests__/MapLoadingScreen.test.tsx` — stubs for MAP-01f (opacity class based on isLoaded prop)
- [ ] Mock setup: `maplibre-gl` and `@deck.gl/mapbox` must be mocked in jsdom (no WebGL)

---

## Manual-Only Verifications

| Behavior                                                                 | Requirement | Why Manual                                             | Test Instructions                                                                                             |
| ------------------------------------------------------------------------ | ----------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 2.5D map renders with terrain, correct zoom/pitch, pan/zoom/rotate works | MAP-01g     | MapLibre canvas not testable in jsdom (requires WebGL) | Open app in browser, verify map centered on Iran with terrain visible, test pan/zoom/rotate/tilt interactions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
