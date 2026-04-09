# ADR-0006: Pino structured logging + Zod config/response validation

**Status:** Accepted
**Date:** 2026-04-06 (Phase 26.3), extended 2026-04-07 (Phase 26.4
Plan 03 with redaction and `sendValidated`)
**Deciders:** solo author

## Context

Before Phase 26.3, the server had a custom `log()` wrapper producing
unstructured plain-text log lines. Env vars were split across
`server/config.ts` and `server/constants.ts` with no schema
validation — missing or malformed vars surfaced as mid-request 500s
instead of crashes at boot. Route handlers accessed `req.query`
directly with no type checking or range validation — a `limit=abc`
query would propagate through the adapter and blow up somewhere
downstream.

This was fine for a weekend project, but "portfolio-grade" means the
server must fail loudly and early when misconfigured, must produce
logs suitable for a real observability pipeline, and must validate
inputs at the boundary rather than deep in a handler. Phase 26.3
("Production Code Cleanup") was the dedicated hardening pass to
close these gaps.

Two follow-up forces emerged during Phase 26.4 Plan 03:

1. **Secret leakage in logs** — `pino-http` automatically logs
   `req.headers`, which includes `authorization`, `cookie`,
   `x-api-key`, and `set-cookie`. Adapter errors sometimes included
   sliced environment fragments that could contain `UPSTASH_*` /
   `OPENSKY_*` / `AISSTREAM_*` / `ADSB_*` tokens. An OSINT tool
   that leaks credentials via its own logs is worse than a tool with
   no logging at all.
2. **Drift between OpenAPI spec and actual response shape** — the
   1164-line hand-written `server/openapi.yaml` is the contract, but
   nothing enforced that the implementation actually matches it.
   Zod at the _input_ boundary (`validateQuery`) doesn't catch
   output drift.

## Decision

Use **Pino** as the sole logging mechanism and **Zod** as the
validation layer at both the input _and_ output boundaries of every
server component.

Concretely:

### Pino logging

- `server/lib/logger.ts` — Pino root logger with environment-specific
  transports: `level: 'silent'` in test, `target: 'pino-pretty'` in
  dev, raw JSON in production.
- Module-level child loggers via `logger.child({ module: 'adapters/gdelt' })`
  for adapter and lib files that lack a request context.
- `pino-http` wired into the Express app for request-scoped logs,
  with a custom `genReqId` that accepts a client-provided
  `X-Request-ID` header or generates a UUID via
  `crypto.randomUUID`.
- `autoLogging.ignore` skips the `/health` endpoint to keep log
  volume down.
- **Redaction (Plan 26.4-03).** Exported `redactPaths` constant in
  `server/lib/logger.ts` covers: `authorization`, `cookie`,
  `set-cookie`, `x-api-key` headers; wildcard `*.UPSTASH_*` /
  `*.OPENSKY_*` / `*.AISSTREAM_*` / `*.ADSB_*` token fields;
  production-only `req.ip` / `req.remoteAddress` for PII. Applied
  via `redact: { paths, censor: '[REDACTED]' }` in the Pino
  options. Proven by a write-stream sink test
  (`server/__tests__/lib/logger-redaction.test.ts`) that asserts
  each sensitive path becomes `[REDACTED]` and runs an anti-leak
  `JSON.stringify` check that original secret strings appear
  nowhere in the emitted output.

### Zod validation

- **Env validation** — `envSchema` in `server/config.ts` is a Zod
  schema consumed by `parseEnv()` at module load. Missing required
  vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) crash
  the process immediately with a readable error. Optional vars get
  typed defaults.
- **Query validation** — `validateQuery(schema)` middleware in
  `server/middleware/validate.ts` parses `req.query` through a
  Zod schema and stores the result on `res.locals.validatedQuery`.
  Express 5 made `req.query` a read-only getter, so the validated
  data can't be written back to `req.query` directly.
- **Response validation (Plan 26.4-03)** — `sendValidated<S>(res,
schema, payload)` helper in
  `server/middleware/validateResponse.ts` parses the outgoing
  payload through a Zod schema before `res.json()`. Dev-mode
  mismatch throws `AppError(500, 'RESPONSE_SCHEMA_MISMATCH')`
  caught by `errorHandler`; prod-mode mismatch logs a warn via the
  Pino child logger and sends the payload anyway (fail-open to
  avoid cascading outages from drift). Wired into flights, events,
  and water routes as proof-of-concept (3 of 14 cached routes); the
  remaining 11 are a mechanical follow-up for a future maintenance
  pass. Schemas in `server/schemas/cacheResponse.ts` use
  `cacheResponseSchema<T>(inner)` as a generic wrapper mirroring the
  OpenAPI `allOf` composition for `CacheResponse<T>`, with
  `.passthrough()` on nested entity data fields for drift tolerance.

## Consequences

### Positive

- **JSON-native logs ready for any log aggregator.** Pino's output
  is structured JSON with request IDs, modules, and levels. Point
  it at Vercel log drains, Loki, Datadog, or a local `pino-pretty`
  pipe — the same log lines work everywhere.
- **Crash on missing required env vars at boot.** A misconfigured
  deploy fails fast with a clear error message instead of serving
  500s mid-request. This is the single biggest quality-of-life
  improvement from Phase 26.3.
