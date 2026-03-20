# Technology Stack

**Project:** Iran Conflict Monitor v1.1 Intelligence Layer
**Researched:** 2026-03-19

## Scope

This document covers ONLY new dependencies and integration patterns needed for v1.1 features. The validated v0.9/v1.0 stack (React 19, TypeScript ~5.9.3, Vite 6, Zustand 5, Deck.gl 9, MapLibre GL 5, Tailwind CSS 4, Express 5, Upstash Redis, adm-zip) is unchanged and not re-researched.

---

## Recommended Stack Additions

### RSS/XML Parsing (Phase 16: News Feed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| fast-xml-parser | ^5.5.6 | Parse BBC and Al Jazeera RSS XML to JS objects | Zero dependencies, 104KB, pure JS (no native C/C++ modules), TypeScript types included, actively maintained (v5.5.6 released 2026-03-16). Ideal for serverless — no binary compilation issues on Vercel. |

**Confidence:** HIGH (verified via GitHub, npm, widespread serverless adoption)

**Usage pattern:**
```typescript
import { XMLParser } from 'fast-xml-parser';
const parser = new XMLParser({ ignoreAttributes: false });
const feed = parser.parse(xmlText);
const items = feed.rss?.channel?.item ?? [];
```

**Why not rss-parser:** Depends on xml2js (heavier transitive deps), last major update 2022, larger bundle. fast-xml-parser is the modern standard for XML in serverless JS.

**Why not feedsmith:** Newer library, lower adoption (fewer dependents), less battle-tested for production serverless.

**Why not built-in DOMParser:** Not available in Node.js server environment. Would need jsdom which is 30MB+ — absurd for RSS parsing.

**Integration:** Used exclusively in `server/adapters/news.ts` to parse BBC and Al Jazeera RSS feeds. GDELT DOC API returns JSON natively — no XML parsing needed for that source.

### Fuzzy Search (Phase 19: Global Search Bar)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| fuse.js | ^7.1.0 | Client-side fuzzy search across all entity stores | Zero dependencies, ~12KB minified, TypeScript types, 3,252+ npm dependents, well-documented API for weighted multi-key search. |

**Confidence:** HIGH (zero-dependency, stable API, dominant market share for client-side fuzzy search)

**Usage pattern:**
```typescript
import Fuse from 'fuse.js';
const fuse = new Fuse(entities, {
  keys: ['label', 'id', 'data.callsign'],
  threshold: 0.4,
  includeScore: true,
});
const results = fuse.search(query);
```

**Why not uFuzzy:** Smaller (4KB) but optimized for file path matching, not structured entity search with weighted keys. Fuse.js weighted key support is critical for ranking flight callsigns higher than GDELT location strings.

**Why not MiniSearch:** Full-text search engine — overkill for searching a few thousand entities. Requires index building and document management. Fuse.js is simpler for real-time search over live Zustand store arrays.

**Why not native filter+includes:** No fuzzy matching, no typo tolerance, no relevance scoring. Users will type partial callsigns and approximate location names.

**Integration:** Used in `src/stores/searchStore.ts`. Builds index on-demand from combined entity arrays (flightStore, shipStore, eventStore, siteStore). Re-indexes when stores update. Results grouped by entity type in dropdown.

---

## No New Dependencies Required

The following v1.1 features need NO new npm packages — they are fully covered by the existing stack plus native Node.js/browser APIs.

### Overpass API Integration (Phase 15: Key Sites)

**No library needed.** Overpass API is a REST endpoint that accepts Overpass QL queries via POST and returns JSON.

- **Endpoint:** `https://overpass-api.de/api/interpreter`
- **Method:** POST with `Content-Type: application/x-www-form-urlencoded`, body: `data=[out:json][timeout:30][bbox:15,30,42,70];...`
- **Response:** JSON with `elements` array containing nodes/ways with tags
- **Rate limits:** <10,000 queries/day, <1GB/day (generous for 1 query/24h)
- **Auth:** None required
- **Implementation:** Native `fetch()` in `server/adapters/overpass.ts`, same pattern as existing GDELT adapter
- **Caching:** Redis 24h TTL — OSM data changes very slowly, one fetch per day is sufficient

