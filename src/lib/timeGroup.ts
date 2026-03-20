/** Time group buckets for notification sections. */
export type TimeGroup = 'last_hour' | 'last_day' | 'last_week';

/** Human-readable labels for each time group. */
export const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  last_hour: 'Last Hour',
  last_day: 'Last 24 Hours',
  last_week: 'Last Week',
};

/** Ordered array of time groups (most recent first). */
export const TIME_GROUP_ORDER: TimeGroup[] = ['last_hour', 'last_day', 'last_week'];

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/**
 * Categorize a Unix ms timestamp into a time group bucket.
 *
 * - last_hour: timestamp is less than 1 hour ago
 * - last_day: timestamp is less than 24 hours ago (but >= 1 hour)
 * - last_week: anything older (>= 24 hours)
 */
export function getTimeGroup(timestamp: number): TimeGroup {
  const ageMs = Date.now() - timestamp;

  if (ageMs < ONE_HOUR_MS) return 'last_hour';
  if (ageMs < ONE_DAY_MS) return 'last_day';
  return 'last_week';
}
