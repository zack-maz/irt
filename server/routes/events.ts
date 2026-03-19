import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchEvents, backfillEvents } from '../adapters/gdelt.js';
import { WAR_START } from '../constants.js';
import type { ConflictEventEntity } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKFILL_STATE_PATH = join(__dirname, '..', '.backfill-state.json');

function getLastBackfillTs(): number {
  try {
    const data = JSON.parse(readFileSync(BACKFILL_STATE_PATH, 'utf8'));
    return data.lastBackfillTs ?? WAR_START;
  } catch {
    return WAR_START;
  }
}

function saveLastBackfillTs(ts: number): void {
  try {
    writeFileSync(BACKFILL_STATE_PATH, JSON.stringify({ lastBackfillTs: ts }));
  } catch { /* silently fail */ }
}

/** Accumulated events map, keyed by entity ID */
const eventMap = new Map<string, ConflictEventEntity>();

/** Merge new events into accumulator and prune events before war start */
function mergeEvents(incoming: ConflictEventEntity[]): ConflictEventEntity[] {
  for (const event of incoming) {
    eventMap.set(event.id, event);
  }
  for (const [id, event] of eventMap) {
    if (event.timestamp < WAR_START) {
      eventMap.delete(id);
    }
  }
  return Array.from(eventMap.values());
}

export const eventsRouter = Router();

eventsRouter.get('/', async (_req, res) => {
  try {
    const fresh = await fetchEvents();
    const all = mergeEvents(fresh);
    res.json({ data: all, stale: false, lastFresh: Date.now() });
  } catch (err) {
    console.error('[events] upstream error:', (err as Error).message);
    if (eventMap.size > 0) {
      // Prune stale entries even on error
      for (const [id, event] of eventMap) {
        if (event.timestamp < WAR_START) eventMap.delete(id);
      }
      res.json({ data: Array.from(eventMap.values()), stale: true, lastFresh: Date.now() });
    } else {
      throw err;
    }
  }
});

// Incremental backfill on startup
const lastTs = getLastBackfillTs();
const backfillDays = Math.ceil((Date.now() - lastTs) / (24 * 60 * 60 * 1000));

if (backfillDays > 0) {
  backfillEvents(backfillDays)
    .then((events) => {
      mergeEvents(events);
      saveLastBackfillTs(Date.now());
      console.log(`[events] backfill loaded ${eventMap.size} events (${backfillDays} days from ${new Date(lastTs).toISOString()})`);
    })
    .catch((err) => {
      console.error('[events] backfill failed:', (err as Error).message);
    });
}
