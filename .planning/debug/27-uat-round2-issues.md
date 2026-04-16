---
status: diagnosed
trigger: 'Diagnose three UAT issues found in Phase 27 round 2 (tests 6, 10, 11)'
created: 2026-04-09T21:00:00Z
updated: 2026-04-09T21:00:00Z
---

## Current Focus

hypothesis: Three issues diagnosed — see Resolution
test: n/a
expecting: n/a
next_action: Return diagnosis to caller

## Symptoms

### Issue 1 (Test 6): Event colors not distinct + wrong label

expected: 5 event types should each have a DISTINCT red shade; label should say "Ground" not "Ground Combat"
actual: Airstrikes, ground, and explosions are all the same color. "Ground Combat" label in filters tab.
errors: none
reproduction: Open filter panel, look at conflict sub-toggle labels and map event markers
started: Phase 27 (new 5-type taxonomy)

### Issue 2 (Test 10): No precision radius rings

expected: Non-exact events show translucent red radius rings (neighborhood=1km, city=5km, region=25km)
actual: No precision radius rings visible
errors: none
reproduction: Load map with events, look for radius rings around conflict events
started: Phase 27 (new precision feature)

### Issue 3 (Test 11): No tooltip precision indicator

expected: Hovering events shows precision indicator dots
actual: No precision indicator visible in tooltip
errors: none
reproduction: Hover over any conflict event, look for precision dot in tooltip
started: Phase 27 (new precision feature)

## Evidence

- timestamp: 2026-04-09T21:00:00Z
  checked: src/lib/eventColors.ts — EVENT_TYPE_COLORS and EVENT_TYPE_RGBA definitions
  found: File defines 5 distinct hex colors and RGB tuples, but grep shows ZERO imports anywhere in src/
  implication: eventColors.ts is dead code — never consumed by any component

- timestamp: 2026-04-09T21:00:00Z
  checked: src/components/map/layers/constants.ts — ENTITY_COLORS (the ACTUAL rendering colors)
  found: airstrike=[255,59,48], groundCombat=[239,68,68], targeted=[139,30,30]. No entry for 'explosion' or 'other'.
  implication: on_ground/explosion/other all fall through to ENTITY_COLORS.groundCombat in getColorForEntity (useEntityLayers.ts lines 89-91,95). 3 of 5 types share the same color [239,68,68].

- timestamp: 2026-04-09T21:00:00Z
  checked: useEntityLayers.ts getColorForEntity function (lines 75-97)
  found: case 'on_ground' and 'explosion' share the same branch returning ENTITY_COLORS.groundCombat. The default case (for 'other') also returns ENTITY_COLORS.groundCombat.
  implication: Only airstrike and targeted have unique colors; on_ground, explosion, and other are visually identical.

- timestamp: 2026-04-09T21:00:00Z
  checked: ENTITY_DOT_COLORS in constants.ts (filter panel dot colors)
  found: Only 'airstrikes', 'groundCombat', 'targeted' entries exist. No 'explosion' or 'other' entries.
  implication: FilterPanelSlot uses ENTITY_DOT_COLORS.groundCombat for Explosions button (line 349) — same color as Ground toggle.

- timestamp: 2026-04-09T21:00:00Z
  checked: FilterPanelSlot.tsx line 341
  found: Label is hardcoded as "Ground Combat" on the FilterButton (line 341)
  implication: Should be "Ground" per user report

- timestamp: 2026-04-09T21:00:00Z
  checked: EVENT_TYPE_LABELS in src/types/ui.ts line 26
  found: on_ground mapped to 'Ground Combat'
  implication: EVENT_TYPE_LABELS used by tooltips and detail panel also says "Ground Combat" — but the user specifically reported the filter panel label

- timestamp: 2026-04-09T21:00:00Z
  checked: server/types.ts ConflictEventEntity.data.precision field (line 65)
  found: precision is optional, typed as 'exact' | 'neighborhood' | 'city' | 'region'
  implication: Only populated when LLM processes the event (see llmProcessed flag, line 68)

- timestamp: 2026-04-09T21:00:00Z
  checked: server/routes/events.ts enrichedToEntities function (lines 125-164)
  found: precision is set at line 151 ONLY inside the LLM processing branch (enrichedToEntities). Raw GDELT path never sets precision.
  implication: Without LLM API keys configured, ALL events have precision=undefined. PrecisionRingLayer and tooltip precision dots find zero matching events.

