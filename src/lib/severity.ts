import type { ConflictEventEntity, ConflictEventType } from '../../server/types';

export type SeverityLevel = 'high' | 'medium' | 'low';

/** High/Medium/Low thresholds for the static score */
export const HIGH_THRESHOLD = 50;
export const MEDIUM_THRESHOLD = 15;

/**
 * Type-based severity weights for conflict event types.
 * Higher weight = more severe/newsworthy event type.
 */
export const TYPE_WEIGHTS: Record<ConflictEventType, number> = {
  airstrike: 10,
  wmd: 10,
  mass_violence: 9,
  assassination: 8,
  bombing: 7,
  shelling: 7,
  ground_combat: 6,
  abduction: 5,
  ceasefire_violation: 4,
  assault: 3,
  blockade: 2,
};

/**
 * Compute a severity score for a conflict event.
 *
 * Formula: typeWeight * log2(1 + mentions) * log2(1 + sources) * recencyDecay
 *
 * - Type weight: based on event type (airstrike=10, blockade=2, etc.)
 * - Mentions/sources: logarithmic scaling to dampen outliers
 * - Recency decay: 1 / (1 + ageHours / 24) — ~24h half-life
 *
 * Returns a positive number. Higher = more severe/urgent.
 */
export function computeSeverityScore(event: ConflictEventEntity): number {
  const typeWeight = TYPE_WEIGHTS[event.type] ?? 3;
  const mentions = event.data.numMentions ?? 1;
  const sources = event.data.numSources ?? 1;

  const ageMs = Math.max(0, Date.now() - event.timestamp);
  const ageHours = ageMs / (1000 * 60 * 60);
  const recencyDecay = 1 / (1 + ageHours / 24);

  return typeWeight * Math.log2(1 + mentions) * Math.log2(1 + sources) * recencyDecay;
}

/**
 * Classify severity for filtering purposes (no recency decay).
 * Uses typeWeight * log2(1 + mentions) * log2(1 + sources).
 */
export function classifySeverity(event: ConflictEventEntity): SeverityLevel {
  const typeWeight = TYPE_WEIGHTS[event.type] ?? 3;
  const mentions = event.data.numMentions ?? 1;
  const sources = event.data.numSources ?? 1;
  const score = typeWeight * Math.log2(1 + mentions) * Math.log2(1 + sources);
  if (score > HIGH_THRESHOLD) return 'high';
  if (score > MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}