- **Type-safe query params.** Route handlers read
  `res.locals.validatedQuery` which is typed as the inferred Zod
  output. No more `parseInt(req.query.limit as string)` dance.
- **Secret redaction provable.** The write-stream sink test
  literally captures stdout-equivalent bytes and greps for leaked
  secrets. This is as close to a "we guarantee we don't log
  credentials" assertion as you can get without a runtime scanner.
- **Response drift becomes a fixable bug, not an outage.** In dev,
  schema mismatches throw 500s and show up in test runs. In prod,
  they log warnings that can be triaged. Before `sendValidated`,
  OpenAPI spec drift was invisible until a client reported a
  broken field.
- **Belt-and-suspenders validation at both I/O boundaries.** Zod on
  input catches bad queries at the edge; Zod on output catches
  implementation drift from the spec. A Palantir-grade pattern that
  was missing from Phase 26.3.

### Negative

- **Zod v3 pinned, can't upgrade to v4 without a rewrite.** Zod v4
  introduced breaking API changes (`ZodTypeAny` removed, different
  module structure). Every schema in the codebase would need
  updates. Pinned for now.
- **Pino + pino-http + pino-pretty is three dependencies** where
  one `console.log` wrapper was zero. The dependency surface is
  worth it for the structured logging, but it's not free.
- **Express 5 `req.query` read-only gotcha** is now a load-bearing
  pattern — every route handler must read
  `res.locals.validatedQuery` instead of `req.query`. Easy to
  forget on a new route. Caught in code review rather than by a
  lint rule.
- **`sendValidated` dev-throw / prod-warn divergence has a trap.**
  If the dev environment never exercises a rare code path, the
  schema mismatch won't throw in dev and will log-and-send in
  prod. Mitigation: response schemas use `.passthrough()` on
  nested data fields so only load-bearing contract fields are
  strictly enforced; the envelope is strict, the data payload is
  permissive.
- **Response validation is only wired into 3 of 14 routes.** The
  pattern is copy-paste from the wired routes, but the remaining
  11 are drift-unprotected until the follow-up pass lands.

### Neutral

- **Test mode sets `level: 'silent'`** so test runs don't spam the
  test output with logs. Tests that want to verify logging behavior
  use the write-stream sink pattern from the redaction test.
- **`AppError` uses explicit property assignment** instead of TS
  parameter properties because `erasableSyntaxOnly` in the server
  tsconfig forbids parameter properties. Minor syntactic quirk,
  documented in the class comment.
- **OpenAPI spec is hand-written**, not generated from Zod schemas,
  so the spec and the Zod schemas can drift. `sendValidated` catches
  runtime drift between the _implementation_ and the schema, but a
  future pass should either generate the schemas from OpenAPI or
  vice versa to eliminate the three-way drift surface. Deferred.

## Alternatives Considered

- **Winston instead of Pino** — rejected because Winston's
  structured output story is less clean and its performance on
  high-throughput logs is worse. Pino is the modern idiomatic
  choice.
- **`envalid` instead of Zod for env validation** — rejected because
  the rest of the codebase uses Zod for query validation, and
  having a single validation library across all boundaries reduces
  cognitive load.
- **`io-ts` instead of Zod** — rejected because io-ts has a heavier
  API (encode/decode separation, `PathReporter` for errors) that
  doesn't justify its safety upside for a personal project.
- **Response validation via OpenAPI schema (e.g. `express-openapi-validator`)**
  — considered, but the middleware layers OpenAPI validation _on
  top of_ Express rather than integrating with the existing Zod
  schemas, and the error surface is less controllable. Zod at output
  keeps the validation in one idiomatic language across the codebase.
- **No response validation at all, trust the implementation** —
  rejected because Phase 26.3 explicitly scoped response validation
  as a "Palantir gap" to close, and the chaos-testing work in Plan
  26.4-03 reinforced that belt-and-suspenders at both boundaries is
  the intended posture.

## References

- [`server/lib/logger.ts`](../../server/lib/logger.ts) — Pino root
  logger and `redactPaths` constant.
- [`server/config.ts`](../../server/config.ts) — `envSchema` and
  `parseEnv()`.
- [`server/middleware/validate.ts`](../../server/middleware/validate.ts) —
  `validateQuery` middleware.
- [`server/middleware/validateResponse.ts`](../../server/middleware/validateResponse.ts) —
  `sendValidated` helper.
- [`server/schemas/cacheResponse.ts`](../../server/schemas/cacheResponse.ts) —
  `cacheResponseSchema<T>` generic and the 3 wired route schemas.
- [`server/__tests__/lib/logger-redaction.test.ts`](../../server/__tests__/lib/logger-redaction.test.ts) —
  write-stream sink proof of redaction.
- [`server/__tests__/middleware/validateResponse.test.ts`](../../server/__tests__/middleware/validateResponse.test.ts) —
  6 tests covering happy path, unknown-field stripping, dev/test
  throw, prod warn.
- [`server/openapi.yaml`](../../server/openapi.yaml) — 1164-line
  hand-written OpenAPI 3.0.3 spec that `sendValidated` schemas
  mirror.
- Phase 26.3 SUMMARYs
  (`.planning/phases/26.3-production-code-cleanup/26.3-*-SUMMARY.md`)
  and Phase 26.4-03 SUMMARY
  (`.planning/phases/26.4-documentation-external-presentation/26.4-03-SUMMARY.md`).