- timestamp: 2026-04-09T21:00:00Z
  checked: PrecisionRingLayer.tsx filter logic (lines 33-41)
  found: Filters for events where 'precision' in data AND data.precision !== undefined AND data.precision !== 'exact'
  implication: Correct logic, but raw GDELT events never have precision field at all — ringEvents array is always empty without LLM

- timestamp: 2026-04-09T21:00:00Z
  checked: EntityTooltip.tsx EventContent (lines 132-155)
  found: Renders precision dot only when d.precision is truthy (line 132)
  implication: Same dependency — no precision field = no dot rendered. Correct behavior for the data it receives.

- timestamp: 2026-04-09T21:00:00Z
  checked: server/types.ts ConflictEventEntity.data.actionGeoType field (line 59)
  found: Raw GDELT events DO have actionGeoType (1=country, 2=state, 3=city, 4=landmark) from GDELT CSV
  implication: Could potentially derive a fallback precision from actionGeoType when LLM is not available

## Eliminated

(none — direct diagnosis without multiple hypothesis iterations)

## Resolution

### Issue 1a: Event colors not distinct

root_cause: The actual rendering pipeline uses ENTITY_COLORS from constants.ts, NOT the EVENT_TYPE_RGBA from eventColors.ts (which is dead code). ENTITY_COLORS only defines 3 unique color entries for 5 event types: airstrike, groundCombat, targeted. Types on_ground, explosion, and other all resolve to the same groundCombat color [239,68,68] via shared case branches in getColorForEntity(). Additionally, ENTITY_DOT_COLORS lacks entries for explosion and other, so filter panel dots also share colors.

fix_direction: Either (a) wire up EVENT_TYPE_RGBA from eventColors.ts into getColorForEntity/ENTITY_COLORS, or (b) add 'explosion' and 'other' entries to ENTITY_COLORS and ENTITY_DOT_COLORS with the distinct colors already defined in eventColors.ts. The separate case branches in getColorForEntity need to return per-type colors. The groundCombatLayer should also use per-entity colors instead of a single ENTITY_COLORS.groundCombat.

files_involved:

- src/components/map/layers/constants.ts — missing explosion/other entries in ENTITY_COLORS and ENTITY_DOT_COLORS
- src/hooks/useEntityLayers.ts — getColorForEntity() lumps on_ground/explosion together (line 89-90) and default returns same color (line 95); groundCombatLayer getColor (line 413) uses single ENTITY_COLORS.groundCombat for all
- src/lib/eventColors.ts — has correct distinct colors but is dead code (zero imports)

### Issue 1b: "Ground Combat" label should say "Ground"

root_cause: FilterPanelSlot.tsx line 341 hardcodes the label as "Ground Combat". EVENT_TYPE_LABELS in ui.ts also maps on_ground to "Ground Combat".

fix_direction: Change FilterPanelSlot.tsx line 341 label from "Ground Combat" to "Ground". Optionally also update EVENT_TYPE_LABELS.on_ground to "Ground" if that's the desired label across tooltip/detail panel too.

files_involved:

- src/components/layout/FilterPanelSlot.tsx (line 341)
- src/types/ui.ts (line 26, EVENT_TYPE_LABELS)

### Issues 2 & 3: No precision rings or tooltip dots

root_cause: The precision field on ConflictEventEntity.data is ONLY populated by the LLM processing pipeline (enrichedToEntities in server/routes/events.ts, line 151). Without CEREBRAS_API_KEY or GROQ_API_KEY configured, the server serves raw GDELT events which never have precision set. Both PrecisionRingLayer and EntityTooltip correctly check for the precision field — they find nothing because the data doesn't have it.

This is NOT a bug in the components. It is a missing fallback: raw GDELT data DOES include actionGeoType (1=country, 2=state, 3=city, 4=landmark) which could be mapped to the precision enum as a degraded but useful fallback.

fix_direction: Add a fallback precision derivation from GDELT's actionGeoType field in the raw GDELT path. Mapping: actionGeoType 4 (landmark) -> 'exact', 3 (city) -> 'city', 2 (state) -> 'region', 1 (country) -> 'region'. This would be applied in the GDELT adapter or the events route for non-LLM events. Both PrecisionRingLayer and EntityTooltip would then work without LLM keys.

files_involved:

- server/routes/events.ts — raw GDELT serving path (line 350) never enriches precision
- server/adapters/gdelt.ts — where raw events are constructed from CSV (could add actionGeoType->precision mapping)
- server/types.ts — actionGeoType already defined (line 59)
