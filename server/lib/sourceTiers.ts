/**
 * Source tier classification registry.
 *
 * Three-tier system for news source quality:
 *   - Tier 1 (gold): Wire services + OSINT (Reuters, AP, AFP, Bellingcat, Liveuamap)
 *   - Tier 2 (silver): Major outlets (BBC, Al Jazeera, CNN, etc.)
 *   - Tier 3 (bronze): Regional/state media (Tehran Times, IRNA, SANA, Press TV)
 *   - null: Unknown source (filtered from news feed, still counts toward event corroboration)
 *
 * @module sourceTiers
 */

export type SourceTier = 1 | 2 | 3;

// ---- Domain sets (for URL-based lookup) ----

export const TIER_1_DOMAINS = new Set([
  'reuters.com',
  'apnews.com',
  'afp.com',
  'bellingcat.com',
  'liveuamap.com',
]);

export const TIER_2_DOMAINS = new Set([
  'bbc.co.uk',
  'bbc.com',
  'aljazeera.com',
  'cnn.com',
  'timesofisrael.com',
  'middleeasteye.net',
  'theguardian.com',
  'nytimes.com',
  'washingtonpost.com',
]);

export const TIER_3_DOMAINS = new Set(['tehrantimes.com', 'irna.ir', 'sana.sy', 'presstv.ir']);

// ---- Name sets (for source-name-based lookup, e.g. RSS feeds) ----

const TIER_1_NAMES = new Set(['Reuters', 'Associated Press', 'AFP', 'Bellingcat', 'Liveuamap']);

const TIER_2_NAMES = new Set([
  'BBC',
  'Al Jazeera',
  'CNN',
  'Times of Israel',
  'Middle East Eye',
  'Guardian',
  'NYT',
  'Washington Post',
]);

const TIER_3_NAMES = new Set(['Tehran Times', 'IRNA', 'SANA', 'Press TV']);

/**
 * Extract the domain from a URL, stripping `www.` prefix.
 * Returns empty string for malformed URLs.
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Classify a news source into tier 1/2/3 or null (unknown).
 * Checks source name first, then domain.
 *
 * @param source - Source name (e.g. "BBC", "GDELT", "Reuters")
 * @param domain - Optional domain (e.g. "reuters.com", "bbc.co.uk")
 * @returns SourceTier (1/2/3) or null for unknown
 */
export function getSourceTier(source: string, domain: string | undefined): SourceTier | null {
  // Check by name first
  if (TIER_1_NAMES.has(source)) return 1;
  if (TIER_2_NAMES.has(source)) return 2;
  if (TIER_3_NAMES.has(source)) return 3;

  // Check by domain
  if (domain) {
    if (TIER_1_DOMAINS.has(domain)) return 1;
    if (TIER_2_DOMAINS.has(domain)) return 2;
    if (TIER_3_DOMAINS.has(domain)) return 3;
  }

  return null;
}

/**
 * Find the highest (lowest number = best) tier among a set of source URLs.
 * Extracts domain from each URL and returns the best tier found.
 *
 * @param sourceUrls - Array of article/source URLs
 * @returns Best SourceTier found, or null if all unknown
 */
export function getHighestTier(sourceUrls: string[]): SourceTier | null {
  let best: SourceTier | null = null;

  for (const url of sourceUrls) {
    const domain = extractDomain(url);
    if (!domain) continue;

    const tier = getSourceTier('', domain);
    if (tier !== null) {
      if (best === null || tier < best) {
        best = tier;
      }
      // Can't do better than 1
      if (best === 1) return 1;
    }
  }

  return best;
}
