---
status: diagnosed
trigger: 'Phase 27 UAT: no events visible + toggles in wrong location'
created: 2026-04-09T00:00:00Z
updated: 2026-04-09T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — two independent root causes identified
test: Complete code trace + Zod schema validation test
expecting: N/A — diagnosis complete
next_action: Report findings

## Symptoms

expected: Events visible on map with 5 new category toggles in entity section
actual: No events visible at all; event toggles placed in visualization layers panel instead of entity panel
errors: None reported (silent failure)
reproduction: Load the app — zero events on map
started: After Phase 27 changes

## Eliminated

- hypothesis: "Toggle defaults are false, causing everything to be hidden"
  evidence: filterStore DEFAULTS all set to true (showEvents, showAirstrikes, showOnGround, showExplosions, showTargeted, showOther all true)
  timestamp: 2026-04-09T00:10:00Z

- hypothesis: "useFilteredEntities date range filter excludes all events"
  evidence: Default date range is WAR_START (2026-02-28) to now — covers full war period
  timestamp: 2026-04-09T00:15:00Z

- hypothesis: "CONFLICT_TOGGLE_GROUPS mapping is wrong"
  evidence: Groups correctly map showAirstrikes→['airstrike'], showOnGround→['on_ground'], showExplosions→['explosion'], showTargeted→['targeted'], showOther→['other']. These match the new ConflictEventType values exactly.
  timestamp: 2026-04-09T00:20:00Z

- hypothesis: "useEntityLayers eventToggleMap logic is broken"
  evidence: eventToggleMap correctly gates each type with showEvents master AND per-type sub-toggle. Filter logic in airstrikeEvents/groundCombatEvents/targetedEvents correctly references CONFLICT_TOGGLE_GROUPS.
  timestamp: 2026-04-09T00:25:00Z

## Evidence

- timestamp: 2026-04-09T00:05:00Z
  checked: server/schemas/cacheResponse.ts — conflictEventEntitySchema
  found: Zod schema uses z.enum(['airstrike', 'on_ground', 'explosion', 'targeted', 'other']) — matches new 5-type taxonomy ONLY
  implication: Any cached events with old types (ground_combat, shelling, etc.) will FAIL Zod validation

- timestamp: 2026-04-09T00:06:00Z
  checked: server/middleware/validateResponse.ts — sendValidated behavior
  found: In dev mode (NODE_ENV !== 'production'), schema mismatch throws AppError 500. In production, logs warning and sends unvalidated payload.
  implication: In DEV mode, stale Redis cache with old-type events causes /api/events to return HTTP 500. Client sets eventStore to error state with empty array.

- timestamp: 2026-04-09T00:07:00Z
  checked: Zod array validation with mixed old/new types
  found: z.array(eventSchema).safeParse() fails if ANY element has an old type like 'ground_combat'. Even one stale event poisons the entire response.
  implication: BLOCKER — entire events response fails validation even if most events have new types

- timestamp: 2026-04-09T00:08:00Z
  checked: Redis cache keys and TTL
  found: events:gdelt has 2.5h hard TTL (REDIS_TTL_SEC=9000). events:llm also 2.5h. If old-type data is cached, it persists for hours after code deploys.
  implication: After deploying Phase 27 code, stale cache serves old-format data that fails the new schema

- timestamp: 2026-04-09T00:09:00Z
  checked: GDELT adapter classifyByBaseCode
  found: Correctly maps CAMEO codes to new 5-type taxonomy. Fresh fetches produce valid types.
  implication: Problem is NOT in fresh data generation — it's in serving stale cached data

- timestamp: 2026-04-09T00:10:00Z
  checked: LayerTogglesSlot.tsx git diff
  found: Event toggles (master + 5 sub-toggles) were added to LayerTogglesContent() which renders inside the "Layers" sidebar section, not the "Filters" section
  implication: UI placement issue — toggles work correctly but are in the wrong panel

- timestamp: 2026-04-09T00:11:00Z
  checked: FilterPanelSlot.tsx (Filters panel)
  found: FilterPanelContent ALREADY has the correct event toggles: master "All Events" FilterButton + 5 sub-type FilterButtons (Airstrikes, Ground Combat, Explosions, Targeted, Other) at lines 326-364
  implication: Event toggles exist in BOTH Layers and Filters panels — DUPLICATED. The LayerTogglesSlot copy should be removed entirely.

- timestamp: 2026-04-09T00:12:00Z
  checked: All tests (1331 tests, 106 files)
  found: All pass. Tests don't catch the stale cache issue because they mock Redis and never test with old-format cached data.
  implication: Gap in test coverage for cache format migration

## Resolution

root_cause: TWO INDEPENDENT ISSUES:

**Issue 1 (blocker): No events visible**
Stale Redis cache poisoning. The events route (server/routes/events.ts) serves cached data through sendValidated() which validates against conflictEventEntitySchema. The schema was updated to accept only the new 5 types (airstrike, on_ground, explosion, targeted, other). But the Redis cache (events:gdelt, events:llm) may still contain events with OLD types (ground_combat, shelling, bombing, assassination, etc.) from before Phase 27 was deployed. When sendValidated encounters even ONE event with an old type, the entire z.array() validation fails. In dev mode this throws a 500 error; in production it logs a warning and sends unvalidated data (which then fails client-side CONFLICT_TOGGLE_GROUPS matching, making events invisible in all toggle group filters).

The dual-path failure:

- DEV: sendValidated throws 500 → fetch('/api/events') gets error → eventStore.setError() → events = [] → nothing to render
- PROD: sendValidated sends unvalidated old-format data → client receives events with type='ground_combat' etc → CONFLICT_TOGGLE_GROUPS only has new types → events don't match any toggle group → filtered out at useEntityLayers layer

**Issue 2 (major): Toggles in wrong location**
Event toggles were added to LayerTogglesSlot.tsx (the visualization layers panel) in addition to already existing in FilterPanelSlot.tsx (the entity filters panel). The LayerTogglesSlot copy is the wrong location — it's a visualization layer toggle panel (Geographic, Weather, Water, Threat Density, Political, Ethnic), not an entity toggle panel. The FilterPanelSlot already has the correct event toggle implementation.

fix: (diagnosis only — not applying)
verification:
files_changed: []
