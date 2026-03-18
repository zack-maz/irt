// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Sample valid ADS-B Exchange V2 aircraft object
const validAircraft = {
  hex: 'a9cee9',
  flight: 'IRN1234 ',
  lat: 35.6,
  lon: 51.5,
  alt_baro: 38000, // feet
  gs: 338.9, // knots
  track: 276.1, // degrees
  baro_rate: 512, // ft/min
  r: 'EP-ICA',
  dbFlags: 0,
};

describe('ADS-B Exchange Adapter', () => {
  let fetchFlights: typeof import('../../adapters/adsb-exchange.js').fetchFlights;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T00:00:00Z'));

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // Set API key env var for tests
    process.env.ADSB_EXCHANGE_API_KEY = 'test-api-key';

    // Reset module state between tests
    vi.resetModules();
    const mod = await import('../../adapters/adsb-exchange.js');
    fetchFlights = mod.fetchFlights;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.ADSB_EXCHANGE_API_KEY;
  });

  // normalizeAircraft tests are now in adsb-v2-normalize.test.ts (shared normalizer)

  describe('fetchFlights', () => {
    it('calls RapidAPI endpoint with correct URL and headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ac: [validAircraft],
          msg: 'No error',
          now: Date.now(),
          total: 1,
        }),
      });

      await fetchFlights();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('adsbexchange-com1.p.rapidapi.com');
      expect(url).toContain('/v2/lat/28/lon/45/dist/1200/');
      expect(options.headers['X-RapidAPI-Key']).toBe('test-api-key');
      expect(options.headers['X-RapidAPI-Host']).toBe('adsbexchange-com1.p.rapidapi.com');
    });

    it('throws RateLimitError on 429 response', async () => {
      const { RateLimitError } = await import('../../types.js');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Rate limit exceeded' }),
      });

      await expect(fetchFlights()).rejects.toThrow(RateLimitError);
    });

    it('throws generic error on non-429 error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      await expect(fetchFlights()).rejects.toThrow('ADS-B Exchange API error: 500');
    });

    it('normalizes aircraft and includes ground traffic', async () => {
      const groundAircraft = { ...validAircraft, hex: 'gnd001', alt_baro: 'ground' as const };
      const noPosition = { ...validAircraft, hex: 'nop001', lat: undefined, lon: undefined };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ac: [validAircraft, groundAircraft, noPosition],
          msg: 'No error',
          now: Date.now(),
          total: 3,
        }),
      });

      const flights = await fetchFlights();
      expect(flights).toHaveLength(2); // valid + ground, not no-position
      expect(flights[0].data.icao24).toBe('a9cee9');
      expect(flights[0].data.onGround).toBe(false);
      expect(flights[1].data.icao24).toBe('gnd001');
      expect(flights[1].data.onGround).toBe(true);
    });

    it('returns empty array when ac is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ac: null,
          msg: 'No error',
          now: Date.now(),
          total: 0,
        }),
      });

      const flights = await fetchFlights();
      expect(flights).toHaveLength(0);
    });
  });
});
