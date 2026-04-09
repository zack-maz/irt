import { useState, useEffect } from 'react';
import { useFlightStore } from '@/stores/flightStore';
import { useShipStore } from '@/stores/shipStore';
import { useEventStore } from '@/stores/eventStore';
import { useSiteStore } from '@/stores/siteStore';
import { useNewsStore } from '@/stores/newsStore';
import { useMarketStore } from '@/stores/marketStore';
import { useWeatherStore } from '@/stores/weatherStore';
import { useWaterStore } from '@/stores/waterStore';

/** Stuck threshold: no update in 2 minutes while still 'loading' */
const STUCK_THRESHOLD_MS = 120_000;

interface ApiRow {
  name: string;
  status: string;
  count: number;
  lastFetch: number | null;
  note?: string;
}

/**
 * Compute effective status: "connected" with 0 data is suspicious.
 * Also detects stuck loading state.
 */
function effectiveStatus(status: string, count: number, lastFetch: number | null): string {
  if (status === 'loading' && lastFetch && Date.now() - lastFetch > STUCK_THRESHOLD_MS)
    return 'stuck';
  if (status === 'loading' && !lastFetch) return 'init';
  if (status === 'connected' && count === 0) return 'empty';
  return status;
}

function statusColor(eff: string): string {
  switch (eff) {
    case 'connected':
      return '#22c55e'; // green
    case 'empty':
      return '#f59e0b'; // amber — connected but no data
    case 'stale':
      return '#f59e0b'; // amber
    case 'stuck':
      return '#f59e0b'; // amber
    case 'error':
      return '#ef4444'; // red
    case 'init':
      return '#60a5fa'; // blue
    case 'idle':
      return '#6b7280'; // gray
    default:
      return '#60a5fa'; // loading = blue
  }
}

function statusLabel(eff: string): string {
  switch (eff) {
    case 'empty':
      return 'EMPTY';
    case 'stuck':
      return 'STUCK';
    case 'init':
      return 'INIT';
    default:
      return eff.toUpperCase();
  }
}

function formatAge(ts: number | null): string {
  if (!ts) return '--';
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
}

/**
 * Dev-only API status overlay. Shows connection status, data counts,
 * last fetch time, and health indicators for every data source.
 * Only renders when import.meta.env.DEV is true.
 */
export function DevApiStatus() {
  // Tick every 2s to update ages
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const [collapsed, setCollapsed] = useState(true);

  const flights = useFlightStore((s) => ({
    status: s.connectionStatus,
    count: s.flightCount,
    lastFetch: s.lastFetchAt,
  }));
  const ships = useShipStore((s) => ({
    status: s.connectionStatus,
    count: s.shipCount,
    lastFetch: s.lastFetchAt,
  }));
  const eventsRaw = useEventStore((s) => ({
    status: s.connectionStatus,
    count: s.eventCount,
    lastFetch: s.lastFetchAt,
    events: s.events,
  }));
  const llmCount = eventsRaw.events.filter((e) => e.data.llmProcessed).length;
  const events = {
    status: eventsRaw.status,
    count: eventsRaw.count,
    lastFetch: eventsRaw.lastFetch,
    note: llmCount > 0 ? `${llmCount} LLM` : 'raw',
  };
  const sites = useSiteStore((s) => ({
    status: s.connectionStatus,
    count: s.sites.length,
    lastFetch: null as number | null,
  }));
  const news = useNewsStore((s) => ({
    status: s.connectionStatus,
    count: s.clusters.length,
    lastFetch: s.lastFetchAt,
  }));
  const markets = useMarketStore((s) => ({
    status: s.connectionStatus,
    count: s.quotes.length,
    lastFetch: s.lastFetchAt,
  }));
  const weather = useWeatherStore((s) => ({
    status: s.connectionStatus,
    count: s.grid.length,
    lastFetch: s.lastFetchAt,
  }));
  const water = useWaterStore((s) => ({
    status: s.connectionStatus,
    count: s.facilities.length,
    lastFetch: null as number | null,
  }));

  const rows: ApiRow[] = [
    { name: 'Flights', ...flights },
    { name: 'Ships', ...ships },
    { name: 'Events', ...events },
    { name: 'Sites', ...sites },
    { name: 'News', ...news },
    { name: 'Markets', ...markets },
    { name: 'Weather', ...weather },
    { name: 'Water', ...water },
  ];

  const hasIssue = rows.some((r) => {
    const eff = effectiveStatus(r.status, r.count, r.lastFetch);
    return eff === 'error' || eff === 'stuck' || eff === 'empty';
  });

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-2 left-2 z-[9999] rounded px-2 py-1 font-mono text-[10px] text-white/70 hover:text-white"
        style={{ backgroundColor: hasIssue ? 'rgba(239,68,68,0.8)' : 'rgba(0,0,0,0.5)' }}
      >
        API {hasIssue ? '!' : '~'}
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-2 left-2 z-[9999] rounded-md border border-white/10 bg-black/85 p-2 font-mono text-[10px] text-white/80 backdrop-blur-sm"
      style={{ minWidth: 300 }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
          API Status
        </span>
        <button onClick={() => setCollapsed(true)} className="text-white/40 hover:text-white">
          x
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-white/40">
            <th className="pr-2 text-left font-normal">Source</th>
            <th className="pr-2 text-left font-normal">Status</th>
            <th className="pr-2 text-right font-normal">Count</th>
            <th className="pr-2 text-right font-normal">Age</th>
            <th className="text-right font-normal">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const eff = effectiveStatus(r.status, r.count, r.lastFetch);
            const color = statusColor(eff);
            return (
              <tr key={r.name}>
                <td className="pr-2">{r.name}</td>
                <td className="pr-2">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />{' '}
                  <span style={{ color }}>{statusLabel(eff)}</span>
                </td>
                <td className="pr-2 text-right">{r.count}</td>
                <td className="pr-2 text-right">{formatAge(r.lastFetch)}</td>
                <td className="text-right text-white/40">{r.note ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
