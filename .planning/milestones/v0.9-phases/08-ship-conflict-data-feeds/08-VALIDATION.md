---
phase: 8
slug: ship-conflict-data-feeds
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                            |
| ---------------------- | ------------------------------------------------ |
| **Framework**          | Vitest 3.x with jsdom (frontend) / node (server) |
| **Config file**        | `vite.config.ts` (test section)                  |
| **Quick run command**  | `npx vitest run --reporter=verbose`              |
| **Full suite command** | `npx vitest run`                                 |
| **Estimated runtime**  | ~15 seconds                                      |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement      | Test Type | Automated Command                                           | File Exists       | Status     |
| -------- | ---- | ---- | ---------------- | --------- | ----------------------------------------------------------- | ----------------- | ---------- |
| 08-01-01 | 01   | 1    | DATA-02          | unit      | `npx vitest run src/__tests__/shipStore.test.ts -x`         | ❌ W0             | ⬜ pending |
| 08-01-02 | 01   | 1    | DATA-02          | unit      | `npx vitest run src/__tests__/useShipPolling.test.ts -x`    | ❌ W0             | ⬜ pending |
| 08-01-03 | 01   | 1    | DATA-03          | unit      | `npx vitest run src/__tests__/eventStore.test.ts -x`        | ❌ W0             | ⬜ pending |
| 08-01-04 | 01   | 1    | DATA-03          | unit      | `npx vitest run src/__tests__/useEventPolling.test.ts -x`   | ❌ W0             | ⬜ pending |
| 08-01-05 | 01   | 1    | DATA-02, DATA-03 | unit      | `npx vitest run src/__tests__/entityLayers.test.ts -x`      | ✅ (needs update) | ⬜ pending |
| 08-02-01 | 02   | 2    | DATA-02, DATA-03 | unit      | `npx vitest run src/__tests__/StatusPanel.test.tsx -x`      | ❌ W0             | ⬜ pending |
| 08-02-02 | 02   | 2    | DATA-02, DATA-03 | unit      | `npx vitest run src/__tests__/AppShell.test.tsx -x`         | ✅ (needs update) | ⬜ pending |
| 08-02-03 | 02   | 2    | DATA-03          | unit      | `npx vitest run server/__tests__/adapters/acled.test.ts -x` | ✅ (needs update) | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/__tests__/shipStore.test.ts` — stubs for DATA-02 (ship store state management)
- [ ] `src/__tests__/useShipPolling.test.ts` — stubs for DATA-02 (polling, visibility, staleness)
- [ ] `src/__tests__/eventStore.test.ts` — stubs for DATA-03 (event store state management)
- [ ] `src/__tests__/useEventPolling.test.ts` — stubs for DATA-03 (polling, no stale clearing)
- [ ] `src/__tests__/StatusPanel.test.tsx` — stubs for UI status panel
- [ ] Update `src/__tests__/entityLayers.test.ts` — update assertions for non-empty ship/event data
- [ ] Update `src/__tests__/AppShell.test.tsx` — verify three polling hooks wired
- [ ] Update `server/__tests__/adapters/acled.test.ts` — verify multi-country query

_Existing infrastructure covers test framework — only test files needed._

---

## Manual-Only Verifications

| Behavior                                             | Requirement      | Why Manual                                | Test Instructions                                                         |
| ---------------------------------------------------- | ---------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| Ship diamonds render on map with blue color          | DATA-02          | Visual rendering requires browser + WebGL | Run dev server, verify blue diamonds appear for ships                     |
| Drone/missile markers render on map                  | DATA-03          | Visual rendering requires browser + WebGL | Run dev server, verify red starbursts and X marks appear                  |
| All three data types render simultaneously           | DATA-02, DATA-03 | Multi-source visual integration           | Run dev server with all API keys, verify flights + ships + events coexist |
| Status panel dot colors change with connection state | UI               | Visual state transitions                  | Disconnect API, observe dot color changes                                 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
