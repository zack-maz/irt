import type { CacheResponse } from '../types.js';

export class EntityCache<T> {
  private entry: { data: T; fetchedAt: number } | null = null;
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get(): CacheResponse<T> | null {
    if (!this.entry) return null;
    const age = Date.now() - this.entry.fetchedAt;
    return {
      data: this.entry.data,
      stale: age > this.ttlMs,
      lastFresh: this.entry.fetchedAt,
    };
  }

  set(data: T): void {
    this.entry = { data, fetchedAt: Date.now() };
  }

  clear(): void {
    this.entry = null;
  }
}
