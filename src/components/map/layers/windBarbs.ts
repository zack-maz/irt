/**
 * SVG wind barb generator with pre-cached icons.
 * Classic meteorological wind barb notation:
 * - Triangle = 50 knots
 * - Long barb = 10 knots
 * - Short barb = 5 knots
 */

/**
 * Generate an SVG wind barb for a given speed in knots.
 * SVG viewBox: 32x64, staff centered at x=16.
 */
export function generateWindBarbSVG(speedKnots: number): string {
  // Round to nearest 5
  const rounded = Math.round(speedKnots / 5) * 5;

  const elements: string[] = [];

  // Staff line (always present)
  elements.push(
    '<line x1="16" y1="4" x2="16" y2="56" stroke="white" stroke-opacity="0.6" stroke-width="1.5"/>',
  );

  if (rounded === 0) {
    // Calm: just the staff
    return wrapSVG(elements);
  }

  let remaining = rounded;
  let yPos = 4; // Start from top of staff

  // Triangles for 50kn increments
  while (remaining >= 50) {
    elements.push(
      `<polygon points="16,${yPos} 28,${yPos + 4} 16,${yPos + 8}" fill="white" fill-opacity="0.6"/>`,
    );
    yPos += 8;
    remaining -= 50;
  }

  // Long barbs for 10kn increments
  while (remaining >= 10) {
    elements.push(
      `<line x1="16" y1="${yPos}" x2="28" y2="${yPos - 4}" stroke="white" stroke-opacity="0.6" stroke-width="1.5"/>`,
    );
    yPos += 6;
    remaining -= 10;
  }

  // Short barb for 5kn
  if (remaining >= 5) {
    elements.push(
      `<line x1="16" y1="${yPos}" x2="22" y2="${yPos - 3}" stroke="white" stroke-opacity="0.6" stroke-width="1.5"/>`,
    );
  }

  return wrapSVG(elements);
}

function wrapSVG(elements: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 64" width="32" height="64">${elements.join('')}</svg>`;
}

/** Pre-cached wind barb icons for 0 to 100 knots in 5-knot steps */
const BARB_ICON_CACHE = new Map<number, string>();

for (let speed = 0; speed <= 100; speed += 5) {
  BARB_ICON_CACHE.set(
    speed,
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generateWindBarbSVG(speed))}`,
  );
}

/**
 * Get a pre-cached wind barb icon URL for a given speed.
 * Quantizes to nearest 5 knots and clamps to 0-100 range.
 */
export function getWindBarbIcon(speedKnots: number): string {
  const quantized = Math.round(speedKnots / 5) * 5;
  const clamped = Math.max(0, Math.min(100, quantized));
  return BARB_ICON_CACHE.get(clamped)!;
}
