---
phase: 12
slug: analytics-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **Framework**          | Vitest + jsdom                                                                            |
| **Config file**        | `vite.config.ts` (test section)                                                           |
| **Quick run command**  | `npx vitest run src/__tests__/CountersSlot.test.tsx src/__tests__/useCounterData.test.ts` |
| **Full suite command** | `npx vitest run`                                                                          |
| **Estimated runtime**  | ~15 seconds                                                                               |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/CountersSlot.test.tsx src/__tests__/useCounterData.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command                                     | File Exists | Status     |
| -------- | ---- | ---- | ----------- | --------- | ----------------------------------------------------- | ----------- | ---------- |
| 12-01-01 | 01   | 1    | STAT-01     | unit      | `npx vitest run src/__tests__/useCounterData.test.ts` | ❌ W0       | ⬜ pending |
| 12-01-02 | 01   | 1    | STAT-01     | unit      | `npx vitest run src/__tests__/CountersSlot.test.tsx`  | ❌ W0       | ⬜ pending |
| 12-01-03 | 01   | 1    | STAT-01     | unit      | `npx vitest run src/__tests__/CountersSlot.test.tsx`  | ❌ W0       | ⬜ pending |
| 12-01-04 | 01   | 1    | STAT-01     | unit      | `npx vitest run src/__tests__/CountersSlot.test.tsx`  | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/__tests__/useCounterData.test.ts` — stubs for STAT-01 (hook computation logic with mock store data)
- [ ] `src/__tests__/CountersSlot.test.tsx` — stubs for STAT-01 (component rendering, ratio display, delta animation)

_Existing test infrastructure (Vitest + jsdom) covers framework needs._

---

## Manual-Only Verifications

| Behavior                             | Requirement | Why Manual                        | Test Instructions                                                        |
| ------------------------------------ | ----------- | --------------------------------- | ------------------------------------------------------------------------ |
| Delta +N green fade animation timing | STAT-01     | CSS animation visual verification | Trigger store update, observe green "+N" text appears and fades over 3s  |
| Counters visible alongside map       | STAT-01     | Layout/viewport verification      | Open app, verify counters panel visible without navigating away from map |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
