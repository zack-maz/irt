---
phase: 1
slug: project-scaffolding-theme
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-13
---

# Phase 1 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                         |
| ---------------------- | ------------------------------------------------------------- |
| **Framework**          | Vitest 3.2.4 + @testing-library/react 16.3.2                  |
| **Config file**        | vite.config.ts (Vitest reads Vite config) or vitest.config.ts |
| **Quick run command**  | `npx vitest run --reporter=verbose`                           |
| **Full suite command** | `npx vitest run && npx tsc --noEmit`                          |
| **Estimated runtime**  | ~5 seconds                                                    |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement      | Test Type    | Automated Command                                                                             | File Exists               | Status  |
| -------- | ---- | ---- | ---------------- | ------------ | --------------------------------------------------------------------------------------------- | ------------------------- | ------- |
| 01-01-01 | 01   | 0    | INFRA-02         | setup        | `npx tsc --noEmit && npx vite build 2>&1 \| tail -5`                                          | N/A                       | pending |
| 01-01-02 | 01   | 0    | INFRA-02-a,b,c,d | wave-0 stubs | `npx vitest run src/__tests__/uiStore.test.ts src/__tests__/theme.test.ts --reporter=verbose` | created in Task 2         | pending |
| 01-01-03 | 01   | 1    | INFRA-02-a       | smoke        | `npx vitest run src/__tests__/App.test.tsx -t "renders"`                                      | created in Task 2 (RED)   | pending |
| 01-01-04 | 01   | 1    | INFRA-02-b       | unit         | `npx vitest run src/__tests__/theme.test.ts -t "theme"`                                       | created in Task 2 (GREEN) | pending |
| 01-01-05 | 01   | 1    | INFRA-02-c       | unit         | `npx vitest run src/__tests__/AppShell.test.tsx -t "layout"`                                  | created in Task 2 (RED)   | pending |
| 01-01-06 | 01   | 1    | INFRA-02-d       | unit         | `npx vitest run src/__tests__/uiStore.test.ts -t "store"`                                     | created in Task 2 (GREEN) | pending |
| 01-01-07 | 01   | 1    | INFRA-02-e       | smoke        | `npx tsc --noEmit`                                                                            | N/A                       | pending |

_Status: pending / green / red / flaky_

---

## Wave 0 Requirements

- [x] Test framework installed in Task 1 (vitest, @testing-library/react, @testing-library/jest-dom, jsdom)
- [x] `src/test/setup.ts` created in Task 1 (jest-dom matchers)
- [x] `src/__tests__/App.test.tsx` created in Task 2 (smoke test stub)
- [x] `src/__tests__/AppShell.test.tsx` created in Task 2 (layout region test stub)
- [x] `src/__tests__/uiStore.test.ts` created in Task 2 (store toggle tests)
- [x] `src/__tests__/theme.test.ts` created in Task 2 (CSS token tests)

All test files are established in Task 2 (Wave 0) before any component implementation begins in Task 3 (Wave 1).

---

## Manual-Only Verifications

| Behavior                     | Requirement        | Why Manual                         | Test Instructions                                                                                  |
| ---------------------------- | ------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Dark theme visual appearance | INFRA-02           | Visual correctness needs human eye | 1. Run `npm run dev` 2. Verify dark background, white text 3. Check accent colors render correctly |
| HMR hot reload works         | Success Criteria 1 | Dev server behavior                | 1. Run `npm run dev` 2. Edit a component 3. Verify change appears without full reload              |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
