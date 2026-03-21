import { useState, useCallback } from 'react';
import { useMarketStore } from '@/stores/marketStore';
import type { ConnectionStatus, MarketRange } from '@/stores/marketStore';
import { useUIStore } from '@/stores/uiStore';
import { OverlayPanel } from '@/components/ui/OverlayPanel';
import { MarketRow } from '@/components/markets/MarketRow';

const STATUS_DOT_CLASS: Record<ConnectionStatus, string> = {
  connected: 'bg-accent-green',
  stale: 'bg-accent-yellow',
  error: 'bg-accent-red',
  loading: 'bg-text-muted animate-pulse',
};

const RANGES: { value: MarketRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '5d', label: '1W' },
  { value: '1mo', label: '1M' },
  { value: 'ytd', label: 'YTD' },
];

function readBool(key: string, fallback: boolean): boolean {
  try {
    return localStorage.getItem(key) === 'true' ? true : fallback;
  } catch {
    return fallback;
  }
}

function persistBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // localStorage unavailable
  }
}

export function MarketsSlot() {
  const quotes = useMarketStore((s) => s.quotes);
  const connectionStatus = useMarketStore((s) => s.connectionStatus);
  const range = useMarketStore((s) => s.range);
  const setRange = useMarketStore((s) => s.setRange);
  const isDetailPanelOpen = useUIStore((s) => s.isDetailPanelOpen);

  const [isCollapsed, setIsCollapsed] = useState(() => readBool('markets-collapsed', false));
  const [showPercent, setShowPercent] = useState(() => readBool('markets-show-percent', false));
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      persistBool('markets-collapsed', next);
      return next;
    });
  }, []);

  const toggleMode = useCallback(() => {
    setShowPercent((prev) => {
      const next = !prev;
      persistBool('markets-show-percent', next);
      return next;
    });
  }, []);

  const allClosed = quotes.length > 0 && quotes.every((q) => !q.marketOpen);

  return (
    <div
      className={`absolute top-14 z-[var(--z-controls)] w-[260px] transition-[right] duration-300 ease-in-out ${isDetailPanelOpen ? 'right-[calc(var(--width-detail-panel)+1rem)]' : 'right-4'}`}
      data-testid="markets-slot"
    >
      <OverlayPanel>
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Markets
          </span>
          <span
            className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT_CLASS[connectionStatus]}`}
            data-testid="markets-status-dot"
          />
          {allClosed && (
            <span className="text-[10px] text-text-muted uppercase">
              Market Closed
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleMode}
              className="text-[10px] px-1.5 py-0.5 rounded border border-border text-text-secondary hover:bg-white/5 transition-colors"
              aria-label={showPercent ? 'Show dollar change' : 'Show percent change'}
            >
              {showPercent ? '%' : '$'}
            </button>
            <button
              onClick={toggleCollapse}
              className="text-text-muted text-sm leading-none px-1"
              aria-label={isCollapsed ? 'Expand markets panel' : 'Collapse markets panel'}
            >
              {isCollapsed ? '+' : '-'}
            </button>
          </div>
        </div>

        {/* Body */}
        {!isCollapsed && (
          <>
            {/* Timeframe selector */}
            <div className="mt-1.5 flex gap-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`flex-1 text-[10px] py-0.5 rounded transition-colors ${
                    range === r.value
                      ? 'bg-white/10 text-text-primary font-semibold'
                      : 'text-text-muted hover:bg-white/5 hover:text-text-secondary'
                  }`}
                  aria-label={`Show ${r.label} timeframe`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="mt-1.5 flex flex-col">
              {quotes.length > 0 ? (
                quotes.map((q) => (
                  <MarketRow
                    key={q.symbol}
                    quote={q}
                    showPercent={showPercent}
                    isExpanded={expandedSymbol === q.symbol}
                    onToggle={() =>
                      setExpandedSymbol((prev) => (prev === q.symbol ? null : q.symbol))
                    }
                  />
                ))
              ) : connectionStatus !== 'loading' ? (
                <span className="text-xs text-text-muted">No data</span>
              ) : null}
            </div>
          </>
        )}
      </OverlayPanel>
    </div>
  );
}
