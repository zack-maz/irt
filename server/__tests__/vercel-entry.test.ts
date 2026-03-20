// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { Server } from 'node:http';

// Mock config before importing the entry point
vi.mock('../config.js', () => ({
  loadConfig: () => ({
    port: 0,
    corsOrigin: '*',
    opensky: { clientId: '', clientSecret: '' },
    aisstream: { apiKey: '' },
    acled: { email: '', password: '' },
  }),
  getConfig: () => ({
    port: 0,
    corsOrigin: '*',
    opensky: { clientId: '', clientSecret: '' },
    aisstream: { apiKey: '' },
    acled: { email: '', password: '' },
  }),
  config: {
    port: 0,
    corsOrigin: '*',
    opensky: { clientId: '', clientSecret: '' },
    aisstream: { apiKey: '' },
    acled: { email: '', password: '' },
  },
}));

// Mock rate limiter -- pass through
vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock adapters
vi.mock('../adapters/opensky.js', () => ({
  fetchFlights: vi.fn(async () => []),
}));
vi.mock('../adapters/adsb-exchange.js', () => ({
  fetchFlights: vi.fn(async () => []),
}));
vi.mock('../adapters/adsb-lol.js', () => ({
  fetchFlights: vi.fn(async () => []),
}));
vi.mock('../adapters/aisstream.js', () => ({
  getShips: vi.fn(() => []),
  getLastMessageTime: vi.fn(() => 0),
  connectAISStream: vi.fn(),
  collectShips: vi.fn(async () => []),
}));
vi.mock('../adapters/gdelt.js', () => ({
  fetchEvents: vi.fn(async () => []),
}));

// Mock Redis cache module
vi.mock('../cache/redis.js', () => ({
  redis: {},
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => undefined),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const mod = await import('../../api/index.js');
  const app = mod.default;

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

describe('Vercel entry point (api/index.ts)', () => {
  it('has a default export', async () => {
    const mod = await import('../../api/index.js');
    expect(mod.default).toBeDefined();
  });

  it('default export is a function (Express app)', async () => {
    const mod = await import('../../api/index.js');
    expect(typeof mod.default).toBe('function');
  });

  it('GET /health returns 200 with { status: "ok" }', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
