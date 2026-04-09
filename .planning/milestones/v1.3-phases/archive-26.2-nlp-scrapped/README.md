# Archive: Phase 26.2 NLP Geolocation Attempt (SCRAPPED)

This directory holds the historical artifacts from the scrapped NLP-based
approach to GDELT geolocation improvement. The phase was originally numbered
**26.2** and was reverted in Phase 26.3 after the NLP pipeline proved to be
patching bad geocoding with more code rather than fixing the underlying signal.

**The redo of this work has been renumbered to Phase 27 under milestone v1.4.**
A fresh context and plan will be created via `/gsd:discuss-phase 27` — do NOT
reuse the CONTEXT.md or plans in this directory as-is. They document the
wrong-turn approach, preserved for historical reference only.

## What's in here

- `26.2-CONTEXT.md` — the original user decisions for the NLP approach
- `26.2-RESEARCH.md` — research into NLP extraction, title fetching, me-cities dataset
- `26.2-VALIDATION.md` — the original validation strategy
- `26.2-VERIFICATION.md` — verification of the (later-scrapped) implementation
- `26.2-01-PLAN.md`, `26.2-02-PLAN.md`, `26.2-03-PLAN.md` — the three original plans
- `26.2-01-SUMMARY.md`, `26.2-02-SUMMARY.md`, `26.2-03-SUMMARY.md` — execution summaries for the three plans

## Why the approach was scrapped

See `docs/adr/0005-phase-26-2-nlp-approach-scrapped.md` for the full retrospective. The short version:

1. **Patching downstream of a bad signal compounds the problem.** GDELT's
   geolocation is unreliable. Adding an NLP layer on top of unreliable input
   didn't fix the input.
2. **Title-based location extraction fails more than it works.** Many GDELT
   headlines don't contain explicit location names.
3. **Hand-curated city lists (me-cities.json) are unmaintainable.** They drift
   fast and miss the long tail.

## What Phase 27 should do instead

Per ADR-0005 §"What to do instead": investigate upstream NumSources + noisy-CAMEO
filtering, GDELT's own actionGeo_FeatureID vs eventGeo_FeatureID discrimination,
and consider supplementing with ACLED (now that account approval is possible)
for ground-truth cross-validation.

---

_Archived: 2026-04-08_
_Renumbered to: Phase 27 under milestone v1.4_
