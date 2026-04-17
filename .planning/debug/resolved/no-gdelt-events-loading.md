---
status: resolved
trigger: 'No GDELT events loading — /api/events returns empty or very few events'
created: 2026-04-17T09:30:00Z
updated: 2026-04-17T09:30:00Z
resolved_at: 2026-04-17T09:30:00Z
resolution_commit: 293cfbd
---

## Resolution (applied)

- Deleted poisoned `.dev-cache/llm-events.json` (immediate unstick).
- `server/cache/devFileCache.ts` — tightened `isDev` check from `NODE_ENV !== 'production'` to `NODE_ENV === 'development'` (explicit allowlist). Test runs (vitest sets `NODE_ENV=test`) and unset environments no longer hit disk.
- `server/__tests__/routes/events.test.ts` — added `vi.mock('../../cache/devFileCache.js', ...)` stub (mirrors the existing pattern in `water.test.ts:107-110`). Prevents the events-route integration tests from writing fixture events to `.dev-cache/` even if the guard above is ever loosened again.

Verification: `npx vitest run server/__tests__/` = 1155/1155 pass. `.dev-cache/llm-events.json` did NOT reappear after a full test run. `npx tsc --noEmit` clean. Commit `293cfbd`.

Secondary issue flagged for follow-up (not in this session): active LLM runs are returning `enrichedCount: 0` across all batches — likely a response-schema validation or rate-limit issue. Monitor the next dev-server `/api/events` hit after cache clear; if it persists, open a new debug session.

## Symptoms

- **Expected:** `/api/events` returns a healthy stream of GDELT events (LLM-enriched preferred, raw GDELT fallback). Conflict events visible on the map, especially destructive types (airstrike/explosion/targeted/on_ground) near populated areas and water facilities.
- **Actual:** User reports "only seeing 2 events right now... its rebatching" — then shortly after: "No events loading. this isn't gonna work until we figure out why." Event count is effectively zero; downstream features (water attack detection in Phase 27.3 UAT, proximity alerts, notification center) have nothing to react to.
- **Error messages:** Not yet captured — need to check browser devtools Network tab for `/api/events` response + server logs for GDELT fetch / LLM processing errors.
- **Timeline:** Started observing during Phase 27.3 UAT on 2026-04-17. Events were flowing previously (phase 27 was verified earlier this week). Specifically the user mentioned "rebatching" which suggests the LLM pipeline's 15-min cooldown + batch process may be in an abnormal state.
- **Reproduction:** Reload the app; observe the Events counter in StatusPanel/CountersSlot — shows 0 or 2 when there should be many. Hit `/api/events` directly via curl to see the raw response shape.

## Related / prior sessions (diagnosed, may be informative)

- `.planning/debug/event-feed-zero-events.md` (2026-03-17, diagnosed) — Events returning 500 due to invalid ACLED credentials. Since then we moved to GDELT v2 + LLM pipeline, so the fix details are outdated but the investigation pattern (curl → check response → check server logs) applies.
- `.planning/debug/phase27-events-invisible.md` (2026-04-09, diagnosed) — Phase 27 events-not-rendering issue, two root causes identified. Fixes landed in phase 27.
- `.planning/debug/27-uat-round2-issues.md` (2026-04-09, diagnosed) — Tests 6/10/11 of Phase 27 UAT. Fixes landed in 27-07, 27-08, 27-09 gap plans.

## Investigation pointers (from user)

Check these in order:

1. **`/api/events` live response** — curl it directly, inspect shape. Is it returning `{data: [], fetchedAt: ...}` (cache hit with zero events) or 500/error?
2. **LLM pipeline cooldown key** — `events:llm-process-ts` in Redis. Is the 15-min cooldown firing, preventing re-processing?
3. **Redis cache state** — `events:llm` (LLM-enriched preferred) and `events:gdelt` (raw fallback). Are both empty? Stale? Is one populated but the route preferring the empty one?
4. **Backfill cooldown** — `events:backfill-ts` Redis key; 1h cooldown for lazy on-demand backfill. If already triggered recently, the backfill path is gated until the cooldown expires.
5. **GDELT lastupdate.txt availability** — `http://data.gdeltproject.org/gdeltv2/lastupdate.txt`. Is the endpoint returning current timestamps? Could be a GDELT-side outage.
6. **LLM provider credentials** — `.env` Cerebras (`CEREBRAS_API_KEY`) and Groq (`GROQ_API_KEY`). Valid? Hitting TPD quota (Cerebras 1M TPD, Groq 200K TPD)?
7. **Server logs** — tail during a fresh `/api/events` hit. Look for GDELT download errors (timeout, 404 on expected ZIP file), LLM extraction errors (rate limit, invalid response shape), Zod validation failures (response envelope schema changes).
8. **Context:** Phase 27.3 did touch `server/routes/cron-warm.ts` but not `events.ts` — unlikely to be a regression from 27.3, but worth confirming via git log that no recent commits on feature/27.3 touched the events pipeline.

## Current Focus

hypothesis: Dev file cache `.dev-cache/llm-events.json` is polluted with test-fixture events (`llm-enriched-1`, `gdelt-NEW`) written by `vitest` runs; route loads the file, seeds Redis with 2 fake events, sets 15-min LLM cooldown, and serves stale fixtures on every subsequent request.
test: Inspect `.dev-cache/llm-events.json`, confirm it contains test-fixture IDs that match `/api/events` response; git-blame dev cache origin to phase 27.2-quick / 27.3-01; confirm `server/__tests__/routes/events.test.ts` does not mock `devFileCache.js`.
expecting: File contains `id:"llm-enriched-1"` and `id:"gdelt-NEW"` with `source:"https://example.com/article"` — proving test runs wrote to disk.
next_action: Root cause confirmed — delete `.dev-cache/llm-events.json`, clear Redis LLM cache keys, optionally patch tests to mock `devFileCache.js`, and validate fresh LLM run produces real events.

