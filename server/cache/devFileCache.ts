/**
 * Dev-only local file cache for LLM-enriched events.
 *
 * Prevents re-running the entire LLM pipeline (43+ batches) on every
 * dev server restart. Writes JSON to .dev-cache/ after LLM completion;
 * reads it back as a fallback when Redis LLM cache is empty.
 *
 * Only active when NODE_ENV !== 'production'. Production always uses Redis.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../lib/logger.js';

const log = logger.child({ module: 'dev-file-cache' });

const DEV_CACHE_DIR = join(process.cwd(), '.dev-cache');
const LLM_EVENTS_FILE = join(DEV_CACHE_DIR, 'llm-events.json');

/** Max age for dev cache file (6 hours) — stale data is worse than re-processing */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const isDev = process.env.NODE_ENV !== 'production';

interface DevCacheEntry<T> {
  data: T;
  savedAt: number;
}

/**
 * Save LLM events to local file. No-op in production.
 */
export function saveDevLLMCache<T>(data: T): void {
  if (!isDev) return;
  try {
    if (!existsSync(DEV_CACHE_DIR)) {
      mkdirSync(DEV_CACHE_DIR, { recursive: true });
    }
    const entry: DevCacheEntry<T> = { data, savedAt: Date.now() };
    writeFileSync(LLM_EVENTS_FILE, JSON.stringify(entry));
    log.info('saved LLM events to dev file cache');
  } catch (err) {
    log.warn({ err }, 'failed to write dev file cache');
  }
}

/**
 * Load LLM events from local file. Returns null if not in dev mode,
 * file doesn't exist, or data is too old.
 */
export function loadDevLLMCache<T>(): T | null {
  if (!isDev) return null;
  try {
    if (!existsSync(LLM_EVENTS_FILE)) return null;
    const raw = readFileSync(LLM_EVENTS_FILE, 'utf-8');
    const entry = JSON.parse(raw) as DevCacheEntry<T>;
    const age = Date.now() - entry.savedAt;
    if (age > MAX_AGE_MS) {
      log.info({ ageMs: age }, 'dev file cache too old, ignoring');
      return null;
    }
    log.info(
      { ageMs: age, ageMin: Math.round(age / 60_000) },
      'loaded LLM events from dev file cache',
    );
    return entry.data;
  } catch (err) {
    log.warn({ err }, 'failed to read dev file cache');
    return null;
  }
}
