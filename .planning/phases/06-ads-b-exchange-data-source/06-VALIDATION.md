---
phase: 6
slug: ads-b-exchange-data-source
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1 with jsdom (frontend), node (server) |
| **Config file** | `vite.config.ts` (test section) |
| **Quick run command** | `npx vitest run server/__tests__/adapters/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run server/__tests__/ src/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DATA-04a | unit | `npx vitest run server/__tests__/adapters/adsb-exchange.test.ts -x` | Wave 0 | pending |
| 06-01-02 | 01 | 1 | DATA-04b | unit | `npx vitest run server/__tests__/adapters/adsb-exchange.test.ts -x` | Wave 0 | pending |
| 06-01-03 | 01 | 1 | DATA-04c | unit | `npx vitest run server/__tests__/adapters/adsb-exchange.test.ts -x` | Wave 0 | pending |
| 06-01-04 | 01 | 1 | DATA-04d | unit | `npx vitest run server/__tests__/routes/flights.test.ts -x` | Wave 0 | pending |
| 06-01-05 | 01 | 1 | DATA-04e | unit | `npx vitest run server/__tests__/routes/flights.test.ts -x` | Wave 0 | pending |
| 06-01-06 | 01 | 1 | DATA-04f | unit | `npx vitest run server/__tests__/routes/flights.test.ts -x` | Wave 0 | pending |
| 06-01-07 | 01 | 1 | DATA-04g | integration | `npx vitest run server/__tests__/security.test.ts -x` | Modify existing | pending |
| 06-01-08 | 01 | 1 | DATA-04h | unit | `npx vitest run src/__tests__/flightStore.test.ts -x` | Modify existing | pending |
| 06-01-09 | 01 | 1 | DATA-04i | unit | `npx vitest run src/__tests__/useFlightPolling.test.ts -x` | Modify existing | pending |
| 06-01-10 | 01 | 1 | DATA-04j | unit | `npx vitest run src/__tests__/SourceSelector.test.ts -x` | Wave 0 | pending |
| 06-01-11 | 01 | 1 | DATA-04k | integration | `npx vitest run src/__tests__/useFlightPolling.test.ts -x` | Modify existing | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `server/__tests__/adapters/adsb-exchange.test.ts` — stubs for DATA-04a, DATA-04b, DATA-04c
- [ ] `server/__tests__/routes/flights.test.ts` — stubs for DATA-04d, DATA-04e, DATA-04f
- [ ] `src/__tests__/SourceSelector.test.ts` — stubs for DATA-04j
- [ ] Modify `server/__tests__/security.test.ts` — add ADS-B Exchange API key leak test (DATA-04g)
- [ ] Modify `src/__tests__/flightStore.test.ts` — add rateLimited status tests (DATA-04h)
- [ ] Modify `src/__tests__/useFlightPolling.test.ts` — add source-aware polling tests (DATA-04i, DATA-04k)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Source toggle dropdown renders correctly on map | DATA-04 SC2 | Visual layout over map canvas | Toggle source in UI, verify dropdown appears top-right with chevron |
| Status badge shows correct colors | DATA-04 SC4 | Visual color verification | Verify green/yellow/red/gray dot states match connection status |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
