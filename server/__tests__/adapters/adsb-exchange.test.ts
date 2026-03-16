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
  let normalizeAircraft: typeof import('../../adapters/adsb-exchange.js').normalizeAircraft;
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
    normalizeAircraft = mod.normalizeAircraft;
    fetchFlights = mod.fetchFlights;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.ADSB_EXCHANGE_API_KEY;
  });

  describe('normalizeAircraft', () => {
    it('converts a valid V2 aircraft to FlightEntity with correct unit conversions', () => {
      const result = normalizeAircraft(validAircraft);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('flight-a9cee9');
      expect(result!.type).toBe('flight');
      expect(result!.lat).toBe(35.6);
      expect(result!.lng).toBe(51.5);
      expect(result!.label).toBe('IRN1234');

      // Unit conversions
      expect(result!.data.velocity).toBeCloseTo(338.9 * 0.514444, 2); // knots -> m/s
      expect(result!.data.altitude).toBeCloseTo(38000 * 0.3048, 2); // feet -> meters
      expect(result!.data.verticalRate).toBeCloseTo(512 * 0.00508, 4); // ft/min -> m/s
      expect(result!.data.heading).toBe(276.1);
      expect(result!.data.callsign).toBe('IRN1234');
      expect(result!.data.icao24).toBe('a9cee9');
      expect(result!.data.onGround).toBe(false);
      expect(result!.data.unidentified).toBe(false);
    });

    it('returns null when lat is missing', () => {
      const noLat = { ...validAircraft, lat: undefined };
      expect(normalizeAircraft(noLat as any)).toBeNull();
    });

    it('returns null when lon is missing', () => {
      const noLon = { ...validAircraft, lon: null };
      expect(normalizeAircraft(noLon as any)).toBeNull();
    });

    it('returns null when alt_baro is the string "ground"', () => {
      const ground = { ...validAircraft, alt_baro: 'ground' as const };
      expect(normalizeAircraft(ground)).toBeNull();
    });

    it('sets unidentified=true when flight field is empty', () => {
      const noCallsign = { ...validAircraft, flight: '' };
      const result = normalizeAircraft(noCallsign);

      expect(result).not.toBeNull();
      expect(result!.data.unidentified).toBe(true);
      expect(result!.data.callsign).toBe('a9cee9');
      expect(result!.label).toBe('a9cee9');
    });

    it('sets unidentified=true when flight field is whitespace-only', () => {
      const whitespace = { ...validAircraft, flight: '    ' };
      const result = normalizeAircraft(whitespace);

      expect(result).not.toBeNull();
      expect(result!.data.unidentified).toBe(true);
    });

    it('strips tilde prefix from hex when constructing entity ID', () => {
      const tilde = { ...validAircraft, hex: '~abc123' };
      const result = normalizeAircraft(tilde);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('flight-abc123');
      // icao24 keeps original hex for display
      expect(result!.data.icao24).toBe('~abc123');
    });

    it('sets originCountry to empty string', () => {
      const result = normalizeAircraft(validAircraft);
      expect(result!.data.originCountry).toBe('');
    });

    it('handles null/undefined optional fields by setting them to null', () => {
      const minimal = {
        hex: 'abc123',
        lat: 35.0,
        lon: 51.0,
        alt_baro: 10000,
      };
      const result = normalizeAircraft(minimal as any);

      expect(result).not.toBeNull();
      expect(result!.data.velocity).toBeNull();
      expect(result!.data.heading).toBeNull();
      expect(result!.data.verticalRate).toBeNull();
    });
  });

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
      expect(url).toContain('/v2/lat/32.5/lon/53.75/dist/250/');
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

    it('filters and normalizes aircraft from response', async () => {
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
      expect(flights).toHaveLength(1);
      expect(flights[0].data.icao24).toBe('a9cee9');
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
