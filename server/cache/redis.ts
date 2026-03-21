import { Redis } from '@upstash/redis';
import type { CacheResponse } from '../types.js';

/** Shared Upstash Redis client (REST-based, safe for serverless) */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** Internal storage shape persisted in Redis */
interface CacheEntry<T> {
  data: T;
  fetchedAt: number; // Unix ms
}

/**
 * Read a cached value from Redis.
 *
 * Returns null if the key does not exist.
 * Returns { data, stale, lastFresh } — where `stale` is true when
 * the entry age exceeds `logicalTtlMs`.
 */
export async function cacheGet<T>(
  key: string,
  logicalTtlMs: number,
): Promise<CacheResponse<T> | null> {
  const entry = await redis.get<CacheEntry<T>>(key);
  if (!entry) return null;

  const stale = Date.now() - entry.fetchedAt > logicalTtlMs;
  return {
    data: entry.data,
    stale,
    lastFresh: entry.fetchedAt,
  };
}

/**
 * Write a value to Redis with a hard TTL (seconds).
 *
 * The hard TTL should be generously larger than the logical TTL so that
 * stale-but-servable data remains available for upstream error fallback.
 */
export async function cacheSet<T>(
  key: string,
  data: T,
  redisTtlSec: number,
): Promise<void> {
  const entry: CacheEntry<T> = { data, fetchedAt: Date.now() };
  await redis.set(key, entry, { ex: redisTtlSec });
}

/** Delete a cache key. Returns true if the key existed. */
export async function cacheDel(key: string): Promise<boolean> {
  const deleted = await redis.del(key);
  return deleted > 0;
}
