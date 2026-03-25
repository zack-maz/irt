# Iran Conflict Monitor

A personal real-time intelligence dashboard for monitoring the Iran conflict. Displays a 2.5D map of the Greater Middle East with live flights, ships, conflict events, news, and infrastructure sites sourced from public APIs. Prioritizes concrete mathematical data -- movement vectors, strike counts, timelines, force posture -- over qualitative news reporting.

## Features

- **Live entity tracking** -- flights (3 sources: OpenSky, ADS-B Exchange, adsb.lol), ships (AISStream), conflict events (GDELT v2)
- **Key infrastructure sites** -- nuclear, naval, oil, airbase, desalination, port facilities from OpenStreetMap
- **News feed** -- GDELT DOC 2.0 + 5 RSS feeds with dedup/clustering and keyword filtering
- **Notification center** -- severity-scored alerts with news correlation, proximity alerts for flights/ships near key sites
- **Oil markets** -- Brent, WTI, XLE, USO, XOM with sparkline charts (Yahoo Finance)
- **7 visualization layers** -- geographic (elevation contours), weather (temperature heatmap + wind barbs), threat density, political alignment, ethnic distribution, satellite, water stress
- **Advanced search** -- Cmd+K with ~25 tag prefixes (type:, near:, callsign:, country:, etc.) and bidirectional filter sync
- **Date range filtering** -- custom time window with granularity toggle (minute/hour/day)
- **Detail panels** -- per-entity data with dual units, lost contact tracking, copy coordinates

## Quick Start

```bash
npm install
npm run dev
```

Opens frontend at http://localhost:5173, API server at http://localhost:3001.

## Production

Deployed on Vercel with Upstash Redis cache.

```bash
# Deploy
vercel --prod

# Smoke test
npx tsx scripts/smoke-test.ts https://your-app.vercel.app

# Health check
curl https://your-app.vercel.app/health
```

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 6, Tailwind CSS v4 |
| State | Zustand 5 |
| Map | Deck.gl + MapLibre GL JS (2.5D terrain rendering) |
| Backend | Express 5 (serverless functions on Vercel) |
| Cache | Upstash Redis with graceful degradation (in-memory fallback) |
| CDN | Vercel Edge with per-endpoint Cache-Control (s-maxage) |
| Security | Helmet CSP, per-endpoint rate limiting, structured JSON logging |
| Monitoring | /health endpoint with per-source freshness, cron health checks |
| Bundle | 4 vendor chunks (react, maplibre, deckgl, app) for independent cache invalidation |

## Data Sources

| Source | Type | Polling |
|--------|------|---------|
| OpenSky / ADS-B Exchange / adsb.lol | Flights | 5-260s |
| AISStream | Ships (AIS) | 30s |
| GDELT v2 | Conflict events | 15min |
| GDELT DOC 2.0 + RSS | News articles | 15min |
| Overpass/OSM | Infrastructure sites | One-time |
| Yahoo Finance | Oil markets | 60s |
| Open-Meteo | Weather | 10min |

## Testing

```bash
npx vitest run              # Run all tests (859 tests)
npx vitest run src/         # Frontend tests only
npx vitest run server/      # Server tests only
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| UPSTASH_REDIS_REST_URL | Yes | Upstash Redis REST endpoint |
| UPSTASH_REDIS_REST_TOKEN | Yes | Upstash Redis auth token |
| CORS_ORIGIN | No | CORS origin (defaults to *) |
| PORT | No | Server port (defaults to 3001) |
| OPENSKY_CLIENT_ID | No | OpenSky API credentials |
| OPENSKY_CLIENT_SECRET | No | OpenSky API credentials |
| ADSB_EXCHANGE_API_KEY | No | ADS-B Exchange RapidAPI key |
| AISSTREAM_API_KEY | No | AISStream WebSocket API key |

## License

Private -- personal tool.
