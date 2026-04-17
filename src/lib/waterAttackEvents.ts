/**
 * Event types that classify a water facility as "attacked" / "destroyed" (REV-5).
 *
 * Phase 27.3 root cause: the original set was `['airstrike', 'explosion']`,
 * which silently ignored targeted precision strikes on infrastructure and
 * ground combat near water facilities. This expanded set is the single
 * source of truth shared across:
 *  - `src/hooks/useWaterLayers.ts`                    (map icon color: black when attacked)
 *  - `src/components/detail/WaterFacilityDetail.tsx`  (detail panel isDestroyed -> score 0)
 *  - `src/components/counters/useCounterData.ts`      (counter dropdown metric label)
 *
 * Do not hardcode these literals anywhere else -- import this constant.
 */
export const WATER_ATTACK_EVENT_TYPES = new Set<string>([
  'airstrike',
  'explosion',
  'targeted',
  'on_ground',
]);
