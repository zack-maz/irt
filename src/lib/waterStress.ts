/**
 * Water stress color interpolation and composite health formula.
 *
 * 0-10 scale: 0 = destroyed (deep dark purple, applied externally), 1 = extreme stress (deep navy), 10 = healthy (light blue)
 * Uses sqrt curve for gracious distribution — fewer facilities cluster at extreme.
 */

import type { WaterStressIndicators } from '../../server/types';

// Re-export for convenience
export type { WaterStressIndicators };

// ---------- Color Stops ----------

/** 5-stop blue gradient: deep navy → navy → blue → sky → light blue */
export const STRESS_COLORS: [number, number, number][] = [
  [10, 20, 60], // score 1: deep navy — extreme stress
  [20, 50, 120], // score 3: navy
  [40, 100, 180], // score 5: blue
  [80, 160, 220], // score 7: sky blue
  [140, 210, 250], // score 10: light blue — healthy
];

// ---------- Color Interpolation ----------

/**
 * Map a 0-1 health value to an RGBA color tuple.
 * Linearly interpolates across the 5 color stops.
 * Clamps input to [0, 1].
 */
export function stressToRGBA(health: number, alpha = 200): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, health));
  const segment = t * (STRESS_COLORS.length - 1);
  const i = Math.floor(segment);
  const f = segment - i;
  const c0 = STRESS_COLORS[Math.min(i, STRESS_COLORS.length - 1)];
  const c1 = STRESS_COLORS[Math.min(i + 1, STRESS_COLORS.length - 1)];
  return [
    Math.round(c0[0] + (c1[0] - c0[0]) * f),
    Math.round(c0[1] + (c1[1] - c0[1]) * f),
    Math.round(c0[2] + (c1[2] - c0[2]) * f),
    alpha,
  ];
}

// ---------- Composite Health ----------

/**
 * Combine WRI Aqueduct baseline stress with precipitation anomaly
 * into a 0-1 health score.
 *
 * Uses sqrt curve so fewer facilities cluster at extreme stress.
 * BWS 4 → ~0.45 health instead of linear 0.2.
 *
 * @param bwsScore - WRI baseline water stress score (0-5, 0=low stress, 5=extreme)
 * @param precipAnomalyRatio - Ratio of actual/normal precipitation (<1 = drier, >1 = wetter)
 * @returns 0-1 health score (0=worst, 1=best)
 */
export function compositeHealth(bwsScore: number, precipAnomalyRatio: number): number {
  // Sqrt curve: spreads distribution so high-stress facilities don't all pile up at 0
  const baselineHealth = Math.sqrt(Math.max(0, 1 - bwsScore / 5));

  // Precipitation modifier: wetter = healthier, drier = worse
  const precipModifier = Math.max(-0.15, Math.min(0.15, (precipAnomalyRatio - 1.0) * 0.3));

  return Math.max(0, Math.min(1, baselineHealth + precipModifier));
}

// ---------- Score Conversion ----------

/**
 * Convert 0-1 health to 1-10 display score.
 */
export function healthToScore(health: number): number {
  return Math.max(1, Math.min(10, Math.round(health * 9) + 1));
}

/**
 * Label for a 0-10 score.
 * Score 0 = Destroyed (applied externally in useWaterLayers when facility has destructive events within 5km).
 */
export function scoreToLabel(score: number): string {
  if (score === 0) return 'Destroyed';
  if (score <= 2) return 'Extreme Stress';
  if (score <= 4) return 'High Stress';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'Good';
  return 'Healthy';
}

// ---------- BWS Label ----------

/**
 * Map a WRI baseline water stress score (0-5) to a human-readable label.
 */
export function bwsScoreToLabel(score: number): string {
  if (score < 1) return 'Low';
  if (score < 2) return 'Low-Medium';
  if (score < 3) return 'Medium-High';
  if (score < 4) return 'High';
  return 'Extremely High';
}

// ---------- Legend ----------

/** Color stops for legend registration (0-10 scale) */
export const WATER_STRESS_LEGEND_STOPS: { color: string; label: string }[] = [
  { color: '#2d0a4e', label: '0 — Destroyed' },
  { color: '#0a143c', label: '1 — Extreme' },
  { color: '#143278', label: '' },
  { color: '#2864b4', label: '5 — Moderate' },
  { color: '#50a0dc', label: '' },
  { color: '#8cd2fa', label: '10 — Healthy' },
];
