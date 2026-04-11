# Quick Task 260411-mh0: Add Open-Meteo precipitation to API observability dashboard

## What changed

Added a dedicated "Precip" row to the DevApiStatus dashboard showing Open-Meteo precipitation polling health.

### waterStore changes

- Added `precipStatus`, `precipLastFetchAt`, `precipLastError`, `precipNextPollAt`, `precipRecentFetches`, `precipMatchedCount` fields
- Added `recordPrecipFetch()`, `setPrecipNextPollAt()`, `setPrecipError()` actions
- Precipitation observability is now separate from water facility observability

### useWaterPrecipPolling changes

- Switched from shared `recordFetch`/`setNextPollAt` to dedicated `recordPrecipFetch`/`setPrecipNextPollAt`
- `recordPrecipFetch` also tracks matched facility count from response

### DevApiStatus changes

- New "Precip" row showing: connection status, matched/total count, avg response time, success rate, 6h poll countdown
- Quality detail shows "X/Y matched" (precipitation entries vs total facilities)

## Files changed

- `src/stores/waterStore.ts` — precip-specific state fields and actions
- `src/hooks/useWaterPrecipPolling.ts` — use dedicated precip store actions
- `src/components/ui/DevApiStatus.tsx` — new Precip row

## Commit

7d73360
