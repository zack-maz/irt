# Phase 22: GDELT Event Quality & OSINT Integration - Research

**Researched:** 2026-04-01
**Domain:** GDELT pipeline tuning, OSINT integration (Bellingcat), geospatial dispersion, event audit tooling
**Confidence:** HIGH

## Summary

Phase 22 improves the GDELT conflict event pipeline across four axes: (1) audit-first filter tuning via a CLI dump script, (2) Bellingcat RSS as both a 6th news source and a GDELT event confidence booster, (3) concentric ring dispersion for city-centroid-stacked events, and (4) config-driven thresholds for iterative tuning without code changes. The entire codebase needed for this phase already exists and is well-tested (957+ tests) -- this phase extends existing patterns rather than introducing new infrastructure.

The GDELT adapter (`server/adapters/gdelt.ts`) already has a two-phase parseAndFilter pipeline with dedup, geo-validation, confidence scoring, and Goldstein sanity checks. ActionGeo_Type (column index 51, 0-indexed) is currently not parsed but is the key signal for identifying city-level centroid events (value 3=US city, 4=world city). The Bellingcat RSS feed at `https://www.bellingcat.com/feed/` is a standard RSS 2.0 feed that slots directly into the existing `rss.ts` adapter pattern. The newsMatching.ts corroboration logic provides the template for Bellingcat-event matching with tighter parameters.

**Primary recommendation:** Build the audit dump script first (Wave 1), then layer in ActionGeo_Type parsing + dispersion + Bellingcat + config-driven thresholds, all validated by a fixture-based test suite comparing known true/false positives.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Event Stacking Fix:** Concentric ring dispersion for ActionGeo_Type=3/4 centroid events. Ring 1: 6 positions at ~3km, Ring 2: 12 at ~6km, Ring 3: 18 at ~9km. Deterministic positioning by timestamp sort. Dispersion computed server-side in the adapter. Store BOTH original centroid and dispersed coordinates. City-level events kept, not rejected.
- **GDELT Filter Tuning:** Audit-first approach -- dump all events (passed + rejected) before filter changes. Config-driven thresholds (adjustable confidence threshold, CAMEO exclusion list, NumSources min, centroid penalty). Auto-audit cross-referencing deferred to potential Phase 22.1.
- **Bellingcat Integration:** Dual role -- RSS news feed source (6th feed) AND event confidence booster (+0.2). Tighter matching for corroboration: +/-24h temporal window AND require BOTH geographic AND keyword overlap (not OR). Reuses newsMatching.ts approach with stricter parameters.
- **Event Audit Output:** CLI script `npx tsx scripts/audit-events.ts`. JSON format. Includes both accepted AND rejected events with rejection reason. Pipeline trace metadata. Two modes: `--fresh` (full backfill from WAR_START) and default (from Redis cache). Output to local JSON file, not deployed as API route.

### Claude's Discretion

- Exact ring angle offsets and event-to-slot assignment algorithm
- JSON output structure and field naming
- How to surface ActionGeo_Type in the existing pipeline (currently ignored column)
- Backfill sampling strategy for --fresh mode (may need more than 4 files/day for audit completeness)
- Bellingcat RSS feed URL discovery and polling interval

### Deferred Ideas (OUT OF SCOPE)

- Auto-audit cross-referencing (compare GDELT against Wikipedia conflict timeline, Bellingcat investigations automatically) -- potential Phase 22.1
- GDELT BigQuery adapter for richer querying -- deferred to v1.4
- Telegram/GramJS monitoring for OSINT early-warning -- deferred to v1.4
  </user_constraints>

## Standard Stack

### Core

| Library         | Version             | Purpose                               | Why Standard                                               |
| --------------- | ------------------- | ------------------------------------- | ---------------------------------------------------------- |
| fast-xml-parser | (already installed) | RSS XML parsing                       | Already used by `server/adapters/rss.ts` for all RSS feeds |
| adm-zip         | ^0.5.16             | GDELT ZIP decompression               | Already used in GDELT adapter                              |
| tsx             | (already installed) | CLI script runner for audit-events.ts | Listed in devDependencies, used for `dev:server`           |
| @upstash/redis  | ^1.37.0             | Redis cache access from CLI script    | Already used across all server code                        |

### Supporting

