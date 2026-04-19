import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSiteStore, type SiteFilterStats } from '@/stores/siteStore';
import { useFlightStore } from '@/stores/flightStore';
import { useShipStore } from '@/stores/shipStore';
import { useEventStore } from '@/stores/eventStore';
import { useNewsStore } from '@/stores/newsStore';
import { useMarketStore } from '@/stores/marketStore';
import { useWeatherStore } from '@/stores/weatherStore';
import { useWaterStore } from '@/stores/waterStore';

// Mock useLLMStatusPolling (same pattern as devApiStatus.test.tsx)
const mockLLMStatus = { stage: 'idle' as const, lastRun: null };
vi.mock('@/hooks/useLLMStatusPolling', () => ({
  useLLMStatusPolling: () => mockLLMStatus,
}));

// Import AFTER mocks
import { DevApiStatus } from '@/components/ui/DevApiStatus';

function makeSiteFilterStats(overrides: Partial<SiteFilterStats> = {}): SiteFilterStats {
  return {
    rawCount: 876,
    filteredCount: 720,
    rejections: {
      excluded_turkey: 156,
      no_coords: 0,
      no_type: 0,
      duplicate: 0,
    },
    byCountry: {
      'United Arab Emirates': { port: 50, airbase: 15, naval: 7, nuclear: 5, oil: 2 },
      Israel: { airbase: 29, port: 28, oil: 11, naval: 6, nuclear: 2 },
      Kuwait: { airbase: 25, port: 23, oil: 15, naval: 13 },
    },
    byType: { airbase: 284, port: 232, oil: 99, naval: 60, nuclear: 45 },
    overpass: [
      {
        facilityType: 'sites',
        mirror: 'primary',
        status: 200,
        durationMs: 17524,
        attempts: 1,
        ok: true,
      },
    ],
    source: 'snapshot',
    generatedAt: '2026-04-19T08:28:47.786Z',
    ...overrides,
  };
}

function resetAllStoresForSitesSection(filterStats: SiteFilterStats | null) {
  const now = Date.now();
  useFlightStore.setState({
    connectionStatus: 'connected',
    flightCount: 10,
    lastFetchAt: now - 5000,
    lastError: null,
    nextPollAt: now + 3000,
    recentFetches: [{ ok: true, durationMs: 150, timestamp: now }],
    flights: [],
  });
  useShipStore.setState({
    connectionStatus: 'connected',
    shipCount: 5,
    lastFetchAt: now - 10000,
    lastError: null,
    nextPollAt: now + 25000,
    recentFetches: [{ ok: true, durationMs: 300, timestamp: now }],
    ships: [],
  });
  useEventStore.setState({
    connectionStatus: 'connected',
    eventCount: 8,
    lastFetchAt: now - 60000,
    lastError: null,
    nextPollAt: now + 840000,
    recentFetches: [{ ok: true, durationMs: 500, timestamp: now }],
    events: [],
  });
  useSiteStore.setState({
    connectionStatus: 'connected',
    siteCount: 20,
    lastError: null,
    nextPollAt: null,
    recentFetches: [{ ok: true, durationMs: 1200, timestamp: now }],
    sites: [],
    filterStats,
  });
  useNewsStore.setState({
    connectionStatus: 'connected',
    clusterCount: 12,
    articleCount: 45,
    lastFetchAt: now - 30000,
    lastError: null,
    nextPollAt: now + 870000,
    recentFetches: [{ ok: true, durationMs: 800, timestamp: now }],
    clusters: [],
  });
  useMarketStore.setState({
    connectionStatus: 'connected',
    lastFetchAt: now - 20000,
    lastError: null,
    nextPollAt: now + 280000,
    recentFetches: [{ ok: true, durationMs: 400, timestamp: now }],
    quotes: [],
  });
  useWeatherStore.setState({
    connectionStatus: 'connected',
    lastFetchAt: now - 120000,
    lastError: null,
    nextPollAt: now + 1680000,
    recentFetches: [{ ok: true, durationMs: 600, timestamp: now }],
    grid: [],
  });
  useWaterStore.setState({
    connectionStatus: 'connected',
    lastError: null,
    nextPollAt: null,
    recentFetches: [{ ok: true, durationMs: 2000, timestamp: now }],
    facilities: [{ id: 'w1', name: 'Test Dam', lat: 33, lng: 51 }] as never[],
  });
}

/** Expand the collapsed "API ~" button so section renders */
function expandPanel() {
  const btn = screen.getByText(/^API/);
  fireEvent.click(btn);
}

