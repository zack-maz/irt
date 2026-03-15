import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useFlightStore } from '@/stores/flightStore';

// Must be imported after store since the hook depends on it
// The actual hook will be imported dynamically after we set up mocks

const mockResponse = {
  data: [],
  stale: false,
  lastFresh: Date.now(),
};

describe('useFlightPolling', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    // Reset flight store
    useFlightStore.setState({
      flights: [],
      connectionStatus: 'loading',
      lastFetchAt: null,
      lastFresh: null,
      flightCount: 0,
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

  it('calls fetch once on mount', async () => {
    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    // Flush the microtask queue so the initial fetch completes
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/flights');
  });

  it('polls again after POLL_INTERVAL (5000ms)', async () => {
    const { useFlightPolling } = await import('@/hooks/useFlightPolling');
    renderHook(() => useFlightPolling());

    // Initial fetch
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance past poll interval
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
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