**Confidence:** HIGH (official OSM wiki documentation, free, no auth, stable for 10+ years)

**Query structure for the 6 site types:**
```
[out:json][timeout:30][bbox:15,30,42,70];
(
  node["military"="naval_base"];
  node["military"="airfield"];
  node["aeroway"="military"];
  node["man_made"="petroleum_well"]["name"];
  node["industrial"="oil_refinery"];
  way["industrial"="oil_refinery"];
  node["military"="nuclear_hazard"];
  node["man_made"="nuclear_facility"];
  node["waterway"="dam"]["name"];
  way["waterway"="dam"]["name"];
  node["harbour"="yes"]["name"];
);
out center;
```

The `out center;` directive returns centroid coordinates for ways (polygons), giving consistent lat/lng for all element types.

### Yahoo Finance Charts (Phase 18: Oil Markets)

**No library needed.** Direct `fetch()` to Yahoo Finance's v8 chart endpoint from Express server.

- **Endpoint:** `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d`
- **Method:** GET
- **Headers:** `User-Agent: Mozilla/5.0` (required — Yahoo rejects requests without a browser-like UA)
- **Response:** JSON with `chart.result[0]` containing `meta.regularMarketPrice`, `meta.previousClose`, `indicators.quote[0].close[]` for sparkline data
- **Auth:** The v8/finance/chart endpoint does NOT require crumb/cookie authentication for basic chart data (unlike the v7/finance/quote endpoint which does). This is confirmed by multiple implementations working without auth as of 2025-2026.
- **Rate limits:** Undocumented, but 5 symbols every 60s (via Redis cache) is negligible

**Confidence:** MEDIUM (unofficial API — Yahoo provides no guarantees, but the chart endpoint has been stable for years and does not require crumb auth unlike the quote endpoints that were locked down in April 2024)

**Risk mitigation:**
- Return empty array (not error) on Yahoo Finance failure — graceful degradation per design spec
- Cache in Redis with 60s TTL to minimize requests
- If Yahoo blocks this endpoint in the future, `yahoo-finance2` npm package (v3.13.2) could be added as fallback — it handles crumb/cookie negotiation but adds complexity and has known intermittent crumb expiry issues

**Why not yahoo-finance2 npm package now:** The library (v3.13.2) handles crumb/cookie authentication automatically, but has known issues: crumb expires after 10-20 minutes requiring re-authentication, the quote endpoint was disabled by Yahoo in April 2024 (the chart endpoint was NOT affected), and it adds 15+ transitive dependencies. Direct fetch to the chart endpoint is simpler, more reliable for this use case, and matches the project's existing adapter pattern (direct fetch + normalize).

**Why not a paid API (Alpha Vantage, Twelve Data, etc.):** Project constraint is free-tier APIs. Yahoo Finance chart endpoint is free and sufficient for 5 symbols.

### GDELT DOC API (Phase 16: News Feed)

**No library needed.** GDELT DOC 2.0 API returns JSON natively.

- **Endpoint:** `https://api.gdeltproject.org/api/v2/doc/doc`
- **Parameters:** `?query=...&mode=artlist&maxrecords=50&format=json&timespan=24h`
- **Response:** JSON with `articles` array containing `{url, url_mobile, title, seendate, socialimage, domain, language, sourcecountry}`
- **Auth:** None required
- **Rate limits:** Undocumented but generous for low-frequency queries
- **Max records:** Up to 250 (design spec uses 50)

**Confidence:** HIGH (same GDELT project already used for events in v0.9, well-documented API)

**Query for the news adapter:**
```
query=Iran OR "Middle East" OR Iraq OR Israel theme:MILITARY_STRIKE OR theme:TERROR
mode=artlist
maxrecords=50
format=json
timespan=24h
```

### BBC Middle East RSS Feed (Phase 16: News Feed)

**No new library needed** (uses fast-xml-parser added above).

- **URL:** `https://feeds.bbci.co.uk/news/world/middle_east/rss.xml`
- **Format:** Standard RSS 2.0 XML
- **Fields:** `item.title`, `item.link`, `item.pubDate`, `item.description`, `item.media:thumbnail`
- **Auth:** None required
- **Reliability:** Very stable, BBC has maintained this feed structure for years

