// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock adm-zip module with a constructable class
const mockGetEntries = vi.fn();
vi.mock('adm-zip', () => {
  return {
    default: class MockAdmZip {
      constructor(_buf: Buffer) {
        // no-op
      }
      getEntries() {
        return mockGetEntries();
      }
    },
  };
});

// Mock config to provide eventConfidenceThreshold for parseAndFilter
vi.mock('../config.js', () => ({
  getConfig: () => ({
    eventConfidenceThreshold: 0.35,
  }),
}));

// Sample lastupdate.txt content (3 lines: export, mentions, gkg)
const sampleLastUpdate = [
  '150383 297a16b493de7cf6ca809a7cc31d0b93 http://data.gdeltproject.org/gdeltv2/20260317120000.export.CSV.zip',
  '86743 abc123def456 http://data.gdeltproject.org/gdeltv2/20260317120000.mentions.CSV.zip',
  '432876 def789abc012 http://data.gdeltproject.org/gdeltv2/20260317120000.gkg.CSV.zip',
].join('\n');

// Helper to build a 61-column tab-delimited GDELT row
// Only fill the columns we care about, rest are empty strings
function makeGdeltRow(overrides: Partial<Record<number, string>> = {}): string {
  const cols = new Array(61).fill('');
  // Defaults for a valid Iran conflict event (EventRootCode 19)
  cols[0] = '1234567890'; // GLOBALEVENTID
  cols[1] = '20260315';   // SQLDATE
  cols[6] = 'IRANIAN GOVERNMENT'; // Actor1Name
  cols[7] = 'IRN';          // Actor1CountryCode
  cols[16] = 'IRAQ';       // Actor2Name
  cols[17] = 'IRQ';         // Actor2CountryCode
  cols[26] = '190';        // EventCode
  cols[27] = '190';        // EventBaseCode
  cols[28] = '19';         // EventRootCode
  cols[30] = '-9.5';       // GoldsteinScale
  cols[31] = '10';          // NumMentions
  cols[52] = 'Tehran, Tehran, Iran'; // ActionGeo_FullName
  cols[53] = 'IR';         // ActionGeo_CountryCode (FIPS)
  cols[56] = '35.6892';    // ActionGeo_Lat
  cols[57] = '51.3890';    // ActionGeo_Long
  cols[60] = 'https://reuters.com/article/123'; // SOURCEURL

  // Apply overrides
  for (const [idx, val] of Object.entries(overrides)) {
    cols[Number(idx)] = val;
  }

  return cols.join('\t');
}

// Sample rows for testing
const validIranMissileRow = makeGdeltRow(); // root code 19, IR
const validSyriaDroneRow = makeGdeltRow({
  0: '9876543210',
  28: '18', // root code 18 -> drone
  26: '183',
  27: '183',
  52: 'Damascus, Syria',
  53: 'SY',
  56: '33.5138',
  57: '36.2765',
  60: 'https://aljazeera.com/article/456',
});
const nonConflictRow = makeGdeltRow({
  0: '1111111111',
  28: '04', // root code 04 (Consult) -- NOT a conflict code
  26: '040',
  27: '040',
});
const outsideMiddleEastRow = makeGdeltRow({
  0: '2222222222',
  53: 'US', // United States -- not in MIDDLE_EAST_FIPS
});
const missingLatLngRow = makeGdeltRow({
  0: '3333333333',
  56: '', // empty lat
  57: '', // empty lng
});
const malformedShortRow = 'col0\tcol1\tcol2'; // < 61 columns

// Duplicate rows for dedup testing: same date/code/location, different actors & mention counts
const dupRowLowMentions = makeGdeltRow({
  0: '4444444444',
  16: '',         // no Actor2Name
  31: '5',        // fewer mentions
});
const dupRowHighMentions = makeGdeltRow({
  0: '5555555555',
  16: 'Government', // has Actor2Name
  31: '25',         // more mentions -> should win
});

const sampleCsv = [
  validIranMissileRow,
  validSyriaDroneRow,
  nonConflictRow,
  outsideMiddleEastRow,
  missingLatLngRow,
  malformedShortRow,
].join('\n');