| Library    | Version | Purpose | When to Use                        |
| ---------- | ------- | ------- | ---------------------------------- |
| (none new) | -       | -       | All dependencies already installed |

### Alternatives Considered

| Instead of                               | Could Use                          | Tradeoff                                                                               |
| ---------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| Concentric ring dispersion (server-side) | deck.gl ClusterLayer (client-side) | Locked decision: server-side dispersion preserves determinism and audit trail          |
| JSON audit output                        | CSV audit output                   | JSON chosen per user preference ("well-structured and easy to read")                   |
| 4 files/day backfill                     | 96 files/day (every 15 min)        | More files = more complete audit but slower; recommend 8/day (every 3h) for audit mode |

**Installation:**

```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure

```
server/
  adapters/
    gdelt.ts            # MODIFIED: add ActionGeo_Type parsing, dispersion, pipeline trace
    rss.ts              # MODIFIED: add Bellingcat feed entry
  lib/
    eventScoring.ts     # MODIFIED: add Bellingcat corroboration boost
    dispersion.ts       # NEW: concentric ring dispersion algorithm
    eventAudit.ts       # NEW: pipeline trace metadata builder + audit record type
  config.ts             # MODIFIED: add config-driven CAMEO exclusions, min sources, centroid penalty
scripts/
  audit-events.ts       # NEW: CLI audit dump script
server/__tests__/
  lib/dispersion.test.ts       # NEW: ring position tests
  lib/eventAudit.test.ts       # NEW: audit record assembly tests
  gdelt-fixtures.test.ts       # NEW: known true/false positive fixture tests
```

### Pattern 1: Concentric Ring Dispersion

**What:** Spread events geocoded to city centroids into concentric rings around the centroid.
**When to use:** When ActionGeo_Type is 3 (US city) or 4 (world city), indicating GDELT geocoded to city center rather than actual event location.
**Example:**

```typescript
// server/lib/dispersion.ts
interface DispersionResult {
  lat: number;
  lng: number;
  ringIndex: number; // 0, 1, or 2
  slotIndex: number; // position within ring
  originalLat: number;
  originalLng: number;
}

// Ring definitions: [count, radiusKm]
const RINGS: [number, number][] = [
  [6, 3], // Ring 0: 6 positions at 3km
  [12, 6], // Ring 1: 12 positions at 6km
  [18, 9], // Ring 2: 18 positions at 9km
];
// Total capacity: 36 events per centroid before overflow

// Deterministic assignment: sort events by timestamp, assign to slots in order
// Ring 0 fills first (slots 0-5), then Ring 1 (6-17), then Ring 2 (18-35)
// Overflow stays at Ring 2 positions (wraps around)

