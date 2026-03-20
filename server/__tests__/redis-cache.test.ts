// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// In-memory store backing the mock Redis
const store = new Map<string, unknown>();

vi.mock('@upstash/redis', () => {
  class Redis {
    async get<T>(key: string): Promise<T | null> {
      const val = store.get(key);
      return (val as T) ?? null;
    }
    async set(
      key: string,
      value: unknown,
      opts?: { ex?: number },
    ): Promise<'OK'> {
      void opts; // Redis TTL not tracked in mock
      store.set(key, value);
      return 'OK';
    }
  }
  return { Redis };
});

describe('Redis cache helpers', () => {
  beforeEach(() => {
    store.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cacheGet returns null when key does not exist', async () => {
    const { cacheGet } = await import('../cache/redis.js');
    const result = await cacheGet('nonexistent', 10_000);
    expect(result).toBeNull();
  });

  it('cacheGet returns { stale: false } when data is within logical TTL', async () => {
    const { cacheGet, cacheSet } = await import('../cache/redis.js');
    const now = Date.now();

    await cacheSet('test:fresh', ['a', 'b'], 100);

    const result = await cacheGet<string[]>('test:fresh', 10_000);
    expect(result).not.toBeNull();
    expect(result!.data).toEqual(['a', 'b']);
    expect(result!.stale).toBe(false);
    expect(result!.lastFresh).toBeGreaterThanOrEqual(now);
  });

  it('cacheGet returns { stale: true } when data exceeds logical TTL', async () => {
    const { cacheGet, cacheSet } = await import('../cache/redis.js');

    await cacheSet('test:stale', ['old'], 100);

    // Advance past the 10s logical TTL
    vi.advanceTimersByTime(10_001);

    const result = await cacheGet<string[]>('test:stale', 10_000);
    expect(result).not.toBeNull();
    expect(result!.data).toEqual(['old']);
    expect(result!.stale).toBe(true);
  });

  it('cacheSet stores { data, fetchedAt } with redis set call', async () => {
    const { cacheSet } = await import('../cache/redis.js');

    await cacheSet('test:store', { foo: 'bar' }, 60);

    const stored = store.get('test:store') as { data: unknown; fetchedAt: number };
    expect(stored).toBeDefined();
    expect(stored.data).toEqual({ foo: 'bar' });
    expect(typeof stored.fetchedAt).toBe('number');
  });

  it('module exports cacheGet, cacheSet, and redis client', async () => {
    const mod = await import('../cache/redis.js');
    expect(typeof mod.cacheGet).toBe('function');
    expect(typeof mod.cacheSet).toBe('function');
    expect(mod.redis).toBeDefined();
  });
});