describe('GDELT Adapter', () => {
  let getExportUrl: typeof import('../adapters/gdelt.js').getExportUrl;
  let parseAndFilter: typeof import('../adapters/gdelt.js').parseAndFilter;
  let classifyByBaseCode: typeof import('../adapters/gdelt.js').classifyByBaseCode;
  let normalizeGdeltEvent: typeof import('../adapters/gdelt.js').normalizeGdeltEvent;
  let fetchEvents: typeof import('../adapters/gdelt.js').fetchEvents;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    vi.resetModules();
    const mod = await import('../adapters/gdelt.js');
    getExportUrl = mod.getExportUrl;
    parseAndFilter = mod.parseAndFilter;
    classifyByBaseCode = mod.classifyByBaseCode;
    normalizeGdeltEvent = mod.normalizeGdeltEvent;
    fetchEvents = mod.fetchEvents;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getExportUrl', () => {
    it('parses lastupdate.txt and returns the .export.CSV.zip URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => sampleLastUpdate,
      });

      const url = await getExportUrl();

      expect(url).toBe(
        'http://data.gdeltproject.org/gdeltv2/20260317120000.export.CSV.zip',
      );
    });

    it('throws if lastupdate.txt fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

      await expect(getExportUrl()).rejects.toThrow('lastupdate.txt');
    });

    it('throws if no export URL found in lastupdate.txt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'some random text without export url',
      });

      await expect(getExportUrl()).rejects.toThrow('No export URL');
    });
  });

  describe('parseAndFilter', () => {
    it('extracts conflict events from tab-delimited CSV with correct column indices', () => {
      const events = parseAndFilter(sampleCsv);

      // Only the 2 valid Middle East conflict events should pass
      expect(events).toHaveLength(2);
    });

    it('excludes rows with EventRootCode NOT in (18, 19, 20)', () => {
      const events = parseAndFilter(nonConflictRow);
      expect(events).toHaveLength(0);
    });

    it('excludes rows with ActionGeo_CountryCode NOT in MIDDLE_EAST_FIPS', () => {
      const events = parseAndFilter(outsideMiddleEastRow);
      expect(events).toHaveLength(0);
    });

    it('excludes rows with empty/missing lat or lng (no NaN)', () => {
      const events = parseAndFilter(missingLatLngRow);
      expect(events).toHaveLength(0);
    });

    it('excludes rows with fewer than 61 columns', () => {
      const events = parseAndFilter(malformedShortRow);
      expect(events).toHaveLength(0);
    });

    it('handles trailing newlines gracefully', () => {
      const csvWithTrailing = validIranMissileRow + '\n\n';
      const events = parseAndFilter(csvWithTrailing);
      expect(events).toHaveLength(1);
    });

    it('deduplicates rows with same date/code/location, keeping highest NumMentions', () => {
      const csv = [dupRowLowMentions, dupRowHighMentions].join('\n');
      const events = parseAndFilter(csv);
      expect(events).toHaveLength(1);
      expect(events[0].data.actor2).toBe('Government');
    });

    it('dedup keeps first row when mention counts are equal', () => {
      const rowA = makeGdeltRow({ 0: '6666666666', 6: 'ACTOR_A', 31: '10' });
      const rowB = makeGdeltRow({ 0: '7777777777', 6: 'ACTOR_B', 31: '10' });
      const events = parseAndFilter([rowA, rowB].join('\n'));
      expect(events).toHaveLength(1);
    });

    it('does not dedup rows at the same location with different CAMEO codes', () => {
      const row19 = makeGdeltRow({ 0: '8888888888', 26: '190', 31: '10' });
      const row18 = makeGdeltRow({ 0: '9999999999', 26: '183', 28: '18', 27: '183', 31: '10' });
      const events = parseAndFilter([row19, row18].join('\n'));
      expect(events).toHaveLength(2);
    });

    it('discards row where FullName="New York, United States" with FIPS="IS" (geo cross-validation)', () => {
      const row = makeGdeltRow({
        0: '1010101010',
        52: 'New York, United States',
        53: 'IS',
      });
      const events = parseAndFilter(row);
      expect(events).toHaveLength(0);
    });

    it('preserves row where FullName="US forces in Baghdad, Iraq" with FIPS="IZ" (actor reference in non-last segment)', () => {
      const row = makeGdeltRow({
        0: '2020202020',
        52: 'US forces in Baghdad, Iraq',
        53: 'IZ',
        56: '33.3152',
        57: '44.3661',
      });
      const events = parseAndFilter(row);
      expect(events).toHaveLength(1);
    });

    it('sets geoPrecision="centroid" when lat/lng matches Tehran (35.6892, 51.3890)', () => {
      const row = makeGdeltRow({
        0: '3030303030',
        56: '35.6892',
        57: '51.3890',
      });
      const events = parseAndFilter(row);
      expect(events).toHaveLength(1);
      expect(events[0].data.geoPrecision).toBe('centroid');
    });

    it('sets geoPrecision="precise" for non-centroid coordinates', () => {
      const row = makeGdeltRow({
        0: '4040404040',
        56: '34.1234',
        57: '50.5678',
      });
      const events = parseAndFilter(row);
      expect(events).toHaveLength(1);
      expect(events[0].data.geoPrecision).toBe('precise');
    });

    it('reclassifies airstrike with Goldstein=-1 to shelling', () => {
      // Airstrike (base code 195) with Goldstein=-1: ceiling is -5, diff = -1 - (-5) = 4 > 3 -> reclassify to shelling
      const row = makeGdeltRow({
        0: '5050505050',
        26: '195',
        27: '195',
        28: '19',
        30: '-1',
        56: '34.1234',
        57: '50.5678',
      });
      const events = parseAndFilter(row);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('shelling');
    });

    it('attaches confidence score (0 < confidence <= 1) to all returned events', () => {
      const row = makeGdeltRow({ 0: '6060606060' });
      const events = parseAndFilter(row);
      expect(events).toHaveLength(1);
      expect(events[0].data.confidence).toBeDefined();
      expect(events[0].data.confidence).toBeGreaterThan(0);
      expect(events[0].data.confidence).toBeLessThanOrEqual(1);
    });

    it('discards events below confidence threshold (low-signal row)', () => {
      // Low signal: empty actors, 1 mention, 0 sources, centroid location (Tehran), Goldstein 0
      const row = makeGdeltRow({
        0: '7070707070',
        6: '',          // no Actor1Name
        7: 'IRN',       // still need actor country for Phase A
        16: '',         // no Actor2Name
        17: '',         // no Actor2CountryCode
        31: '1',        // minimal mentions
        32: '0',        // no sources
        30: '0',        // Goldstein 0 (unknown)
        56: '35.6892',  // Tehran centroid
        57: '51.3890',
      });
      const events = parseAndFilter(row);
      // With empty actors (score 0.0 for actor specificity), 1 mention, 0 sources,
      // centroid (0.3), and Goldstein 0 (0.5 neutral), the score should be well below 0.35
      expect(events).toHaveLength(0);
    });
  });

  describe('classifyByBaseCode', () => {
    it('returns airstrike for base code 195', () => {
      expect(classifyByBaseCode('195', '19')).toBe('airstrike');
    });

    it('returns ground_combat for base code 190', () => {
      expect(classifyByBaseCode('190', '19')).toBe('ground_combat');
    });

    it('returns ground_combat for base code 193', () => {
      expect(classifyByBaseCode('193', '19')).toBe('ground_combat');
    });

    it('returns shelling for base code 194', () => {
      expect(classifyByBaseCode('194', '19')).toBe('shelling');
    });

    it('returns bombing for base code 183', () => {
      expect(classifyByBaseCode('183', '18')).toBe('bombing');
    });

    it('returns assassination for base code 185', () => {
      expect(classifyByBaseCode('185', '18')).toBe('assassination');
    });

    it('returns abduction for base code 181', () => {
      expect(classifyByBaseCode('181', '18')).toBe('abduction');
    });

    it('returns assault for base code 180', () => {
      expect(classifyByBaseCode('180', '18')).toBe('assault');
    });

    it('returns blockade for base code 191', () => {
      expect(classifyByBaseCode('191', '19')).toBe('blockade');
    });

    it('returns ceasefire_violation for base code 196', () => {
      expect(classifyByBaseCode('196', '19')).toBe('ceasefire_violation');
    });

    it('returns mass_violence for base code 200', () => {
      expect(classifyByBaseCode('200', '20')).toBe('mass_violence');
    });

    it('returns wmd for base code 204', () => {
      expect(classifyByBaseCode('204', '20')).toBe('wmd');
    });

    it('falls back to assault for unmapped root 18 codes', () => {
      expect(classifyByBaseCode('187', '18')).toBe('assault');
    });

    it('falls back to ground_combat for unmapped root 19 codes', () => {
      expect(classifyByBaseCode('199', '19')).toBe('ground_combat');
    });

    it('falls back to mass_violence for unmapped root 20 codes', () => {
      expect(classifyByBaseCode('209', '20')).toBe('mass_violence');
    });

    it('falls back to assault for completely unknown codes', () => {
      expect(classifyByBaseCode('990', '99')).toBe('assault');
    });
  });

  describe('normalizeGdeltEvent', () => {
    it('produces correct ConflictEventEntity shape with gdelt- prefixed ID', () => {
      const cols = validIranMissileRow.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);

      expect(entity.id).toBe('gdelt-1234567890');
      expect(entity.type).toBe('ground_combat');
      expect(entity.lat).toBe(35.6892);
      expect(entity.lng).toBe(51.389);
      expect(entity.label).toBe('Tehran, Tehran, Iran: Conventional military force');
      expect(entity.data.eventType).toBe('Conventional military force');
      expect(entity.data.subEventType).toBe('CAMEO 190');
      expect(entity.data.fatalities).toBe(0);
      expect(entity.data.source).toBe('https://reuters.com/article/123');
      expect(entity.data.actor1).toBe('IRANIAN GOVERNMENT');
      expect(entity.data.actor2).toBe('IRAQ');
      expect(entity.data.notes).toBe('');
    });

    it('produces timestamp from YYYYMMDD SQLDATE', () => {
      const cols = validIranMissileRow.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);

      // 20260315 -> March 15, 2026 midnight UTC
      const date = new Date(entity.timestamp);
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(2); // 0-indexed, March = 2
      expect(date.getUTCDate()).toBe(15);
    });

    it('handles empty SOURCEURL gracefully', () => {
      const cols = validIranMissileRow.split('\t');
      cols[60] = '';
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.source).toBe('');
    });

    it('passes through Actor1Name from column 6', () => {
      const cols = validIranMissileRow.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.actor1).toBe('IRANIAN GOVERNMENT');
    });

    it('passes through Actor2Name from column 16', () => {
      const cols = validIranMissileRow.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.actor2).toBe('IRAQ');
    });

    it('passes through GoldsteinScale as a number', () => {
      const cols = validIranMissileRow.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.goldsteinScale).toBe(-9.5);
      expect(typeof entity.data.goldsteinScale).toBe('number');
    });

    it('passes through ActionGeo_FullName as locationName', () => {
      const cols = validIranMissileRow.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.locationName).toBe('Tehran, Tehran, Iran');
    });

    it('passes through EventCode as cameoCode', () => {
      const cols = validIranMissileRow.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.cameoCode).toBe('190');
    });

    it('missing actor names default to empty string', () => {
      const row = makeGdeltRow({ 6: '', 16: '' });
      const cols = row.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.actor1).toBe('');
      expect(entity.data.actor2).toBe('');
    });

    it('invalid GoldsteinScale defaults to 0', () => {
      const row = makeGdeltRow({ 30: 'not-a-number' });
      const cols = row.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.goldsteinScale).toBe(0);
    });

    it('includes numMentions and numSources when columns contain valid numbers', () => {
      const row = makeGdeltRow({ 31: '42', 32: '7' });
      const cols = row.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.numMentions).toBe(42);
      expect(entity.data.numSources).toBe(7);
    });

    it('numMentions and numSources are undefined when columns are empty', () => {
      const row = makeGdeltRow({ 31: '', 32: '' });
      const cols = row.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.numMentions).toBeUndefined();
      expect(entity.data.numSources).toBeUndefined();
    });

    it('numMentions and numSources are undefined when columns are non-numeric', () => {
      const row = makeGdeltRow({ 31: 'abc', 32: 'xyz' });
      const cols = row.split('\t');
      const entity = normalizeGdeltEvent(cols, 35.6892, 51.389);
      expect(entity.data.numMentions).toBeUndefined();
      expect(entity.data.numSources).toBeUndefined();
    });
  });

  describe('fetchEvents (integration)', () => {
    it('orchestrates fetch->unzip->parse->filter->normalize end-to-end', async () => {
      // Configure mock AdmZip to return our sample CSV
      mockGetEntries.mockReturnValue([
        {
          getData: () => Buffer.from(sampleCsv, 'utf8'),
        },
      ]);

      // 1. lastupdate.txt fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => sampleLastUpdate,
      });

      // 2. ZIP download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      });

      const events = await fetchEvents();

      // Should get only the 2 valid Middle East conflict events
      expect(events).toHaveLength(2);

      // First event: Iran ground_combat (base code 190)
      expect(events[0].id).toBe('gdelt-1234567890');
      expect(events[0].type).toBe('ground_combat');
      expect(events[0].lat).toBe(35.6892);

      // Second event: Syria bombing (base code 183)
      expect(events[1].id).toBe('gdelt-9876543210');
      expect(events[1].type).toBe('bombing');
      expect(events[1].lat).toBe(33.5138);

      // Verify fetch was called twice (lastupdate + ZIP download)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws if ZIP download fails', async () => {
      // lastupdate.txt OK
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => sampleLastUpdate,
      });

      // ZIP download fails
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(fetchEvents()).rejects.toThrow('download failed');
    });
  });
});