function dispersePosition(
  centroidLat: number,
  centroidLng: number,
  globalSlotIndex: number, // 0-35, derived from timestamp-sorted order
): DispersionResult {
  let remaining = globalSlotIndex;
  for (let ringIdx = 0; ringIdx < RINGS.length; ringIdx++) {
    const [count, radiusKm] = RINGS[ringIdx];
    if (remaining < count) {
      const angleDeg = (360 / count) * remaining;
      // Optional: offset odd rings by half-step to avoid radial alignment
      const offsetDeg = ringIdx % 2 === 1 ? 360 / count / 2 : 0;
      const angleRad = ((angleDeg + offsetDeg) * Math.PI) / 180;
      // Convert km to degrees (approximate: 1 degree lat ~ 111km)
      const dLat = (radiusKm / 111) * Math.cos(angleRad);
      const dLng =
        (radiusKm / (111 * Math.cos((centroidLat * Math.PI) / 180))) * Math.sin(angleRad);
      return {
        lat: centroidLat + dLat,
        lng: centroidLng + dLng,
        ringIndex: ringIdx,
        slotIndex: remaining,
        originalLat: centroidLat,
        originalLng: centroidLng,
      };
    }
    remaining -= count;
  }
  // Overflow: wrap around Ring 2
  const [count, radiusKm] = RINGS[2];
  const wrappedSlot = remaining % count;
  const angleDeg = (360 / count) * wrappedSlot;
  const angleRad = (angleDeg * Math.PI) / 180;
  const dLat = (radiusKm / 111) * Math.cos(angleRad);
  const dLng = (radiusKm / (111 * Math.cos((centroidLat * Math.PI) / 180))) * Math.sin(angleRad);
  return {
    lat: centroidLat + dLat,
    lng: centroidLng + dLng,
    ringIndex: 2,
    slotIndex: wrappedSlot,
    originalLat: centroidLat,
    originalLng: centroidLng,
  };
}
```

### Pattern 2: Config-Driven Thresholds

**What:** Tunable event filtering parameters loaded from environment variables with safe defaults.
**When to use:** For any filter parameter the user wants to iterate on without code changes.
**Example:**

```typescript
// server/config.ts additions
export interface AppConfig {
  // ... existing fields ...
  eventConfidenceThreshold: number; // existing (default 0.35)
  eventMinSources: number; // NEW (default 2)
  eventCentroidPenalty: number; // NEW (default 0.7 -- multiplier on centroid events)
  eventExcludedCameo: string[]; // NEW (default ['180', '192'])
  bellingcatCorroborationBoost: number; // NEW (default 0.2)
}
```

### Pattern 3: Pipeline Trace Metadata

**What:** Each event carries a trace of which pipeline checks it passed/failed, enabling audit without re-running the pipeline.
**When to use:** For the audit dump script and for the Bellingcat corroboration match.
**Example:**

```typescript
// Extended ConflictEventEntity.data fields for audit
interface PipelineTrace {
  phaseA: {
    passedRootCode: boolean;
    passedCameoExclusion: boolean;
    passedMiddleEast: boolean;
    passedGeoValid: boolean;
    passedMinSources: boolean;
    passedActorCountry: boolean;
  };
  phaseB: {
    originalType: ConflictEventType;
    reclassified: boolean;
    geoPrecision: 'precise' | 'centroid';
    confidenceSubScores: {
      mediaCoverage: number;
      sourceDiversity: number;
      actorSpecificity: number;
      geoPrecisionScore: number;
      goldsteinConsistency: number;
      cameoSpecificity: number;
    };
    finalConfidence: number;
    passedThreshold: boolean;
  };
  bellingcatMatch?: {
    articleTitle: string;
    articleUrl: string;
    boosted: boolean;
  };
  dispersion?: {
    originalLat: number;
    originalLng: number;
    dispersedLat: number;
    dispersedLng: number;
    ringIndex: number;
    slotIndex: number;
  };
  rejectionReason?: string;
  actionGeoType?: number;
}
```

### Anti-Patterns to Avoid

- **Client-side dispersion:** Would cause visual jitter between renders and break coordinate-based features (copy coordinates, fly-to). Server-side is the locked decision.
- **Modifying existing ConflictEventEntity fields for audit:** Add new optional fields rather than changing existing ones to maintain backward compatibility.
- **Bellingcat RSS polling at 15-min intervals:** Bellingcat publishes investigations, not breaking news. 60-min or longer polling is appropriate and respectful of their infrastructure.
- **Storing audit trace on all production events:** The pipeline trace is audit-only data. For production, only store the fields the client needs (confidence, geoPrecision, dispersion coords). The full trace is for the CLI audit script only.

## Don't Hand-Roll

| Problem                            | Don't Build                      | Use Instead                                   | Why                                                               |
| ---------------------------------- | -------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| RSS feed parsing                   | Custom XML parser                | fast-xml-parser (already used in rss.ts)      | Edge cases: CDATA, namespaces, encoding                           |
| Geographic distance                | Custom haversine                 | `src/lib/geo.ts` haversineKm (already exists) | Tested, handles edge cases                                        |
| Keyword matching for corroboration | New matcher                      | Adapt `src/lib/newsMatching.ts` patterns      | Already handles temporal + geo + keyword scoring                  |
| Config defaults                    | Inline fallbacks                 | `getConfig()` pattern in `server/config.ts`   | Centralized, lazy-cached, env-var driven                          |
| News dedup/clustering              | Custom clustering for Bellingcat | Existing `newsClustering.ts` pipeline         | Bellingcat articles are NewsArticle[], flow through same pipeline |

**Key insight:** Nearly every piece of infrastructure needed for Phase 22 already exists. The work is extending existing modules, not creating new systems.

## Common Pitfalls

### Pitfall 1: ActionGeo_Type Column Index Off-by-One

**What goes wrong:** Using wrong column index for ActionGeo_Type, causing misclassification of centroid vs precise events.
**Why it happens:** GDELT codebook uses 1-indexed columns; code uses 0-indexed. Multiple online sources give conflicting column numbers because they reference schema CSVs with metadata prefix columns.
**How to avoid:** ActionGeo_Type is at **0-indexed column 51** in the actual data file. Verified by cross-referencing with existing code: ActionGeo_FullName=52, ActionGeo_CountryCode=53, ActionGeo_Lat=56, ActionGeo_Long=57 -- ActionGeo_Type immediately precedes FullName.
**Warning signs:** All events showing as centroid or all as precise (should be a mix).

### Pitfall 2: Dispersion Coordinate Precision at High Latitudes

**What goes wrong:** Dispersed positions appear skewed east-west at latitudes above ~35N (most Middle East cities).
**Why it happens:** Longitude degrees shrink toward the poles. At 35N latitude, 1 degree longitude = ~91km (vs 111km at equator).
**How to avoid:** Apply cosine correction: `dLng = km / (111 * cos(lat))`. The code example above includes this correction.
**Warning signs:** Ring positions appearing elliptical rather than circular on the map.

### Pitfall 3: Bellingcat RSS Rate Limiting

**What goes wrong:** Bellingcat blocks the server IP after aggressive polling.
**Why it happens:** Bellingcat is a small nonprofit with limited infrastructure. Aggressive polling (every 15 min) is unnecessary -- they publish ~2-5 articles per week, not per hour.
**How to avoid:** Poll Bellingcat RSS at most once per hour (3600s interval). Use the existing RSS_FEEDS pattern which respects `AbortSignal.timeout(10_000)`. The news route already caches for 15 min, so the Bellingcat feed will be fetched at most once per 15 min even with shorter polling.
**Warning signs:** 429 or connection refused errors from bellingcat.com.

### Pitfall 4: Audit Script Memory with Full WAR_START Backfill

**What goes wrong:** --fresh mode downloads ~30+ days of GDELT data (120+ ZIP files), causing Node.js heap exhaustion.
**Why it happens:** Each GDELT export file can contain thousands of rows. Storing both accepted and rejected events for all files consumes significant memory.
**How to avoid:** Stream results to file incrementally rather than accumulating all in memory. Use `fs.createWriteStream` with JSON lines or chunked JSON arrays. Alternatively, increase sampling to 8/day but process each batch and write to disk before loading the next.
**Warning signs:** Node.js OOM crash during --fresh mode.

### Pitfall 5: Bellingcat Corroboration False Matches

**What goes wrong:** Generic Bellingcat articles about methodology or unrelated investigations match conflict events.
**Why it happens:** Keyword overlap on common conflict terms ("attack", "military", "weapon") combined with broad temporal window.
**How to avoid:** The locked decision requires BOTH geographic AND keyword overlap (not OR). This is stricter than the existing newsMatching.ts which uses additive scoring. Implement as a hard gate: skip if no geographic match, then check keywords.
**Warning signs:** Many events showing Bellingcat corroboration despite Bellingcat having no Middle East articles that week.

### Pitfall 6: Dispersion Must Group by Centroid Before Assigning Slots

**What goes wrong:** Events at different city centroids share slot assignments, causing some centroids to have sparse rings while others overflow.
**Why it happens:** Applying slot assignment globally instead of per-centroid.
**How to avoid:** Group events by centroid (matching `detectCentroid` city name), sort each group by timestamp, then assign slots independently per group.
**Warning signs:** Events at Tehran scattered across a single ring while Baghdad events stack.

## Code Examples

### Adding ActionGeo_Type to COL Constants

```typescript
// server/adapters/gdelt.ts -- add to existing COL object
export const COL = {
  // ... existing columns ...
  ActionGeo_Type: 51, // NEW: 1=country, 2=US state, 3=US city, 4=world city, 5=world state
  ActionGeo_FullName: 52,
  ActionGeo_CountryCode: 53,
  ActionGeo_ADM1Code: 54, // NEW: FIPS admin division 1
  ActionGeo_ADM2Code: 55, // NEW: FIPS admin division 2
  ActionGeo_Lat: 56,
  ActionGeo_Long: 57,
  ActionGeo_FeatureID: 58, // NEW: GNS/GNIS feature ID
  SOURCEURL: 60,
} as const;
```

### Adding Bellingcat to RSS_FEEDS

```typescript
// server/adapters/rss.ts -- add to existing RSS_FEEDS array
export const RSS_FEEDS = [
  {
    url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
    name: 'BBC',
    country: 'United Kingdom',
  },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', country: 'Qatar' },
  { url: 'https://www.tehrantimes.com/rss', name: 'Tehran Times', country: 'Iran' },
  { url: 'https://www.timesofisrael.com/feed/', name: 'Times of Israel', country: 'Israel' },
  { url: 'https://www.middleeasteye.net/rss', name: 'Middle East Eye', country: 'United Kingdom' },
  { url: 'https://www.bellingcat.com/feed/', name: 'Bellingcat', country: 'Netherlands' }, // NEW
] as const;
```

### Bellingcat Corroboration Boost (Strict Matching)

```typescript
// server/lib/eventScoring.ts -- new function
import { haversineKm } from '../../src/lib/geo';

