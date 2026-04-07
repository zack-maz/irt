---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/REQUIREMENTS.md
autonomous: true
requirements: [CLN-01, CLN-02, CLN-03, CLN-04, CLN-05, CLN-06, CLN-07, CLN-08, CLN-09, CLN-10, CLN-11, CLN-12, CLN-13]

must_haves:
  truths:
    - "REQUIREMENTS.md contains a Production Cleanup section under v1.3 with 13 CLN entries"
    - "All 13 CLN entries (CLN-01..CLN-13) are marked complete (checked)"
    - "Each CLN ID matches the ID referenced in a Phase 26.3 PLAN.md requirements frontmatter field"
    - "Traceability table at bottom of REQUIREMENTS.md lists all 13 CLN entries mapped to Phase 26.3"
    - "Coverage count in REQUIREMENTS.md footer reflects 13 new completed v1.3 requirements"
    - "No existing REQUIREMENTS.md content is removed or reordered"
  artifacts:
    - path: ".planning/REQUIREMENTS.md"
      provides: "Requirements traceability with CLN-01..CLN-13 entries added under v1.3 Production Cleanup section"
      contains: "CLN-01"
  key_links:
    - from: ".planning/REQUIREMENTS.md"
      to: ".planning/phases/26.3-production-code-cleanup/26.3-*-PLAN.md"
      via: "CLN requirement IDs referenced in plan frontmatters"
      pattern: "CLN-"
    - from: ".planning/REQUIREMENTS.md Traceability table"
      to: "Phase 26.3"
      via: "Phase mapping rows"
      pattern: "Phase 26.3"
---

<objective>
Backfill CLN-01 through CLN-13 requirement entries into REQUIREMENTS.md to close the traceability gap flagged by Phase 26.3 verification.

Purpose: Phase 26.3 (production code cleanup) completed with 6 plans, each declaring `requirements: [CLN-XX, ...]` in its frontmatter. However, REQUIREMENTS.md was never updated with matching CLN entries, breaking the traceability invariant ("every plan requirement ID must exist in REQUIREMENTS.md"). This documentation-only edit restores the invariant by adding a new Production Cleanup section under the v1.3 milestone with all 13 CLN entries already marked complete (since Phase 26.3 shipped).

Output: REQUIREMENTS.md with a new `### Production Cleanup` subsection under `## v1.3 Requirements`, 13 new rows in the Traceability table mapping CLN-01..CLN-13 to Phase 26.3, and updated coverage counts in the footer.
</objective>

<execution_context>
@/Users/zackmaz/.claude/get-shit-done/workflows/execute-plan.md
@/Users/zackmaz/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/phases/26.3-production-code-cleanup/26.3-01-PLAN.md
@.planning/phases/26.3-production-code-cleanup/26.3-02-PLAN.md
@.planning/phases/26.3-production-code-cleanup/26.3-03-PLAN.md
@.planning/phases/26.3-production-code-cleanup/26.3-04-PLAN.md
@.planning/phases/26.3-production-code-cleanup/26.3-05-PLAN.md
@.planning/phases/26.3-production-code-cleanup/26.3-06-PLAN.md
@.planning/phases/26.3-production-code-cleanup/26.3-VERIFICATION.md

<plan_mapping>
<!-- Derived from Phase 26.3 plan frontmatters and objectives -->
Plan 26.3-01 (Wave 1: dead code removal + tsc cleanup) → CLN-01, CLN-13
Plan 26.3-02 (Wave 2: pino structured logging + X-Request-ID) → CLN-02, CLN-03
Plan 26.3-03 (Wave 2: Zod config consolidation + query validation) → CLN-05, CLN-06
Plan 26.3-04 (Wave 3: AppError envelope + compression + graceful shutdown) → CLN-04, CLN-09
Plan 26.3-05 (Wave 4: noUncheckedIndexedAccess + rate limit docs + OpenAPI) → CLN-07, CLN-10, CLN-12
Plan 26.3-06 (Wave 4: vitest coverage + stub cleanup) → CLN-08, CLN-11
</plan_mapping>

<derived_descriptions>
<!-- User-facing descriptions derived from each plan's <objective> and must_haves.truths -->
<!-- All are code-quality/maintainer-perspective requirements (no user-visible UI feature) -->

