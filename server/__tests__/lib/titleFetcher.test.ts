// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTitleFromHtml } from '../../lib/titleFetcher.js';

// Mock the redis module
vi.mock('../../cache/redis.js', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));

import { cacheGet, cacheSet } from '../../cache/redis.js';

const mockCacheGet = vi.mocked(cacheGet);
const mockCacheSet = vi.mocked(cacheSet);

describe('extractTitleFromHtml', () => {
  it('extracts title from og:title meta tag', () => {
    const html = `<html><head><meta property="og:title" content="Iran Strikes Back" /></head></html>`;
    expect(extractTitleFromHtml(html)).toBe('Iran Strikes Back');
  });

  it('extracts title from title tag', () => {
    const html = `<html><head><title>Breaking: Airstrike in Damascus</title></head></html>`;
    expect(extractTitleFromHtml(html)).toBe('Breaking: Airstrike in Damascus');
  });

  it('prefers og:title over title tag when both present', () => {
    const html = `<html><head>
      <meta property="og:title" content="OG Title Wins" />
      <title>Title Tag Loses</title>
    </head></html>`;
    expect(extractTitleFromHtml(html)).toBe('OG Title Wins');
  });

  it('handles HTML entities (ampersand, quotes, etc.)', () => {
    const html = `<html><head><title>Iran &amp; Iraq: &quot;Tensions&quot; Rise</title></head></html>`;
    expect(extractTitleFromHtml(html)).toBe('Iran & Iraq: "Tensions" Rise');
  });

  it('handles og:title where content appears before property (alt attribute order)', () => {
    const html = `<html><head><meta content="Reversed Order Title" property="og:title" /></head></html>`;
    expect(extractTitleFromHtml(html)).toBe('Reversed Order Title');
  });

  it('returns null for HTML with neither og:title nor title tag', () => {
    const html = `<html><head><meta name="description" content="No title here" /></head></html>`;
    expect(extractTitleFromHtml(html)).toBeNull();
  });

  it('returns null for empty string input', () => {
    expect(extractTitleFromHtml('')).toBeNull();
  });
});

describe('batchFetchTitles', () => {
  // Dynamic import to get the module after mocks are set up
  let batchFetchTitles: typeof import('../../lib/titleFetcher.js').batchFetchTitles;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn());
    const mod = await import('../../lib/titleFetcher.js');
    batchFetchTitles = mod.batchFetchTitles;
  });

  it('returns Map of URL to title for successful fetches', async () => {
    const html = `<html><head><title>Test Article</title></head></html>`;
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValue(
      new Response(html, { status: 200 }),
    );

    const results = await batchFetchTitles(['https://example.com/article1']);
    expect(results.get('https://example.com/article1')).toBe('Test Article');
  });

  it('returns null value for URLs that fail to fetch', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    );

    const results = await batchFetchTitles(['https://example.com/missing']);
    expect(results.get('https://example.com/missing')).toBeNull();
  });

  it('checks Redis cache first and skips HTTP fetch for cached URLs', async () => {
    mockCacheGet.mockResolvedValue({
      data: 'Cached Title',
      stale: false,
      lastFresh: Date.now(),
    });
    const mockFetch = vi.mocked(globalThis.fetch);

    const results = await batchFetchTitles(['https://example.com/cached']);
    expect(results.get('https://example.com/cached')).toBe('Cached Title');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('caches successful title extractions in Redis', async () => {
    const html = `<html><head><title>Fresh Article</title></head></html>`;
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValue(
      new Response(html, { status: 200 }),
    );

    await batchFetchTitles(['https://example.com/fresh']);
    expect(mockCacheSet).toHaveBeenCalledWith(
      expect.stringMatching(/^title:/),
      'Fresh Article',
      expect.any(Number),
    );
  });

  it('handles empty URL array (returns empty Map)', async () => {
    const results = await batchFetchTitles([]);
    expect(results.size).toBe(0);
  });

  it('does not cache null/failed results in Redis', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    );

    await batchFetchTitles(['https://example.com/fail']);
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it('processes URLs in batches of CONCURRENCY (10) at a time', async () => {
    const html = `<html><head><title>Batch Test</title></head></html>`;
    const mockFetch = vi.mocked(globalThis.fetch);
    let concurrentCalls = 0;
    let maxConcurrent = 0;

    mockFetch.mockImplementation(async () => {
      concurrentCalls++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
      // Small delay to allow concurrency overlap
      await new Promise((r) => setTimeout(r, 10));
      concurrentCalls--;
      return new Response(html, { status: 200 });
    });

    // Create 15 unique URLs (should be 2 batches: 10 + 5)
    const urls = Array.from({ length: 15 }, (_, i) =>
      `https://example.com/article${i}`,
    );

    await batchFetchTitles(urls);

    // All 15 URLs should have been fetched
    expect(mockFetch).toHaveBeenCalledTimes(15);
    // Max concurrency should not exceed 10
    expect(maxConcurrent).toBeLessThanOrEqual(10);
  });
});