**Confidence:** HIGH (verified via multiple sources, standard RSS format)

### Al Jazeera RSS Feed (Phase 16: News Feed)

**No new library needed** (uses fast-xml-parser added above).

- **URL:** `https://www.aljazeera.com/xml/rss/all.xml`
- **Format:** Standard RSS 2.0 XML
- **Fields:** Same RSS 2.0 structure as BBC
- **Auth:** None required
- **Note:** This is the global "all news" feed — the noise filter in `server/adapters/news.ts` will handle filtering to Middle East conflict content via keyword matching

**Confidence:** HIGH (verified endpoint, standard RSS)

### Haversine Distance (Phase 17: Proximity Alerts)

**No library needed.** Haversine is a 10-line formula. Adding an npm package for it would be dependency bloat.

```typescript
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

Used client-side in `notificationStore` for proximity alerts (flight/ship within 50km of key site).

**Confidence:** HIGH (well-known formula, accurate to ~0.5% for distances under 1000km)

### SVG Sparkline Charts (Phase 18: Oil Markets)

**No library needed.** Sparklines are a single SVG `<polyline>` element. For 5 data points rendered at 60x20px, a React component is ~20 lines of code.

```tsx
function Sparkline({ data, width = 60, height = 20 }: { data: number[]; width?: number; height?: number }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
  ).join(' ');
  return (
    <svg width={width} height={height}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
```

**Why not react-sparklines:** Adds ~8KB for something achievable in 20 lines. Project already uses inline SVG (EntityTooltip icons), so the pattern is established.

**Why not recharts/d3:** Massive overkill. These are charting frameworks designed for complex interactive charts. Sparklines have zero interactivity.

### Severity Scoring (Phase 17: Notification Center)

**No library needed.** The scoring formula `type_weight * log(1+NumMentions) * log(1+NumSources) * recency_decay` uses only `Math.log()`. Computed server-side in `/api/notifications` route handler.

### News Keyword Matching (Phase 17: Notification Center)

**No library needed.** Matching news headlines to events uses simple string operations (country code match OR keyword overlap in title). Not fuzzy — exact substring matching is appropriate for news-to-event correlation.

---

## Existing Stack Leveraged (No Changes)

| Existing Technology | v1.1 Usage |
|---------------------|-----------|
| Express 5 routes | 4 new routes: `/api/sites`, `/api/news`, `/api/notifications`, `/api/markets` |
| Upstash Redis | 4 new cache keys: `sites:osm` (24h), `news:feed` (15min), `markets:quotes` (60s), notifications computed from events cache |
| Zustand 5 (curried create) | 4 new stores: `siteStore`, `newsStore`, `notificationStore`, `marketStore` |
| Deck.gl IconLayer | 1 new layer for key sites (same pattern as conflict events) |
| Recursive setTimeout polling | 4 new hooks: `useSitePolling` (24h), `useNewsPolling` (15min), `useMarketPolling` (60s), `useNotificationPolling` (implicit via event polling) |
| Tailwind CSS v4 | All new UI panels (notification drawer, markets panel, search bar) |
| Vitest + jsdom | Tests for all new adapters, routes, stores, components |
| tsup serverless bundle | New routes auto-included via Express app factory |
| adm-zip | Not used by v1.1 (GDELT DOC returns JSON, not ZIP) |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| XML parsing | fast-xml-parser | rss-parser | Heavier deps (xml2js), last updated 2022, slower |
| XML parsing | fast-xml-parser | DOMParser | Not available in Node.js without jsdom (30MB) |
| Fuzzy search | fuse.js | uFuzzy | No weighted multi-key search, optimized for file paths |
| Fuzzy search | fuse.js | MiniSearch | Full-text search engine, overkill for ~5K entities |
| Fuzzy search | fuse.js | native filter | No fuzzy matching, no typo tolerance, no scoring |
| Yahoo Finance | Direct fetch | yahoo-finance2 | Crumb auth issues, 15+ transitive deps, intermittent failures |
| Yahoo Finance | Direct fetch | Alpha Vantage | Requires API key, rate-limited free tier (5 req/min) |
| Sparklines | Inline SVG | react-sparklines | 8KB dep for 20 lines of code |
| Sparklines | Inline SVG | recharts | Massive bundle for non-interactive mini charts |
| Haversine | Inline function | haversine-distance npm | 10 lines of math vs. adding a dependency |
| Overpass | Direct fetch | osm-api npm | Unnecessary abstraction over a single POST request |

---

## Installation

```bash
# New production dependencies (only 2 packages)
npm install fast-xml-parser fuse.js

# No new dev dependencies needed
```

**Total new dependency footprint:**
- fast-xml-parser: ~104KB, 0 transitive dependencies
- fuse.js: ~12KB, 0 transitive dependencies
- **Combined: ~116KB, 0 transitive dependencies**

This is deliberately minimal. The project already has 14 production dependencies; adding only 2 (both zero-dependency) keeps the bundle lean and serverless-friendly.

---

## Version Pinning

| Package | Pin | Rationale |
|---------|-----|-----------|
| fast-xml-parser | ^5.5.6 | Major version 5 API is stable; minor/patch updates are safe |
| fuse.js | ^7.1.0 | Major version 7 API is stable; last published ~1 year ago, unlikely to see breaking changes |

Both packages use standard semver. Caret (`^`) pinning is appropriate — no known upcoming breaking changes in either.

---

## TypeScript Integration Notes

Both new packages include TypeScript type definitions:
- `fast-xml-parser`: Ships its own types (3.4% of codebase is `.ts`)
- `fuse.js`: Ships its own types, generic `Fuse<T>` for typed results

No `@types/*` packages needed.

---

## Serverless (Vercel) Compatibility

Both new packages are serverless-safe:
- **fast-xml-parser:** Pure JS, no native binaries, no filesystem access
- **fuse.js:** Pure JS, client-side only (not in serverless bundle)

The tsup bundle for Vercel (`server/vercel-entry.ts`) will include fast-xml-parser. fuse.js is client-side only and bundled by Vite.

---

## Risk Assessment

| Technology | Risk | Mitigation |
|-----------|------|------------|
| Yahoo Finance v8 chart API | MEDIUM — unofficial, could be blocked | Graceful degradation (empty array), can add yahoo-finance2 as fallback later |
| Overpass API | LOW — free, stable, 10+ year track record | Redis 24h cache means 1 request/day; fallback to cached data on failure |
| GDELT DOC API | LOW — same project as existing GDELT v2 events | 15min cache; existing GDELT event data provides fallback context |
| BBC RSS | LOW — BBC has maintained feeds for 15+ years | Cache; if feed dies, GDELT DOC + Al Jazeera still provide news |
| Al Jazeera RSS | LOW — standard RSS, stable endpoint | Cache; one of three sources, not single point of failure |
| fast-xml-parser | LOW — 3,844 npm dependents, actively maintained | Well-established, v5 API is stable |
| fuse.js | LOW — 3,252 npm dependents, zero deps | Dominant client-side fuzzy search library |

---

## Sources

- [Overpass API - OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Overpass API Bounding Box Docs](https://dev.overpass-api.de/overpass-doc/en/full_data/bbox.html)
- [GDELT DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)
- [GDELT DOC JSONFeed Support](https://blog.gdeltproject.org/gdelt-doc-2-0-api-supports-jsonfeed/)
- [fast-xml-parser GitHub](https://github.com/NaturalIntelligence/fast-xml-parser)
- [Fuse.js Official Site](https://www.fusejs.io/)
- [Yahoo Finance API Guide - AlgoTrading101](https://algotrading101.com/learn/yahoo-finance-api-guide/)
- [yahoo-finance2 Crumb Issue #764](https://github.com/gadicc/yahoo-finance2/issues/764)
- [BBC RSS Feeds](https://rss.feedspot.com/bbc_rss_feeds/)
- [Al Jazeera RSS - Inoreader](https://www.inoreader.com/feed/https://www.aljazeera.com/xml/rss/all.xml)
- [Haversine Formula Reference](https://www.movable-type.co.uk/scripts/latlong.html)