CLN-01 (Plan 01): Phase 26.2 NLP dead code fully removed from server
  Source: "Remove all Phase 26.2 NLP dead code and clean up unused imports/variables across the server codebase."
  Truths: All Phase 26.2 NLP files deleted; reverted files contain only pre-26.2 code

CLN-02 (Plan 02): Pino structured JSON logging replaces ad-hoc console/log() calls
  Source: "All server log output is structured JSON via pino (no console.log/error in production code)"

CLN-03 (Plan 02): X-Request-ID tracing on every HTTP request and response
  Source: "Every HTTP request gets a unique X-Request-ID header in the response" + "Request ID appears in all log entries for that request"

CLN-04 (Plan 04): Consistent error JSON envelope via AppError class
  Source: "All error responses follow { error, code, statusCode, requestId } shape"
  + "Dev mode includes stack traces, production strips them"

CLN-05 (Plan 03): Zod-validated config with fail-fast startup on missing env vars
  Source: "Single config.ts module exports all env vars and constants" + "All env vars validated at startup via Zod — missing required vars crash the app"

CLN-06 (Plan 03): Zod query validation middleware on all API routes
  Source: "All API route query params go through Zod validation middleware (no raw req.query access)" + "Invalid query params return consistent 400 error with validation details"

CLN-07 (Plan 05): Strict TypeScript with noUncheckedIndexedAccess on server
  Source: "TypeScript compiles with zero errors across both server and app tsconfigs" + "noUncheckedIndexedAccess is enabled in server tsconfig"

CLN-08 (Plan 06): Vitest V8 coverage reporting with threshold gates
  Source: "@vitest/coverage-v8 is installed and configured with 80% line threshold" + "npx vitest run --coverage passes the configured thresholds"

CLN-09 (Plan 04): Graceful SIGTERM shutdown and response compression in local dev
  Source: "API responses are gzip/brotli compressed in local dev mode" + "SIGTERM handler logs shutdown and exits cleanly"

CLN-10 (Plan 05): Rate limiters documented with per-endpoint rationale
  Source: "Rate limiters have documented per-endpoint limits with rationale"

CLN-11 (Plan 06): Zero `it.todo()` stubs in the test suite
  Source: "All it.todo() stubs are removed from the test suite" + "Every remaining test asserts real behavior"

CLN-12 (Plan 05): Hand-written OpenAPI 3.0 spec covering all /api endpoints
  Source: "OpenAPI 3.0 spec exists documenting all /api/* endpoints with request/response schemas"

CLN-13 (Plan 01): Server codebase has zero unused imports/variables (clean tsc)
  Source: "Server TypeScript compiles without unused-import or unused-variable errors" + "All existing tests pass (no regressions from reversion)"
