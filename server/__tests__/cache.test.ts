// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EntityCache } from '../cache/entityCache.js';

describe('EntityCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('get() returns null on empty cache', () => {
    const cache = new EntityCache<string[]>(10_000);
    expect(cache.get()).toBeNull();
  });

  it('set() then get() returns data with stale: false within TTL', () => {
    const cache = new EntityCache<string[]>(10_000);
    const now = Date.now();
    cache.set(['a', 'b', 'c']);

    const result = cache.get();
    expect(result).not.toBeNull();
    expect(result!.data).toEqual(['a', 'b', 'c']);
    expect(result!.stale).toBe(false);
    expect(result!.lastFresh).toBeGreaterThanOrEqual(now);
  });

  it('get() returns stale: true after TTL expires', () => {
    const cache = new EntityCache<string[]>(10_000);
    cache.set(['fresh']);

    // Advance time beyond TTL
    vi.advanceTimersByTime(10_001);

    const result = cache.get();
    expect(result).not.toBeNull();
    expect(result!.data).toEqual(['fresh']);
    expect(result!.stale).toBe(true);
  });

  it('set() overwrites previous data', () => {
    const cache = new EntityCache<number[]>(10_000);
    cache.set([1, 2, 3]);
    cache.set([4, 5, 6]);

    const result = cache.get();
    expect(result).not.toBeNull();
    expect(result!.data).toEqual([4, 5, 6]);
    expect(result!.stale).toBe(false);
  });

  it('clear() makes get() return null', () => {
    const cache = new EntityCache<string[]>(10_000);
    cache.set(['data']);
    expect(cache.get()).not.toBeNull();

    cache.clear();
    expect(cache.get()).toBeNull();
  });
});
