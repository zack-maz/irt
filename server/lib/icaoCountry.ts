/**
 * ICAO 24-bit address prefix → country lookup.
 * Based on ICAO Annex 10, Vol III — address block allocations.
 * Sources: aerotransport.org/html/ICAO_hex_decode.html, kloth.net/radio/icao-id.php
 * Covers Middle East + major aviation countries relevant to the conflict monitor.
 * Returns empty string for unrecognized prefixes.
 */

interface PrefixRange {
  start: number;
  end: number;
  country: string;
}

// Sorted by start address for binary search
const ICAO_RANGES: PrefixRange[] = [
  { start: 0x008000, end: 0x00ffff, country: 'South Africa' },
  { start: 0x010000, end: 0x017fff, country: 'Egypt' },
  { start: 0x018000, end: 0x01ffff, country: 'Libya' },
  { start: 0x020000, end: 0x027fff, country: 'Morocco' },
  { start: 0x028000, end: 0x02ffff, country: 'Tunisia' },
  { start: 0x040000, end: 0x040fff, country: 'Ethiopia' },
  { start: 0x04c000, end: 0x04cfff, country: 'Kenya' },
  { start: 0x06a000, end: 0x06a3ff, country: 'Qatar' },
  { start: 0x0a0000, end: 0x0a7fff, country: 'Algeria' },
  { start: 0x100000, end: 0x1fffff, country: 'Russia' },
  { start: 0x300000, end: 0x33ffff, country: 'Italy' },
  { start: 0x380000, end: 0x3bffff, country: 'France' },
  { start: 0x3c0000, end: 0x3fffff, country: 'Germany' },
  { start: 0x400000, end: 0x43ffff, country: 'UK' },
  { start: 0x468000, end: 0x46ffff, country: 'Greece' },
  { start: 0x4b8000, end: 0x4bffff, country: 'Turkey' },
  { start: 0x706000, end: 0x706fff, country: 'Kuwait' },
  { start: 0x70c000, end: 0x70c3ff, country: 'Oman' },
  { start: 0x710000, end: 0x717fff, country: 'Saudi Arabia' },
  { start: 0x718000, end: 0x71ffff, country: 'South Korea' },
  { start: 0x720000, end: 0x727fff, country: 'Yemen' },
  { start: 0x728000, end: 0x72ffff, country: 'Iraq' },
  { start: 0x730000, end: 0x737fff, country: 'Iran' },
  { start: 0x738000, end: 0x73ffff, country: 'Israel' },
  { start: 0x740000, end: 0x747fff, country: 'Jordan' },
  { start: 0x748000, end: 0x74ffff, country: 'Lebanon' },
  { start: 0x750000, end: 0x757fff, country: 'Malaysia' },
  { start: 0x760000, end: 0x767fff, country: 'Pakistan' },
  { start: 0x768000, end: 0x76ffff, country: 'Singapore' },
  { start: 0x778000, end: 0x77ffff, country: 'Syria' },
  { start: 0x780000, end: 0x7bffff, country: 'China' },
  { start: 0x7c0000, end: 0x7fffff, country: 'Australia' },
  { start: 0x800000, end: 0x83ffff, country: 'India' },
  { start: 0x840000, end: 0x87ffff, country: 'Japan' },
  { start: 0x880000, end: 0x887fff, country: 'Thailand' },
  { start: 0x890000, end: 0x890fff, country: 'Yemen' },
  { start: 0x894000, end: 0x894fff, country: 'Bahrain' },
  { start: 0x896000, end: 0x896fff, country: 'UAE' },
  { start: 0x8a0000, end: 0x8a7fff, country: 'Indonesia' },
  { start: 0xa00000, end: 0xafffff, country: 'USA' },
  { start: 0xc00000, end: 0xc3ffff, country: 'Canada' },
];

/**
 * Resolve ICAO24 hex address to country of registration.
 * Returns empty string if the prefix is not in the lookup table.
 */
export function icaoToCountry(hex: string): string {
  const addr = parseInt(hex.replace(/^~/, ''), 16);
  if (isNaN(addr)) return '';

  // Binary search through sorted ranges
  let lo = 0;
  let hi = ICAO_RANGES.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const range = ICAO_RANGES[mid];
    if (!range) break;

    if (addr < range.start) {
      hi = mid - 1;
    } else if (addr > range.end) {
      lo = mid + 1;
    } else {
      return range.country;
    }
  }

  return '';
}
