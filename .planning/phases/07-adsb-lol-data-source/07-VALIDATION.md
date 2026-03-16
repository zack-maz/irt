---
phase: 7
slug: adsb-lol-data-source
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 with jsdom (frontend) / node (server) |
| **Config file** | vite.config.ts (test section) |
| **Quick run command** | `npx vitest run server/__tests__/adapters/ -x` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run server/ -x` (server) or `npx vitest run src/ -x` (frontend)
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| DATA-04-norm | 01 | 1 | DATA-04 | unit | `npx vitest run server/__tests__/adapters/adsb-v2-normalize.test.ts -x` | ❌ W0 | ⬜ pending |
| DATA-04-lol-fetch | 01 | 1 | DATA-04 | unit | `npx vitest run server/__tests__/adapters/adsb-lol.test.ts -x` | ❌ W0 | ⬜ pending |
| DATA-04-lol-noauth | 01 | 1 | DATA-04 | unit | `npx vitest run server/__tests__/adapters/adsb-lol.test.ts -x` | ❌ W0 | ⬜ pending |
| DATA-04-lol-429 | 01 | 1 | DATA-04 | unit | `npx vitest run server/__tests__/adapters/adsb-lol.test.ts -x` | ❌ W0 | ⬜ pending |
| DATA-04-route3 | 01 | 1 | DATA-04 | unit | `npx vitest run server/__tests__/routes/flights.test.ts -x` | ✅ modify | ⬜ pending |
| DATA-04-sources | 01 | 1 | DATA-04 | unit | `npx vitest run server/__tests__/routes/sources.test.ts -x` | ❌ W0 | ⬜ pending |
| DATA-04-default | 02 | 2 | DATA-04 | unit | `npx vitest run src/__tests__/flightStore.test.ts -x` | ✅ modify | ⬜ pending |
| DATA-04-poll30 | 02 | 2 | DATA-04 | unit | `npx vitest run src/__tests__/useFlightPolling.test.ts -x` | ✅ modify | ⬜ pending |
| DATA-04-disabled | 02 | 2 | DATA-04 | unit | `npx vitest run src/__tests__/SourceSelector.test.tsx -x` | ✅ modify | ⬜ pending |
| DATA-04-3opts | 02 | 2 | DATA-04 | unit | `npx vitest run src/__tests__/SourceSelector.test.tsx -x` | ✅ modify | ⬜ pending |
| DATA-04-adsb-refactor | 01 | 1 | DATA-04 | unit | `npx vitest run server/__tests__/adapters/adsb-exchange.test.ts -x` | ✅ verify | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/__tests__/adapters/adsb-v2-normalize.test.ts` — stubs for DATA-04-norm (shared normalizer unit tests)
- [ ] `server/__tests__/adapters/adsb-lol.test.ts` — stubs for DATA-04-lol-fetch, DATA-04-lol-noauth, DATA-04-lol-429
- [ ] `server/__tests__/routes/sources.test.ts` — stubs for DATA-04-sources (/api/sources endpoint)
- [ ] Modify `server/__tests__/routes/flights.test.ts` — add adsblol dispatch tests (DATA-04-route3)
- [ ] Modify `server/__tests__/adapters/adsb-exchange.test.ts` — verify still passes after normalizer extraction
- [ ] Modify `src/__tests__/flightStore.test.ts` — update default source assertions (DATA-04-default)
- [ ] Modify `src/__tests__/useFlightPolling.test.ts` — add adsblol 30s polling test (DATA-04-poll30)
- [ ] Modify `src/__tests__/SourceSelector.test.tsx` — add 3-option, disabled-state tests (DATA-04-disabled, DATA-04-3opts)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| adsb.lol returns data in regions with feeder coverage | DATA-04 | Requires live API with actual feeder network | Query London area (51.5, -0.1) via dev server, verify aircraft appear |
| Disabled dropdown items prevent selection | DATA-04 | Visual/interaction behavior | Click disabled source in SourceSelector, verify no source change |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
