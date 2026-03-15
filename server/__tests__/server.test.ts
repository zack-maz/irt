// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { Server } from 'node:http';
import type { FlightEntity } from '../types.js';

// Mock config before importing createApp
vi.mock('../config.js', () => ({
  loadConfig: () => ({
    port: 0,
    corsOrigin: 'http://localhost:5173',
    opensky: { clientId: 'test', clientSecret: 'test' },
    aisstream: { apiKey: 'test' },
    acled: { email: 'test', password: 'test' },
  }),
  getConfig: () => ({
    port: 0,
    corsOrigin: 'http://localhost:5173',
    opensky: { clientId: 'test', clientSecret: 'test' },
    aisstream: { apiKey: 'test' },
    acled: { email: 'test', password: 'test' },
  }),
  config: {
    port: 0,
    corsOrigin: 'http://localhost:5173',
    opensky: { clientId: 'test', clientSecret: 'test' },
    aisstream: { apiKey: 'test' },
    acled: { email: 'test', password: 'test' },
  },
}));

// Mock OpenSky adapter for flight route tests
const mockFetchFlights = vi.fn();
vi.mock('../adapters/opensky.js', () => ({
  fetchFlights: (...args: unknown[]) => mockFetchFlights(...args),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const { createApp } = await import('../index.js');
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

describe('Express server', () => {
  it('GET /health returns 200 with { status: "ok" }', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('unknown route returns 404', async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('CORS Access-Control-Allow-Origin header is set for configured origin', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173'
    );
  });
});

describe('Flights route cache-first behavior', () => {
  const mockFlights: FlightEntity[] = [
    {
      id: 'flight-abc123',
      type: 'flight',
      lat: 35.6,
      lng: 51.5,
      timestamp: Date.now(),
      label: 'IRN1234',
      data: {
        icao24: 'abc123',
        callsign: 'IRN1234',
        originCountry: 'Iran',
        velocity: 250,
        heading: 180,
        altitude: 10000,
        onGround: false,
        verticalRate: -5.0,
        unidentified: false,
      },
    },
  ];

  beforeEach(() => {
    mockFetchFlights.mockReset();
    mockFetchFlights.mockResolvedValue(mockFlights);
  });

  it('serves cached data on second request without calling upstream again', async () => {
    // First request: should call upstream fetchFlights
    const res1 = await fetch(`${baseUrl}/api/flights`);
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as { data: FlightEntity[]; stale: boolean };
    expect(body1.data).toHaveLength(1);
    expect(body1.stale).toBe(false);
    expect(mockFetchFlights).toHaveBeenCalledTimes(1);

    // Second request: should serve from cache (no upstream call)
    const res2 = await fetch(`${baseUrl}/api/flights`);
    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as { data: FlightEntity[]; stale: boolean };
    expect(body2.data).toHaveLength(1);
    expect(body2.stale).toBe(false);

    // fetchFlights should NOT have been called again
    expect(mockFetchFlights).toHaveBeenCalledTimes(1);
  });
});