const BELLINGCAT_TEMPORAL_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const BELLINGCAT_GEO_RADIUS_KM = 200; // generous since Bellingcat covers broad areas
const BELLINGCAT_MIN_KEYWORD_MATCHES = 2;

interface BellingcatArticle {
  title: string;
  url: string;
  publishedAt: number;
  lat?: number;
  lng?: number;
}

export function checkBellingcatCorroboration(
  event: ConflictEventEntity,
  articles: BellingcatArticle[],
): { matched: boolean; article?: BellingcatArticle } {
  const locationKeywords = event.data.locationName
    .split(/[\s,]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 3);

  for (const article of articles) {
    // Gate 1: Temporal proximity (required)
    const timeDiff = Math.abs(event.timestamp - article.publishedAt);
    if (timeDiff > BELLINGCAT_TEMPORAL_WINDOW_MS) continue;

    // Gate 2: Geographic proximity (required)
    if (article.lat == null || article.lng == null) continue;
    const distKm = haversineKm(event.lat, event.lng, article.lat, article.lng);
    if (distKm > BELLINGCAT_GEO_RADIUS_KM) continue;

    // Gate 3: Keyword overlap (required)
    const titleLower = article.title.toLowerCase();
    let keywordMatches = 0;
    for (const kw of locationKeywords) {
      if (titleLower.includes(kw)) keywordMatches++;
    }
    if (keywordMatches < BELLINGCAT_MIN_KEYWORD_MATCHES) continue;

    // All three gates passed
    return { matched: true, article };
  }
  return { matched: false };
}
```

### Audit Script Structure

```typescript
// scripts/audit-events.ts
import { redis } from '../server/cache/redis';
import { backfillEvents } from '../server/adapters/gdelt';
import fs from 'fs';