## Evidence

- timestamp: 2026-04-17T16:21:00Z
  source: curl /api/events
  finding: HTTP 200, response has `{stale:true, count:2, ids:["llm-enriched-1","gdelt-NEW"], fetchedAt:null, source:null}`. Both event ids appear ONLY in `server/__tests__/routes/events.test.ts` (lines 592, 814), never in any adapter or fixture outside tests. Events have `source:"https://example.com/article"`, `label:"Baghdad airstrike"` — classic test fixtures.
- timestamp: 2026-04-17T16:22:00Z
  source: ls + head -c on `.dev-cache/llm-events.json`
  finding: File exists (1152 bytes), `savedAt: 2026-04-17T15:27:04.948Z` (~54 min old), contains exactly the 2 test-fixture events returned by the API. The fixtures' `timestamp` fields are `Date.now()` values from the test run, not real GDELT timestamps.
- timestamp: 2026-04-17T16:22:30Z
  source: Grep for `saveDevLLMCache|devFileCache` across server/
  finding: `server/routes/events.ts:478` calls `saveDevLLMCache(llmMerged)` unconditionally when LLM pipeline finishes. `server/__tests__/routes/water.test.ts:107` mocks `devFileCache.js`; `server/__tests__/routes/events.test.ts` does NOT mock it. So the events test hits the real file-writing implementation during its "LLM processing integration" test (describe block at line 590).
- timestamp: 2026-04-17T16:23:00Z
  source: Read `server/cache/devFileCache.ts`
  finding: `isDev = process.env.NODE_ENV !== 'production'` — so vitest runs (NODE_ENV=test/undefined) are treated as dev and write to disk at line 40 (`writeFileSync(LLM_EVENTS_FILE, JSON.stringify(entry))`).
- timestamp: 2026-04-17T16:23:30Z
  source: Read `server/routes/events.ts` (lines 252-283)
  finding: The `/api/events` handler prefers LLM cache (lines 252-255). If Redis LLM cache is empty, it falls to the dev file cache block (lines 258-283), seeds Redis with the loaded file, records an LLM summary, and **calls `recordLLMTimestamp()` (line 279) which sets the 15-min cooldown** — blocking any real LLM run until the cooldown expires. This explains why real events never populate on startup with a poisoned file.
- timestamp: 2026-04-17T16:23:45Z
  source: git log server/cache/devFileCache.ts and events.test.ts
  finding: Dev file cache introduced by `59fcaf3 feat(27.2-quick): local file cache for LLM events in dev mode`, extended to 48h by `a40e002`, and refined in `e6c46ce feat(27.3-01)`. The events test was not updated after these commits to mock the file cache — creating a latent regression where tests pollute dev disk state.
- timestamp: 2026-04-17T16:24:00Z
  source: curl /api/events/llm-status (twice, 15s apart)
  finding: A real LLM run IS currently active: stage=llm-processing, totalGroups=351, newGroups=351, totalBatches=44, completedBatches went 42→43 in 15s, **enrichedCount=0**, errorMessage=null. The pipeline eventually ran because the 15-min LLM cooldown expired after the test-pollution seeded Redis — but it's returning zero enriched events across all completed batches. Secondary issue: every batch returns null (see events.ts:438 "LLM processing returned null" branch). Probable cause: LLM response JSON doesn't match `batchResponseSchema`, or rate limiting silently swallows errors. Not blocking for the primary fix — once the fake events are cleared and the cooldown key is deleted, a fresh run can be observed end-to-end.

## Eliminated

- GDELT upstream outage (response has events, even if fake ones — not a 500). Also lastupdate.txt not required to diagnose.
- Backfill cooldown issue (events:backfill-ts). Not the bottleneck — the LLM cache path short-circuits before backfill is considered.
- LLM credential/quota issue (cannot fully rule out for the secondary enrichedCount=0 issue, but not the cause of the "2 events" symptom — that comes from the disk file cache).
- Client-side filter hiding events. 2 events come from the server itself; no filter involved.
- Recent Phase 27.3 regression to events.ts. Events.ts hasn't changed in the 27.3 commits; regression root is the Phase 27.2-quick dev file cache without a corresponding test-mock update, exposed now because the user ran the test suite.

## Resolution

root_cause: The dev file cache `.dev-cache/llm-events.json` introduced in Phase 27.2-quick (`59fcaf3`) was polluted with 2 test-fixture events (`llm-enriched-1`, `gdelt-NEW`) by the vitest suite in `server/__tests__/routes/events.test.ts`, which does not mock `server/cache/devFileCache.js`. Because `devFileCache.ts` treats any NODE_ENV !== 'production' (including test) as dev, test runs call the real `saveDevLLMCache()` and write fixtures to disk. On subsequent dev-server requests, `events.ts` loads the file, seeds Redis with the fakes, records a synthetic LLM summary, AND sets the 15-min LLM cooldown via `recordLLMTimestamp()` — blocking any real LLM pipeline run until the cooldown naturally expires. The user sees exactly the 2 fixture events, `stale:true`, with `example.com` sources, for up to 48h (the file cache MAX_AGE_MS). A separate, secondary issue — the currently-active LLM run returning enrichedCount=0 across 43+ completed batches — is likely an unrelated LLM response-validation or rate-limit problem but is not the cause of the reported "no events loading" symptom.

fix: [pending — options to be confirmed with user]

verification: [pending]

files_changed: [pending]
