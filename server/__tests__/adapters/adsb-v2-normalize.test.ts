// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Sample valid ADS-B V2 aircraft object
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

describe('ADS-B V2 Shared Normalizer', () => {
  let normalizeAircraft: typeof import('../../adapters/adsb-v2-normalize.js').normalizeAircraft;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T00:00:00Z'));

    vi.resetModules();
    const mod = await import('../../adapters/adsb-v2-normalize.js');
    normalizeAircraft = mod.normalizeAircraft;
  });

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

  it('includes ground aircraft with onGround=true and null altitude', () => {
    const ground = { ...validAircraft, alt_baro: 'ground' as const };
    const result = normalizeAircraft(ground);

    expect(result).not.toBeNull();
    expect(result!.data.onGround).toBe(true);
    expect(result!.data.altitude).toBeNull();
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
