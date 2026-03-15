// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { Server } from 'node:http';

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
