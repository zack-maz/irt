import type { ConflictEventType } from '@/types/ui';

/**
 * Distinct red-spectrum color for each ConflictEventType.
 * Chosen to avoid clashing with yellow flights, purple ships, or green sites.
 */
export const EVENT_TYPE_COLORS: Record<ConflictEventType, string> = {
  airstrike: '#ff3b30', // bright red
  on_ground: '#c0392b', // dark red
  explosion: '#e74c3c', // orange-red
  targeted: '#dc143c', // crimson
  other: '#800000', // maroon
};

/** RGBA tuples for deck.gl layers, derived from EVENT_TYPE_COLORS */
export const EVENT_TYPE_RGBA: Record<ConflictEventType, readonly [number, number, number]> = {
  airstrike: [255, 59, 48],
  on_ground: [192, 57, 43],
  explosion: [231, 76, 60],
  targeted: [220, 20, 60],
  other: [128, 0, 0],
};
