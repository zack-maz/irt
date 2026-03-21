import type { NewsArticle } from '../types.js';

/**
 * Conflict-relevant keywords matched with word boundaries.
 * Multi-word phrases use plain `includes` (boundaries implicit).
 */
export const CONFLICT_KEYWORDS = new Set([
  // Military terms
  'airstrike',
  'missile',
  'bombing',
  'strike',
  'troops',
  'drone',
  'casualties',
  'military',
  'combat',
  'offensive',
  'artillery',
  'warship',
  'navy',
  'airforce',
  'defense',
  'weapon',
  'nuclear',
  'shelling',
  'rocket',
  'interceptor',
  'militia',
  'ammunition',
  'warplane',
  'airstrike',
  'airstrikes',
  // Diplomatic terms
  'sanctions',
  'negotiations',
  'ceasefire',
  'escalation',
  'tensions',
  'iaea',
  'diplomacy',
  'withdrawal',
  'deployment',
  // Organizations
  'irgc',
  'hezbollah',
  'hamas',
  'houthi',
  'pentagon',
  'centcom',
  'nato',
  'idf',
  'mossad',
  // Countries / regions
  'iran',
  'israel',
  'iraq',
  'syria',
  'yemen',
  'lebanon',
  'gaza',
  'tehran',
  'tel aviv',
  'jerusalem',
  'beirut',
  'baghdad',
  'damascus',
  'hormuz',
  'persian gulf',
  'red sea',
  // Conflict terms
  'warfare',
  'conflict',
  'invasion',
  'blockade',
  'siege',
  'occupation',
  'refugee',
  'humanitarian',
  'civilian',
  'wounded',
  'destroyed',
]);

/**
 * Ambiguous keywords that only count as a match when a second
 * (non-ambiguous) keyword also appears in the same article.
 * These fire too often on their own (e.g. "clock strikes midnight",
 * "rocket fireworks", "heart attack", "killed in car crash").
 */
const AMBIGUOUS_KEYWORDS = new Set([
  'strike',
  'attack',
  'bomb',
  'rocket',
  'killed',
  'raid',
  'war',
  'offensive',
]);

/**
 * Exclusion patterns — if any match, the article is rejected regardless
 * of keyword hits. Guards against celebratory / sports / entertainment
 * false positives.
 */
const EXCLUSION_PATTERNS = [
  'new year',
  'firework',
  'fireworks',
  'celebration',
  'celebrate',
  'festival',
  'holiday',
  'parade',
  'super bowl',
  'world cup',
  'box office',
  'movie premiere',
  'concert',
  'cricket',
  'basketball',
  'football match',
  'stock market',
  'ipo',
  'earnings report',
  'fashion week',
];

/** Pre-compiled word-boundary regex cache */
const keywordRegexCache = new Map<string, RegExp>();

function getKeywordRegex(keyword: string): RegExp {
  let re = keywordRegexCache.get(keyword);
  if (!re) {
    // Multi-word phrases don't need \b on interior spaces
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`\\b${escaped}\\b`, 'i');
    keywordRegexCache.set(keyword, re);
  }
  return re;
}

/**
 * Check article text against the conflict keyword whitelist using
 * word-boundary matching. Ambiguous keywords only count when
 * accompanied by at least one non-ambiguous keyword.
 *
 * @returns Array of matched keywords (empty = not conflict-relevant)
 */
export function matchesKeywords(article: {
  title: string;
  summary?: string;
}): string[] {
  const text = `${article.title} ${article.summary ?? ''}`.toLowerCase();

  // Reject if any exclusion pattern matches
  for (const pattern of EXCLUSION_PATTERNS) {
    if (text.includes(pattern)) {
      return [];
    }
  }

  const matched: string[] = [];
  let hasNonAmbiguous = false;
  let hasAmbiguous = false;
  const ambiguousHits: string[] = [];

  for (const keyword of CONFLICT_KEYWORDS) {
    if (getKeywordRegex(keyword).test(text)) {
      if (AMBIGUOUS_KEYWORDS.has(keyword)) {
        hasAmbiguous = true;
        ambiguousHits.push(keyword);
      } else {
        hasNonAmbiguous = true;
        matched.push(keyword);
      }
    }
  }

  // Ambiguous keywords only included when a non-ambiguous keyword also matched
  if (hasAmbiguous && hasNonAmbiguous) {
    matched.push(...ambiguousHits);
  }

  return matched;
}

/**
 * Filter articles to only those matching at least one conflict keyword.
 * Populates the `keywords` field on each matched article.
 */
export function filterConflictArticles(articles: NewsArticle[]): NewsArticle[] {
  const result: NewsArticle[] = [];

  for (const article of articles) {
    const matched = matchesKeywords(article);
    if (matched.length > 0) {
      result.push({ ...article, keywords: matched });
    }
  }

  return result;
}