describe('SitesFiltersSection (Phase 27.3.1 R-05 D-19)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(mockLLMStatus, { stage: 'idle', lastRun: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the null-safe placeholder when siteStore.filterStats is null', () => {
    resetAllStoresForSitesSection(null);
    render(<DevApiStatus />);
    expandPanel();

    // Placeholder label present
    const sitesHeadings = screen.getAllByText('Sites Filters');
    expect(sitesHeadings.length).toBeGreaterThanOrEqual(1);
    // Both water + sites render the same placeholder string when their
    // respective store's filterStats is null, so expect >= 1 occurrence
    // (in this test both are null → 2 occurrences).
    const loadingRows = screen.getAllByText(/loading filter stats…/);
    expect(loadingRows.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 6 blocks when filterStats is populated (provenance, raw/kept, byType, byCountry, rejections, Overpass health)', () => {
    resetAllStoresForSitesSection(makeSiteFilterStats());
    render(<DevApiStatus />);
    expandPanel();

    // Sites Filters heading present (in addition to the water one)
    expect(screen.getAllByText('Sites Filters').length).toBeGreaterThanOrEqual(1);

    // Block 1: Provenance header (source) — "snapshot" appears at least once
    // (in the sites section — water might or might not have it depending on
    // that store's filterStats, which we did not populate in this test)
    expect(screen.getByText(/snapshot/)).toBeInTheDocument();

    // Block 2: Raw/kept summary
    expect(screen.getByText(/876 raw → 720 kept/)).toBeInTheDocument();
    expect(screen.getByText(/\(82%\)/)).toBeInTheDocument(); // 720/876 = 82%

    // Block 3: By Type header + at least one of the 5 types rendered
    // (sites-specific By Type heading only appears when filterStats is populated)
    expect(screen.getAllByText('By Type').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('airbase')).toBeInTheDocument();
    // airbase count = 284 (highest, so sorted first)
    expect(screen.getByText('284')).toBeInTheDocument();

    // Block 4: By Country header (shared with water, but at least 1 instance)
    expect(screen.getAllByText('By Country').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('United Arab Emirates')).toBeInTheDocument();

    // Block 5: Rejections row — 4 buckets, sites-specific
    // Using within-range regex to tolerate whitespace from JSX splits
    const rejectionsLine = screen.getByText(/turkey=156.*nocoords=0.*notype=0.*dup=0/);
    expect(rejectionsLine).toBeInTheDocument();

    // Block 6: Overpass Health
    expect(screen.getAllByText('Overpass Health').length).toBeGreaterThanOrEqual(1);
    // One telemetry row: sites · primary · status=200 · 17524ms · attempts=1 OK
    expect(
      screen.getByText(/sites.*primary.*status=200.*17524ms.*attempts=1.*OK/),
    ).toBeInTheDocument();
  });

  it('keeps WaterFiltersSection unchanged — water placeholder still renders when water filterStats absent', () => {
    resetAllStoresForSitesSection(makeSiteFilterStats());
    render(<DevApiStatus />);
    expandPanel();

    // Water placeholder: "Water Filters" heading + "loading filter stats…"
    // This proves the water section null-safe path (truth-21 guard) still
    // works — i.e. adding SitesFiltersSection did not accidentally trip the
    // water branch.
    expect(screen.getByText('Water Filters')).toBeInTheDocument();

    // Both sections render placeholders when their store's filterStats is
    // null — we have only populated sites' filterStats, so water should
    // render its placeholder.
    const loadingRows = screen.getAllByText(/loading filter stats…/);
    expect(loadingRows.length).toBeGreaterThanOrEqual(1);
  });

  it('tolerates an empty overpass array (no Overpass Health block rendered)', () => {
    resetAllStoresForSitesSection(makeSiteFilterStats({ overpass: [] }));
    render(<DevApiStatus />);
    expandPanel();

    // Sites section still renders otherwise (heading present)
    expect(screen.getAllByText('Sites Filters').length).toBeGreaterThanOrEqual(1);
    // Overpass Health heading should NOT be visible under the sites section
    // (water store still has no filterStats so water also won't render its
    // Overpass block — but since water filterStats is null here, the
    // heading does not appear at all)
    expect(screen.queryByText('Overpass Health')).toBeNull();
  });

  it('does not render a Rejections by Type block for sites (asymmetry with water byTypeRejections)', () => {
    resetAllStoresForSitesSection(makeSiteFilterStats());
    render(<DevApiStatus />);
    expandPanel();

    // Sites section intentionally omits a "Rejections by Type" block because
    // the sites adapter uses a single combined Overpass query rather than
    // per-type queries (see JSDoc on SitesFiltersSection). When only sites
    // filterStats is populated (water is null), the "Rejections by Type"
    // heading should not appear anywhere.
    expect(screen.queryByText('Rejections by Type')).toBeNull();
  });
});
