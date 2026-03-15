import { useEffect, useRef } from 'react';
import { useFlightStore } from '@/stores/flightStore';
import type { FlightEntity, CacheResponse } from '@/types/entities';

export const POLL_INTERVAL = 5_000;
// 60s threshold: flights at 250m/s drift ~15km, making positions meaningfully outdated
export const STALE_THRESHOLD = 60_000;

export function useFlightPolling(): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setFlightData = useFlightStore((s) => s.setFlightData);
  const setError = useFlightStore((s) => s.setError);
  const setLoading = useFlightStore((s) => s.setLoading);
  const clearStaleData = useFlightStore((s) => s.clearStaleData);

  useEffect(() => {
    const fetchFlights = async (): Promise<void> => {
      try {
        const res = await fetch('/api/flights');
        const data: CacheResponse<FlightEntity[]> = await res.json();
        setFlightData(data);
      } catch {
        setError();
      }
    };

    const checkStaleness = (): void => {
      const { lastFresh } = useFlightStore.getState();
      if (lastFresh !== null && Date.now() - lastFresh > STALE_THRESHOLD) {
        clearStaleData();
      }
    };

    const schedulePoll = (): void => {
      timeoutRef.current = setTimeout(async () => {
        await fetchFlights();
        checkStaleness();
        schedulePoll();
      }, POLL_INTERVAL);
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        fetchFlights().then(schedulePoll);
      }
    };

    // Initial fetch then start polling
    setLoading();
    fetchFlights().then(schedulePoll);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // Zustand selectors return stable references -- no stale closure risk
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
