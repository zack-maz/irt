// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { matchesKeywords, filterConflictArticles, CONFLICT_KEYWORDS } from '../../lib/newsFilter.js';
import type { NewsArticle } from '../../types.js';

const makeArticle = (overrides: Partial<NewsArticle> = {}): NewsArticle => ({
  id: 'test-id-001',
  title: 'Generic article title',
  url: 'https://example.com/article',
  source: 'TestSource',
  publishedAt: Date.now(),
  keywords: [],
  ...overrides,
});

describe('newsFilter', () => {
  describe('CONFLICT_KEYWORDS', () => {
    it('is a non-empty Set of lowercase strings', () => {
      expect(CONFLICT_KEYWORDS).toBeInstanceOf(Set);
      expect(CONFLICT_KEYWORDS.size).toBeGreaterThan(20);
      for (const kw of CONFLICT_KEYWORDS) {
        expect(kw).toBe(kw.toLowerCase());
      }
    });
  });

  describe('matchesKeywords', () => {
    it('returns matched keyword list for conflict article (title contains "airstrike")', () => {
      const result = matchesKeywords({ title: 'Major airstrike hits target in Baghdad' });
      expect(result).toContain('airstrike');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for non-conflict article', () => {
      const result = matchesKeywords({ title: 'Local weather update for tomorrow' });
      expect(result).toEqual([]);
    });

    it('matching is case-insensitive', () => {
      const result = matchesKeywords({ title: 'AIRSTRIKE reported in northern region' });
      expect(result).toContain('airstrike');
    });

    it('matches against title AND summary', () => {
      const result = matchesKeywords({
        title: 'Breaking news from the region',
        summary: 'Multiple missile launches detected overnight',
      });
      expect(result).toContain('missile');
    });

    it('matches only in title when summary is undefined', () => {
      const result = matchesKeywords({ title: 'Iran sanctions expanded by EU' });
      expect(result).toContain('iran');
      expect(result).toContain('sanctions');
    });

    it('returns multiple matched keywords when present', () => {
      const result = matchesKeywords({
        title: 'Iran launches missile strike on military base',
      });
      expect(result).toContain('iran');
      expect(result).toContain('missile');
      expect(result).toContain('military');
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('uses word boundary matching — "war" does not match "forward" or "warned"', () => {
      const result = matchesKeywords({ title: 'Stocks moved forward as traders warned of volatility' });
      expect(result).toEqual([]);
    });

    it('uses word boundary matching — "iran" does not match "irana"', () => {
      const result = matchesKeywords({ title: 'The city of Tirana announces new transit plan' });
      expect(result).toEqual([]);
    });

    it('rejects articles matching exclusion patterns (new year celebrations)', () => {
      const result = matchesKeywords({
        title: 'Fireworks light up Tehran sky for New Year celebration',
        summary: 'Thousands gather to celebrate the holiday with rocket-shaped fireworks',
      });
      expect(result).toEqual([]);
    });

    it('rejects articles matching exclusion patterns (sports)', () => {
      const result = matchesKeywords({
        title: 'Iran football match ends in dramatic victory at World Cup',
      });
      expect(result).toEqual([]);
    });

    it('ambiguous keywords alone do not pass filter', () => {
      const result = matchesKeywords({ title: 'Clock tower strike heard across town' });
      expect(result).toEqual([]);
    });

    it('ambiguous keywords pass when accompanied by non-ambiguous keyword', () => {
      const result = matchesKeywords({ title: 'Military strike hits supply depot' });
      expect(result).toContain('military');
      expect(result).toContain('strike');
    });

    it('ambiguous "rocket" alone does not pass', () => {
      const result = matchesKeywords({ title: 'Model rocket club launches new design' });
      expect(result).toEqual([]);
    });

    it('ambiguous "attack" alone does not pass', () => {
      const result = matchesKeywords({ title: 'Bear attack reported in national park' });
      expect(result).toEqual([]);
    });
  });

  describe('filterConflictArticles', () => {
    it('returns only articles with >= 1 keyword match', () => {
      const articles = [
        makeArticle({ id: 'a1', title: 'Airstrike on Damascus outskirts' }),
        makeArticle({ id: 'a2', title: 'Local cooking show recipes' }),
        makeArticle({ id: 'a3', title: 'Iran nuclear talks resume' }),
      ];

      const filtered = filterConflictArticles(articles);
      expect(filtered).toHaveLength(2);
      const ids = filtered.map((a) => a.id);
      expect(ids).toContain('a1');
      expect(ids).toContain('a3');
    });

    it('populates keywords field on matched articles', () => {
      const articles = [
        makeArticle({ id: 'a1', title: 'Major missile strike in Tehran' }),
      ];

      const filtered = filterConflictArticles(articles);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].keywords.length).toBeGreaterThanOrEqual(1);
      expect(filtered[0].keywords).toContain('missile');
      expect(filtered[0].keywords).toContain('tehran');
    });

    it('returns empty array when no articles match', () => {
      const articles = [
        makeArticle({ id: 'a1', title: 'Celebrity gossip roundup' }),
        makeArticle({ id: 'a2', title: 'Tech startup funding news' }),
      ];

      const filtered = filterConflictArticles(articles);
      expect(filtered).toEqual([]);
    });
  });
});
