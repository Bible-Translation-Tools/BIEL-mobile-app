import { describe, expect, it } from 'vitest';

import { parseDownloadedBookJson, withOfflineBookIdentity } from '@/domain/whole-book-parser';

describe('parseDownloadedBookJson', () => {
  it('parses valid JSON', () => {
    expect(parseDownloadedBookJson('{"chapters":{}}')).toEqual({ chapters: {} });
  });

  it('explains an HTML error page', () => {
    expect(() => parseDownloadedBookJson('<html>502</html>')).toThrow(
      'Download returned HTML instead of book data',
    );
  });

  it('explains raw USFM', () => {
    expect(() => parseDownloadedBookJson('\\id GEN')).toThrow(
      'Received USFM text instead of whole.json',
    );
  });

  it('falls back to a generic message', () => {
    expect(() => parseDownloadedBookJson('not json')).toThrow(
      'Downloaded book data is not valid JSON',
    );
  });
});

describe('withOfflineBookIdentity', () => {
  it('fills only the missing fields', () => {
    const book = { slug: '', name: 'Genesis', chapters: new Map() };
    expect(withOfflineBookIdentity(book, { slug: 'GEN', name: 'gen' })).toMatchObject({
      slug: 'GEN',
      name: 'Genesis',
    });
  });
});
