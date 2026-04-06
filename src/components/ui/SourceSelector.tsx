import { useState, useRef, useEffect } from 'react';
import { useFlightStore } from '@/stores/flightStore';
import type { ConnectionStatus } from '@/stores/flightStore';
import type { FlightSource } from '@/types/ui';
import { OverlayPanel } from '@/components/ui/OverlayPanel';

type SourceConfig = Record<FlightSource, { configured: boolean }>;

const SOURCE_LABELS: Record<FlightSource, string> = {
  opensky: 'OpenSky',
  adsblol: 'adsb.lol',
};

const SOURCES: FlightSource[] = ['opensky', 'adsblol'];

const STATUS_DOT_CLASS: Record<ConnectionStatus, string> = {
  connected: 'bg-accent-green',
  stale: 'bg-accent-yellow',
  error: 'bg-accent-red',
  rate_limited: 'bg-accent-red',
  loading: 'bg-text-muted animate-pulse',
};

function getStatusText(status: ConnectionStatus, flightCount: number): string {
  switch (status) {
    case 'connected':
      return `${flightCount} flights`;
    case 'stale':
      return `${flightCount} flights (stale)`;
    case 'error':
      return 'Connection error';
    case 'rate_limited':
      return 'Rate limited';
    case 'loading':
      return 'Loading...';
  }
}

export function SourceSelector() {
  const activeSource = useFlightStore(s => s.activeSource);
  const connectionStatus = useFlightStore(s => s.connectionStatus);
  const flightCount = useFlightStore(s => s.flightCount);
  const setActiveSource = useFlightStore(s => s.setActiveSource);

  const [isOpen, setIsOpen] = useState(false);
  const [sourceConfig, setSourceConfig] = useState<SourceConfig | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch source configuration once on mount
  useEffect(() => {
    fetch('/api/sources')
      .then(res => res.json())
      .then((data: SourceConfig) => setSourceConfig(data))
      .catch(() => { /* silently fail -- optimistic defaults */ });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(source: FlightSource) {
    if (source !== activeSource) {
      setActiveSource(source);
    }
    setIsOpen(false);
  }

  return (
    <OverlayPanel className="min-w-[180px]">
      <div ref={containerRef}>
        {/* Source selector button */}
        <button
          role="combobox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(prev => !prev)}
          className="flex w-full items-center justify-between text-sm text-text-primary"
        >
          <span>{SOURCE_LABELS[activeSource]}</span>
          <svg
            className={`ml-2 h-4 w-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Dropdown options */}
        {isOpen && (
          <div className="mt-2 border-t border-border pt-2">
            {SOURCES.map(source => {
              const isConfigured = sourceConfig?.[source]?.configured ?? true;

              return (
                <button
                  key={source}
                  role="option"
                  aria-selected={source === activeSource}
                  aria-disabled={!isConfigured || undefined}
                  onClick={() => isConfigured && handleSelect(source)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1 text-sm ${
                    !isConfigured
                      ? 'cursor-not-allowed text-text-muted'
                      : source === activeSource
                        ? 'text-accent-blue'
                        : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {source === activeSource && (
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {source !== activeSource && <span className="inline-block w-3" />}
                  <span>{SOURCE_LABELS[source]}</span>
                  {!isConfigured && (
                    <span className="ml-auto text-[10px] text-text-muted">(API key required)</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Status badge - always visible */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            data-testid="status-dot"
            className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT_CLASS[connectionStatus]}`}
          />
          <span className="text-text-secondary">
            {getStatusText(connectionStatus, flightCount)}
          </span>
        </div>
      </div>
    </OverlayPanel>
  );
}
