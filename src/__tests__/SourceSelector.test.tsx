import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFlightStore } from '@/stores/flightStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

// Default source config: all configured
const allConfigured = {
  opensky: { configured: true },
  adsb: { configured: true },
  adsblol: { configured: true },
};

function mockFetchResponse(data: unknown) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    }),
  );
}

describe('SourceSelector', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();

    // Default: all sources configured
    vi.stubGlobal('fetch', mockFetchResponse(allConfigured));

    useFlightStore.setState({
      flights: [],
      connectionStatus: 'connected',
      lastFetchAt: Date.now(),
      lastFresh: Date.now(),
      flightCount: 247,
      activeSource: 'opensky',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // Lazy import to avoid module-level issues
  async function renderSelector() {
    const { SourceSelector } = await import('@/components/ui/SourceSelector');
    return render(<SourceSelector />);
  }

  it('renders current source label with chevron indicator', async () => {
    await renderSelector();

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('OpenSky')).toBeInTheDocument();
  });

  it('renders ADS-B Exchange label when adsb is active', async () => {
    useFlightStore.setState({ activeSource: 'adsb' });
    await renderSelector();

    expect(screen.getByText('ADS-B Exchange')).toBeInTheDocument();
  });

  it('renders adsb.lol label when adsblol is active', async () => {
    useFlightStore.setState({ activeSource: 'adsblol' });
    await renderSelector();

    expect(screen.getByText('adsb.lol')).toBeInTheDocument();
  });

  it('clicking the button toggles dropdown open/closed', async () => {
    await renderSelector();

    const button = screen.getByRole('combobox');

    // Dropdown should be closed initially
    expect(screen.queryByRole('option')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(button);
    expect(screen.getAllByRole('option')).toHaveLength(3);

    // Click again to close
    fireEvent.click(button);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('shows 3 options in dropdown', async () => {
    await renderSelector();

    fireEvent.click(screen.getByRole('combobox'));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toContain('OpenSky');
    expect(options[1].textContent).toContain('ADS-B Exchange');
    expect(options[2].textContent).toContain('adsb.lol');
  });

  it('selecting a different source calls setActiveSource and closes dropdown', async () => {
    const setActiveSource = vi.fn();
    useFlightStore.setState({ setActiveSource });

    await renderSelector();

    // Open dropdown
    fireEvent.click(screen.getByRole('combobox'));

    // Click ADS-B Exchange option
    const options = screen.getAllByRole('option');
    const adsbOption = options.find(o => o.textContent?.includes('ADS-B Exchange'));
    expect(adsbOption).toBeDefined();
    fireEvent.click(adsbOption!);

    // Should have called setActiveSource with 'adsb'
    expect(setActiveSource).toHaveBeenCalledWith('adsb');

    // Dropdown should be closed
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('selecting the already-active source closes dropdown without calling setActiveSource', async () => {
    const setActiveSource = vi.fn();
    useFlightStore.setState({ setActiveSource });

    await renderSelector();

    // Open dropdown
    fireEvent.click(screen.getByRole('combobox'));

    // Click OpenSky (already active)
    const options = screen.getAllByRole('option');
    const openskyOption = options.find(o => o.textContent?.includes('OpenSky'));
    fireEvent.click(openskyOption!);

    // Should NOT call setActiveSource
    expect(setActiveSource).not.toHaveBeenCalled();

    // Dropdown should be closed
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('status badge shows flight count when connected', async () => {
    useFlightStore.setState({ connectionStatus: 'connected', flightCount: 247 });
    await renderSelector();

    expect(screen.getByText('247 flights')).toBeInTheDocument();
  });

  it('status badge shows "Rate limited" when rate_limited', async () => {
    useFlightStore.setState({ connectionStatus: 'rate_limited' });
    await renderSelector();

    expect(screen.getByText('Rate limited')).toBeInTheDocument();
  });

  it('status dot uses correct color class for each connection status', async () => {
    const statusClasses: Record<string, string> = {
      connected: 'bg-accent-green',
      stale: 'bg-accent-yellow',
      error: 'bg-accent-red',
      rate_limited: 'bg-accent-red',
      loading: 'bg-text-muted',
    };

    for (const [status, expectedClass] of Object.entries(statusClasses)) {
      useFlightStore.setState({ connectionStatus: status as import('@/stores/flightStore').ConnectionStatus });

      const { unmount } = await renderSelector();
      const dot = document.querySelector('[data-testid="status-dot"]');
      expect(dot, `dot should exist for status: ${status}`).toBeTruthy();
      expect(dot!.className, `expected ${expectedClass} for status: ${status}`).toContain(expectedClass);
      unmount();
    }
  });

  it('loading state shows pulsing dot', async () => {
    useFlightStore.setState({ connectionStatus: 'loading' });
    await renderSelector();

    const dot = document.querySelector('[data-testid="status-dot"]');
    expect(dot).toBeTruthy();
    expect(dot!.className).toContain('animate-pulse');
  });

  it('clicking outside the dropdown closes it', async () => {
    await renderSelector();

    // Open dropdown
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(3);

    // Click outside (on document body)
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  // --- New disabled-state tests ---

  it('disabled source has aria-disabled and "(API key required)" hint', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({
      opensky: { configured: false },
      adsb: { configured: true },
      adsblol: { configured: true },
    }));

    await renderSelector();

    // Wait for /api/sources fetch to resolve
    await waitFor(() => {
      fireEvent.click(screen.getByRole('combobox'));
      const options = screen.getAllByRole('option');
      const openskyOption = options.find(o => o.textContent?.includes('OpenSky'));
      expect(openskyOption).toBeDefined();
      expect(openskyOption!.getAttribute('aria-disabled')).toBe('true');
      expect(openskyOption!.textContent).toContain('(API key required)');
    });
  });

  it('clicking disabled source does not call setActiveSource', async () => {
    const setActiveSource = vi.fn();
    useFlightStore.setState({ setActiveSource, activeSource: 'adsblol' });

    vi.stubGlobal('fetch', mockFetchResponse({
      opensky: { configured: false },
      adsb: { configured: true },
      adsblol: { configured: true },
    }));

    await renderSelector();

    // Wait for source config to load
    await waitFor(() => {
      fireEvent.click(screen.getByRole('combobox'));
      const options = screen.getAllByRole('option');
      const openskyOption = options.find(o => o.textContent?.includes('OpenSky'));
      expect(openskyOption!.getAttribute('aria-disabled')).toBe('true');
    });

    // Click the disabled OpenSky option
    const options = screen.getAllByRole('option');
    const openskyOption = options.find(o => o.textContent?.includes('OpenSky'));
    fireEvent.click(openskyOption!);

    // Should NOT have called setActiveSource
    expect(setActiveSource).not.toHaveBeenCalled();

    // Dropdown should still be open
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('adsb.lol option is never disabled', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({
      opensky: { configured: false },
      adsb: { configured: false },
      adsblol: { configured: true },
    }));

    await renderSelector();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('combobox'));
      const options = screen.getAllByRole('option');
      const adsblolOption = options.find(o => o.textContent?.includes('adsb.lol'));
      expect(adsblolOption).toBeDefined();
      expect(adsblolOption!.getAttribute('aria-disabled')).not.toBe('true');
    });
  });

  it('works with optimistic defaults before /api/sources responds', async () => {
    // Mock fetch to never resolve (pending promise)
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    await renderSelector();

    // Open dropdown immediately -- all options should be clickable
    fireEvent.click(screen.getByRole('combobox'));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);

    // None should be disabled (optimistic default: all configured)
    for (const option of options) {
      expect(option.getAttribute('aria-disabled')).not.toBe('true');
    }
  });
});
