/**
 * Faction assignment system for Middle East political boundaries.
 * Maps countries to alliance blocs by ISO A3 code.
 */
export type Faction = 'us' | 'iran' | 'neutral';

/**
 * ISO A3 code -> faction mapping.
 * Only non-neutral countries are listed; all others default to 'neutral'.
 */
export const FACTION_ASSIGNMENTS: Record<string, Faction> = {
  // US-aligned
  ISR: 'us',
  SAU: 'us',
  ARE: 'us',
  BHR: 'us',
  JOR: 'us',
  KWT: 'us',
  EGY: 'us',
  // Iran-aligned
  IRN: 'iran',
  SYR: 'iran',
  YEM: 'iran',
};

/** Faction display colors (muted military palette). */
export const FACTION_COLORS: Record<Faction, string> = {
  us: '#3b82f6',
  iran: '#dc2626',
  neutral: '#64748b',
};

/** Look up faction for a country by ISO A3 code. Returns 'neutral' for unlisted countries. */
export function getFaction(isoA3: string): Faction {
  return FACTION_ASSIGNMENTS[isoA3] ?? 'neutral';
}
