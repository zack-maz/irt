---
phase: 03
slug: api-proxy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vite.config.ts` (test block) |
| **Quick run command** | `npx vitest run server/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run server/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | INFRA-01a | integration | `npx vitest run server/__tests__/server.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | INFRA-01h | unit | `npx vitest run server/__tests__/types.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | INFRA-01b | unit | `npx vitest run server/__tests__/adapters/opensky.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | INFRA-01c | unit | `npx vitest run server/__tests__/adapters/aisstream.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | INFRA-01d | unit | `npx vitest run server/__tests__/adapters/acled.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 2 | INFRA-01e | unit | `npx vitest run server/__tests__/security.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-05 | 02 | 2 | INFRA-01f | integration | `npx vitest run server/__tests__/cors.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-06 | 02 | 2 | INFRA-01g | unit | `npx vitest run server/__tests__/cache.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/__tests__/server.test.ts` — stubs for Express server startup and health check
- [ ] `server/__tests__/types.test.ts` — stubs for MapEntity discriminated union contract
- [ ] `server/__tests__/adapters/opensky.test.ts` — stubs for OpenSky adapter normalization
- [ ] `server/__tests__/adapters/aisstream.test.ts` — stubs for AISStream adapter normalization
- [ ] `server/__tests__/adapters/acled.test.ts` — stubs for ACLED adapter normalization
- [ ] `server/__tests__/security.test.ts` — stubs for API key non-exposure
- [ ] `server/__tests__/cors.test.ts` — stubs for CORS header verification
- [ ] `server/__tests__/cache.test.ts` — stubs for cache staleness behavior
- [ ] Vitest config: server tests need `environment: 'node'` (not jsdom)
- [ ] Test utilities for mocking `fetch()` and `WebSocket` (native APIs)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Server responds to real upstream APIs | INFRA-01 | Requires live API credentials | Start server with `.env`, curl `/api/flights`, verify JSON response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