interface AuditRecord {
  id: string;
  status: 'accepted' | 'rejected';
  rejectionReason?: string;
  event: {
    /* full event data */
  };
  pipelineTrace: {
    /* sub-scores, checks */
  };
  rawGdeltColumns: {
    /* original CSV fields */
  };
  dispersion?: {
    /* ring info if centroid */
  };
  bellingcatMatch?: {
    /* article if corroborated */
  };
}

const args = process.argv.slice(2);
const isFresh = args.includes('--fresh');
const outputPath = args.find((a) => !a.startsWith('--')) ?? 'audit-events.json';

async function main() {
  // ... fetch from Redis cache or do full backfill ...
  // ... run pipeline with trace collection ...
  // ... write structured JSON to outputPath ...
  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));
  console.log(`Wrote ${records.length} audit records to ${outputPath}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
```

## State of the Art

| Old Approach                                 | Current Approach                                | When Changed | Impact                                                                                  |
| -------------------------------------------- | ----------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| Binary centroid detection (centroid/precise) | ActionGeo_Type column parsing (1-5 granularity) | Phase 22     | More accurate centroid identification -- GDELT already tells us the geocoding precision |
| Centroid events at exact city center         | Concentric ring dispersion                      | Phase 22     | Visual clarity on map -- stacked events become distinguishable                          |
| Fixed CAMEO exclusions in code               | Config-driven CAMEO exclusion list              | Phase 22     | Iterative tuning without code changes                                                   |
| News matching for notifications only         | News matching for event confidence boosting     | Phase 22     | Bellingcat corroboration improves GDELT event quality                                   |

**Key observation on ActionGeo_Type vs detectCentroid:**
The existing `detectCentroid()` in `geoValidation.ts` uses a 42-city lookup with +/-0.01 degree tolerance. GDELT's ActionGeo*Type column (values 1-5) provides the \_actual* geocoding resolution used by GDELT's geocoder. These are complementary:

- **ActionGeo_Type = 3 or 4** (city match) is the authoritative signal for dispersion
- **detectCentroid()** can remain as a secondary check for edge cases where ActionGeo_Type is missing or 0
- For confidence scoring, ActionGeo_Type is more reliable than proximity-based centroid detection

**GDELT ActionGeo_Type Values (verified from codebook):**
| Value | Meaning | Implication |
|-------|---------|-------------|
| 1 | Country | Coordinates are country centroid -- very imprecise |
| 2 | US State | State centroid -- imprecise |
| 3 | US City/Landmark | City-level -- moderate precision |
| 4 | World City/Landmark | City-level -- moderate precision (most common for Middle East) |
| 5 | World ADM1 (state/province equivalent) | Admin division centroid -- imprecise |

For the Middle East monitoring region, values 3 and 4 trigger dispersion. Values 1 and 5 could be further penalized or flagged in confidence scoring.

## Open Questions

1. **Backfill sampling rate for --fresh audit mode**
   - What we know: Current backfill uses 4 files/day (every 6h). For audit completeness, more frequent sampling captures more events.
   - What's unclear: Whether 4/day misses significant events between samples (GDELT updates every 15 min).
   - Recommendation: Default to 8/day (every 3h) for audit mode. This doubles coverage without making the script prohibitively slow. Add a `--sample-rate` flag for user control.

2. **Bellingcat article geolocation**
   - What we know: Bellingcat RSS feeds provide title, URL, description, pubDate. They do NOT provide structured lat/lng in the RSS feed.
   - What's unclear: How to get geographic coordinates for Bellingcat articles to enable the geographic proximity check required by locked decision.
   - Recommendation: Extract location from article title/description using the same keyword matching against CITY_CENTROIDS names. If a city name appears in the title, assign that city's coordinates. This is approximate but sufficient for the 200km radius corroboration check.

3. **Pipeline trace storage for production vs audit**
   - What we know: Full pipeline trace includes sub-scores, raw GDELT columns, and rejection reasons. This is verbose.
   - What's unclear: Whether production events should carry any trace data, or only the audit script.
   - Recommendation: Production events get minimal additions (actionGeoType, originalLat/originalLng for dispersed events). Full trace only in audit script's internal processing. This avoids Redis bloat.

## Validation Architecture

### Test Framework

| Property           | Value                                  |
| ------------------ | -------------------------------------- |
| Framework          | Vitest (via vite.config.ts test block) |
| Config file        | `vite.config.ts` (test section)        |
| Quick run command  | `npx vitest run server/__tests__/`     |
| Full suite command | `npx vitest run`                       |

### Phase Requirements to Test Map

| Req ID  | Behavior                                                               | Test Type   | Automated Command                                             | File Exists?                  |
| ------- | ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------------- | ----------------------------- |
| DISP-01 | Concentric ring dispersion produces correct lat/lng for each ring/slot | unit        | `npx vitest run server/__tests__/lib/dispersion.test.ts -x`   | No -- Wave 0                  |
| DISP-02 | Dispersion groups by centroid city independently                       | unit        | `npx vitest run server/__tests__/lib/dispersion.test.ts -x`   | No -- Wave 0                  |
| DISP-03 | Events sorted by timestamp get stable slot assignment                  | unit        | `npx vitest run server/__tests__/lib/dispersion.test.ts -x`   | No -- Wave 0                  |
| DISP-04 | Overflow wraps to Ring 2 positions correctly                           | unit        | `npx vitest run server/__tests__/lib/dispersion.test.ts -x`   | No -- Wave 0                  |
| GEO-01  | ActionGeo_Type=4 detected as centroid for dispersion                   | unit        | `npx vitest run server/__tests__/gdelt.test.ts -x`            | No (extend existing)          |
| GEO-02  | ActionGeo_Type=1 and 5 flagged as low-precision                        | unit        | `npx vitest run server/__tests__/gdelt.test.ts -x`            | No (extend existing)          |
| BELL-01 | Bellingcat RSS feed added and articles flow through pipeline           | unit        | `npx vitest run server/__tests__/adapters/rss.test.ts -x`     | Extend existing               |
| BELL-02 | Bellingcat corroboration requires temporal AND geo AND keyword         | unit        | `npx vitest run server/__tests__/lib/eventScoring.test.ts -x` | No (extend existing)          |
| BELL-03 | Corroboration boost adds 0.2 to confidence score                       | unit        | `npx vitest run server/__tests__/lib/eventScoring.test.ts -x` | No (extend existing)          |
| CFG-01  | Config-driven thresholds load from env vars with defaults              | unit        | `npx vitest run server/__tests__/gdelt.test.ts -x`            | Extend existing (mock config) |
| CFG-02  | CAMEO exclusion list configurable                                      | unit        | `npx vitest run server/__tests__/gdelt.test.ts -x`            | No (extend existing)          |
| AUD-01  | Audit script collects both accepted and rejected events                | unit        | `npx vitest run server/__tests__/lib/eventAudit.test.ts -x`   | No -- Wave 0                  |
| AUD-02  | Rejected events include rejection reason string                        | unit        | `npx vitest run server/__tests__/lib/eventAudit.test.ts -x`   | No -- Wave 0                  |
| FIX-01  | Known true positive fixtures pass pipeline                             | integration | `npx vitest run server/__tests__/gdelt-fixtures.test.ts -x`   | No -- Wave 0                  |
| FIX-02  | Known false positive fixtures rejected by pipeline                     | integration | `npx vitest run server/__tests__/gdelt-fixtures.test.ts -x`   | No -- Wave 0                  |

### Sampling Rate

- **Per task commit:** `npx vitest run server/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/__tests__/lib/dispersion.test.ts` -- covers DISP-01 through DISP-04
- [ ] `server/__tests__/lib/eventAudit.test.ts` -- covers AUD-01, AUD-02
- [ ] `server/__tests__/gdelt-fixtures.test.ts` -- covers FIX-01, FIX-02 (true/false positive fixtures)
- [ ] Extend `server/__tests__/gdelt.test.ts` -- covers GEO-01, GEO-02, CFG-01, CFG-02
- [ ] Extend `server/__tests__/lib/eventScoring.test.ts` -- covers BELL-02, BELL-03
- [ ] Extend `server/__tests__/adapters/rss.test.ts` -- covers BELL-01

## Sources

### Primary (HIGH confidence)

- `server/adapters/gdelt.ts` -- existing GDELT adapter code, two-phase pipeline, COL indices
- `server/lib/eventScoring.ts` -- existing confidence scoring with 6 weighted signals
- `server/lib/geoValidation.ts` -- existing centroid detection (42 cities, +/-0.01 degrees)
- `server/adapters/rss.ts` -- existing RSS adapter pattern (5 feeds, fast-xml-parser)
- `src/lib/newsMatching.ts` -- existing news-to-event matching (temporal + geo + keyword)
- `server/config.ts` -- existing config-driven threshold pattern
- `server/types.ts` -- ConflictEventEntity type definition
- GDELT v2 Events Column Headers (GitHub: linwoodc3/gdelt2HeaderRows) -- verified ActionGeo_Type at column 51 (0-indexed)

### Secondary (MEDIUM confidence)

- [Bellingcat RSS feed](https://www.bellingcat.com/feed/) -- verified as valid RSS 2.0, confirmed active with recent articles
- [GDELT Event Codebook V2.0](http://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf) -- ActionGeo_Type values 1-5 (TLS cert issue prevents direct fetch, verified via multiple secondary sources)

### Tertiary (LOW confidence)

- ActionGeo_Type exact semantics for value 5 ("world state" vs "ADM1") -- multiple sources agree on meaning but exact edge cases unclear

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- no new dependencies, all patterns already established in codebase
- Architecture: HIGH -- extending existing adapter/scoring/config patterns with clear integration points
- Pitfalls: HIGH -- based on direct code analysis and verified column indices
- Dispersion algorithm: HIGH -- standard polar coordinate distribution, verified with cosine correction
- Bellingcat integration: MEDIUM -- RSS feed verified, but article geolocation requires heuristic extraction from text

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain -- GDELT v2 format unchanged since 2015)