</derived_descriptions>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Production Cleanup section with CLN-01..CLN-13 entries to REQUIREMENTS.md</name>
  <files>.planning/REQUIREMENTS.md</files>
  <action>
    This is a pure documentation edit. Do NOT touch any code, tests, or config files. Three surgical edits to REQUIREMENTS.md only.

    **EDIT 1: Add new `### Production Cleanup` subsection under `## v1.3 Requirements`**

    Find the v1.3 subsection ordering in REQUIREMENTS.md. Current v1.3 order:
    1. Event Quality & OSINT Integration (EQ-01..EQ-09)
    2. Political Boundaries Layer (POL-01..POL-06)
    3. Ethnic Distribution Layer (ETH-01..ETH-08)
    4. Water Stress Layer (WAT-01..WAT-11)
    5. Water Layer Refinements (WR-01..WR-07)
    6. Conflict Geolocation Improvement (NLP-01..SCRIPT-01)

    Insert a new `### Production Cleanup` subsection AFTER Conflict Geolocation Improvement (i.e., after the SCRIPT-01 line) and BEFORE the `## v1.2+ Requirements` header. The new section content:

    ```markdown
    ### Production Cleanup

    - [x] **CLN-01**: Server codebase is free of Phase 26.2 NLP dead code (nlpGeoValidator, titleFetcher, me-cities lexicon, extract-geonames script all deleted; files modified by Phase 26.2 surgically reverted to pre-26.2 state)
    - [x] **CLN-02**: All server logging goes through pino structured JSON logger; zero `console.log`/`console.error`/`console.warn` calls remain in server production code
    - [x] **CLN-03**: Every HTTP request receives a unique X-Request-ID header (accepted from client or generated via crypto.randomUUID) and the ID appears in all log entries for that request via pino-http request-scoped child loggers
    - [x] **CLN-04**: All server error responses follow a consistent `{ error, code, statusCode, requestId }` JSON envelope via an `AppError` class and centralized `errorHandler` middleware; dev mode includes stack traces, production strips them
    - [x] **CLN-05**: `server/config.ts` is the single source of truth for env vars and constants, validated at startup via Zod schema; missing required vars (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) crash the app at module load; `server/constants.ts` is deleted
    - [x] **CLN-06**: All API routes with query parameters use a `validateQuery` Zod middleware; no raw `req.query.X` access remains in route handlers; invalid query params return a consistent 400 error with validation details
    - [x] **CLN-07**: `tsconfig.server.json` has `noUncheckedIndexedAccess: true` enabled; `npx tsc -b` exits 0 with zero errors across both server and app tsconfigs
    - [x] **CLN-08**: `@vitest/coverage-v8` is installed and configured in `vite.config.ts` with v8 provider, text+lcov reporters, and baseline coverage threshold gates; `npx vitest run --coverage` passes configured thresholds
    - [x] **CLN-09**: Server has a SIGTERM graceful shutdown handler (10s force-exit timeout, guarded to local dev only); response compression middleware is active in non-Vercel environments
    - [x] **CLN-10**: All per-endpoint rate limiters in `server/middleware/rateLimit.ts` are JSDoc-documented with rationale (polling cadence, upstream cache TTL, cost profile); deprecated `rateLimitMiddleware` export removed
    - [x] **CLN-11**: Test suite contains zero `it.todo()` / `test.todo()` stubs; every remaining test asserts real behavior
    - [x] **CLN-12**: Hand-written OpenAPI 3.0.3 spec at `server/openapi.yaml` documents all 14 `/api/*` endpoints with request/response schemas, consistent error responses, and the `CacheResponse<T>` wrapper shape
    - [x] **CLN-13**: Server TypeScript compiles with zero unused-import or unused-variable warnings; dead code from deleted Phase 26.2 modules is fully purged from the import graph
    ```

    **EDIT 2: Append 13 rows to the Traceability table**

    Find the existing Traceability table (starts with `| Requirement | Phase | Status |`). Append the following rows AFTER the last SCRIPT-01 row and BEFORE the `**Coverage:**` footer section:

    ```markdown
    | CLN-01 | Phase 26.3 | Complete |
    | CLN-02 | Phase 26.3 | Complete |
    | CLN-03 | Phase 26.3 | Complete |
    | CLN-04 | Phase 26.3 | Complete |
    | CLN-05 | Phase 26.3 | Complete |
    | CLN-06 | Phase 26.3 | Complete |
    | CLN-07 | Phase 26.3 | Complete |
    | CLN-08 | Phase 26.3 | Complete |
    | CLN-09 | Phase 26.3 | Complete |
    | CLN-10 | Phase 26.3 | Complete |
    | CLN-11 | Phase 26.3 | Complete |
    | CLN-12 | Phase 26.3 | Complete |
    | CLN-13 | Phase 26.3 | Complete |
    ```

    **EDIT 3: Update Coverage footer counts**

    The current footer reads:
    ```
    **Coverage:**
    - v1.1 requirements: 29 total, 29 complete
    - v1.2 requirements: 5 total, 5 complete
    - v1.3 requirements: 53 total, 0 complete
    - Total: 87 mapped, 34 complete
    ```

    Update the v1.3 line to reflect 13 new complete CLN requirements and the total to include them:
    ```
    **Coverage:**
    - v1.1 requirements: 29 total, 29 complete
    - v1.2 requirements: 5 total, 5 complete
    - v1.3 requirements: 66 total, 13 complete
    - Total: 100 mapped, 47 complete
    ```

    Rationale for the math: 53 (previous v1.3 total) + 13 (new CLN entries) = 66. Previous v1.3 complete was 0; now 13 CLN entries are complete = 13. Previous total mapped 87 + 13 = 100. Previous total complete 34 + 13 = 47. NOTE: Other v1.3 requirements (EQ-*, POL-*, ETH-*, WAT-*, WR-*, NLP-*, etc.) remain marked "Planned" in the traceability table even though they are checked in the section body — do NOT "fix" those as part of this task; the coverage footer counts traceability-table status, not section checkboxes, and keeping this edit scoped to CLN-* only avoids scope creep.

    Also update the `*Last updated:*` line at the bottom to reflect this edit:
    ```
    *Last updated: 2026-04-07 -- Phase 26.3 production cleanup requirements (CLN-01..CLN-13) backfilled*
    ```

    **Constraints:**
    - Do NOT modify any existing requirement text, checkboxes, or row ordering outside the three edit points above
    - Do NOT change the wording of existing CLN descriptions once written (they will be referenced by future verification runs)
    - Preserve existing Markdown formatting conventions (`- [x] **ID**: description` pattern, `|` table separators, blank lines between sections)
    - All 13 CLN entries must be marked `[x]` (Phase 26.3 is complete per STATE.md and 26.3-VERIFICATION.md)
  </action>
  <verify>
    <automated>cd /Users/zackmaz/Desktop/my_world && grep -c "^\- \[x\] \*\*CLN-" .planning/REQUIREMENTS.md && grep -c "| CLN-" .planning/REQUIREMENTS.md && grep "v1.3 requirements: 66 total" .planning/REQUIREMENTS.md && grep "### Production Cleanup" .planning/REQUIREMENTS.md</automated>
  </verify>
  <done>
    - `### Production Cleanup` subsection exists under `## v1.3 Requirements` with 13 CLN entries all marked [x]
    - Traceability table has 13 new rows mapping CLN-01..CLN-13 to Phase 26.3 with status "Complete"
    - Coverage footer updated: v1.3 shows 66 total / 13 complete; Total shows 100 mapped / 47 complete
    - `*Last updated:*` line reflects today's CLN backfill edit
    - Verify grep commands all return expected counts (13 CLN section entries, 13 CLN table rows, updated coverage line, section header)
  </done>
</task>

</tasks>

<verification>
1. `grep -c "^\- \[x\] \*\*CLN-" .planning/REQUIREMENTS.md` returns 13 (all 13 section entries)
2. `grep -c "| CLN-" .planning/REQUIREMENTS.md` returns 13 (all 13 traceability rows)
3. `grep "### Production Cleanup" .planning/REQUIREMENTS.md` returns 1 match (new subsection header)
4. `grep "v1.3 requirements: 66 total" .planning/REQUIREMENTS.md` returns 1 match (updated coverage)
5. `grep "Total: 100 mapped" .planning/REQUIREMENTS.md` returns 1 match (updated total)
6. All 13 CLN IDs (CLN-01 through CLN-13) present: `for i in 01 02 03 04 05 06 07 08 09 10 11 12 13; do grep -c "CLN-$i" .planning/REQUIREMENTS.md; done` — each returns >= 2 (section + table)
7. No prior REQUIREMENTS.md content lost: `wc -l .planning/REQUIREMENTS.md` shows >= previous line count (276) + ~35 new lines
</verification>

<success_criteria>
- REQUIREMENTS.md contains a new `### Production Cleanup` subsection under v1.3 with exactly 13 CLN entries, all marked `[x]`
- Each CLN description is user/maintainer-facing and derived from the corresponding Phase 26.3 plan's objective and must_haves.truths
- All 13 CLN IDs match the IDs referenced in the six Phase 26.3 PLAN.md frontmatters (CLN-01, CLN-02, CLN-03, CLN-04, CLN-05, CLN-06, CLN-07, CLN-08, CLN-09, CLN-10, CLN-11, CLN-12, CLN-13)
- Traceability table includes 13 new rows mapping every CLN-NN to Phase 26.3 with status "Complete"
- Coverage footer accurately reflects the 13 new completed v1.3 requirements (66 total / 13 complete; total 100 mapped / 47 complete)
- Zero existing REQUIREMENTS.md content is removed or reordered
- No code, test, or config files are modified — pure docs edit
</success_criteria>

<output>
After completion, create `.planning/quick/1-add-cln-01-cln-13-requirement-entries-to/1-SUMMARY.md` summarizing the edit (file modified, lines added, traceability invariant restored).
</output>
