// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { extractTitleFromHtml } from '../../lib/titleFetcher.js';

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
