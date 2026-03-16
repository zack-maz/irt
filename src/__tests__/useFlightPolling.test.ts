import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { useFlightStore } from '@/stores/flightStore';

// Mock localStorage for flightStore's loadPersistedSource
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

const mockResponse = {
  data: [],
  stale: false,
  lastFresh: Date.now(),
};

describe('useFlightPolling', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();

    // Reset flight store
    useFlightStore.setState({
      flights: [],
      connectionStatus: 'loading',
      lastFetchAt: null,
      lastFresh: null,
      flightCount: 0,
      activeSource: 'opensky',
    });

    // Mock fetch
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    // Default: tab is visible
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls fetch with source=opensky on mount when activeSource is opensky', async () => {
    useFlightStore.setState({ activeSource: 'opensky' });

    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    // Flush the microtask queue so the initial fetch completes
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/flights?source=opensky');
  });

  it('fetches /api/flights?source=adsb when activeSource is adsb', async () => {
    useFlightStore.setState({ activeSource: 'adsb' });

    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/flights?source=adsb');
  });

  it('polls again after OPENSKY_POLL_INTERVAL (5000ms) for opensky', async () => {
    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    // Initial fetch
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance past poll interval
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('polls at ADSB_POLL_INTERVAL (260000ms) for adsb source', async () => {
    useFlightStore.setState({ activeSource: 'adsb' });

    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    // Initial fetch
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // After 5s (OpenSky interval) -- should NOT poll again
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // After 260s total -- should have polled again
    await vi.advanceTimersByTimeAsync(255000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fetches /api/flights?source=adsblol for adsblol source', async () => {
    useFlightStore.setState({ activeSource: 'adsblol' });

    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/flights?source=adsblol');
  });

  it('uses 30s interval for adsblol source', async () => {
    useFlightStore.setState({ activeSource: 'adsblol' });

    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    // Initial fetch
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // After 5s (OpenSky interval) -- should NOT poll again
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // After 30s total -- should have polled again
    await vi.advanceTimersByTimeAsync(25000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('restarts polling when activeSource changes in the store', async () => {
    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    const { rerender } = renderHook(() => useFlightPolling());

    // Initial fetch with opensky
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/flights?source=opensky');

    // Change source -- this triggers re-render due to selector
    act(() => {
      useFlightStore.getState().setActiveSource('adsb');
    });
    rerender();

    // New effect runs, immediate fetch with new source
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledWith('/api/flights?source=adsb');
  });

  it('rate limited response propagates rateLimited flag to store', async () => {
    const rateLimitedResponse = {
      data: [{ id: 'flight-1', type: 'flight', lat: 32, lng: 53, timestamp: Date.now(), label: 'TEST', data: {} }],
      stale: true,
      lastFresh: Date.now(),
      rateLimited: true,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rateLimitedResponse),
    });

    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    await vi.advanceTimersByTimeAsync(0);

    const state = useFlightStore.getState();
    expect(state.connectionStatus).toBe('rate_limited');
  });

  it('pauses polling when tab becomes hidden', async () => {
    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Tab goes hidden
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    // Advance well past poll interval -- should not trigger another fetch
    await vi.advanceTimersByTimeAsync(10000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('resumes with immediate fetch when tab becomes visible', async () => {
    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Tab goes hidden
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    // Tab comes back visible
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(2); // Immediate fetch on visibility
  });

  it('clears timeout on unmount', async () => {
    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    const { unmount } = renderHook(() => useFlightPolling());

    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    unmount();

    // Advance time -- should not trigger another fetch
    await vi.advanceTimersByTimeAsync(10000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
