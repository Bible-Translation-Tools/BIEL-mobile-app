import { describe, expect, it } from 'vitest';

import {
  checkpointToReadParams,
  getReadingParentHref,
  getRestoreHrefs,
  isRestoredRoute,
  parseReadingCheckpoint,
  readingCheckpointsEqual,
  resolveReadingCheckpointSource,
  serializeReadingCheckpoint,
} from '@/domain/reading-checkpoint';
import type { BooksCheckpoint, ChapterCheckpoint } from '@/types/reading-checkpoint';

const catalogCheckpoint: ChapterCheckpoint = {
  screen: 'read',
  languageCode: 'en',
  bookSlug: 'MAT',
  bookName: 'Matthew',
  chapter: 5,
  audioOnly: false,
  source: 'catalog',
};

const libraryAudioCheckpoint: ChapterCheckpoint = {
  screen: 'read',
  languageCode: 'es',
  bookSlug: 'MRK',
  bookName: 'Marcos',
  chapter: 2,
  audioOnly: true,
  source: 'downloads-library',
};

describe('parseReadingCheckpoint', () => {
  it('returns null for empty or invalid payloads', () => {
    expect(parseReadingCheckpoint(null)).toBeNull();
    expect(parseReadingCheckpoint('')).toBeNull();
    expect(parseReadingCheckpoint('{')).toBeNull();
    expect(parseReadingCheckpoint('[]')).toBeNull();
    expect(parseReadingCheckpoint(JSON.stringify({ languageCode: 'en' }))).toBeNull();
    expect(
      parseReadingCheckpoint(
        JSON.stringify({ ...catalogCheckpoint, chapter: 0, source: 'catalog' }),
      ),
    ).toBeNull();
    expect(
      parseReadingCheckpoint(JSON.stringify({ ...catalogCheckpoint, source: 'somewhere-else' })),
    ).toBeNull();
  });

  it('round-trips a saved checkpoint', () => {
    const raw = serializeReadingCheckpoint(catalogCheckpoint);
    expect(parseReadingCheckpoint(raw)).toEqual(catalogCheckpoint);
    expect(parseReadingCheckpoint(serializeReadingCheckpoint(libraryAudioCheckpoint))).toEqual(
      libraryAudioCheckpoint,
    );
  });

  it('accepts chapter numbers encoded as strings', () => {
    expect(
      parseReadingCheckpoint(JSON.stringify({ ...catalogCheckpoint, chapter: '12' })),
    ).toMatchObject({ chapter: 12 });
  });
});

const booksCheckpoint: BooksCheckpoint = { screen: 'books', languageCode: 'fr', hasText: true };

describe('book list checkpoints', () => {
  it('round-trips a saved book list', () => {
    expect(parseReadingCheckpoint(serializeReadingCheckpoint(booksCheckpoint))).toEqual(
      booksCheckpoint,
    );
    expect(parseReadingCheckpoint(JSON.stringify({ ...booksCheckpoint, hasText: false }))).toEqual({
      ...booksCheckpoint,
      hasText: false,
    });
  });

  it('rejects a book list without a language', () => {
    expect(parseReadingCheckpoint(JSON.stringify({ screen: 'books' }))).toBeNull();
  });

  it('reads a checkpoint saved before screens were tagged as a chapter', () => {
    const { screen: _screen, ...legacy } = catalogCheckpoint;
    expect(parseReadingCheckpoint(JSON.stringify(legacy))).toEqual(catalogCheckpoint);
  });

  it('rejects an unknown screen', () => {
    expect(
      parseReadingCheckpoint(JSON.stringify({ ...catalogCheckpoint, screen: 'settings' })),
    ).toBeNull();
  });

  it('compares book lists and never matches a chapter', () => {
    expect(readingCheckpointsEqual(booksCheckpoint, { ...booksCheckpoint })).toBe(true);
    expect(readingCheckpointsEqual(booksCheckpoint, { ...booksCheckpoint, hasText: false })).toBe(
      false,
    );
    expect(
      readingCheckpointsEqual(booksCheckpoint, { ...catalogCheckpoint, languageCode: 'fr' }),
    ).toBe(false);
  });
});

describe('getRestoreHrefs', () => {
  it('pushes only the book list for a book list checkpoint', () => {
    expect(getRestoreHrefs(booksCheckpoint)).toEqual([
      { pathname: '/books', params: { languageCode: 'fr', hasText: '1' } },
    ]);
  });

  it('pushes the parent (without animation) and then the reader for a chapter', () => {
    expect(getRestoreHrefs(catalogCheckpoint)).toEqual([
      { pathname: '/books', params: { languageCode: 'en', hasText: '1', restored: '1' } },
      { pathname: '/read', params: checkpointToReadParams(catalogCheckpoint) },
    ]);
  });
});

describe('checkpointToReadParams', () => {
  it('omits audio and library flags for a catalog text chapter', () => {
    expect(checkpointToReadParams(catalogCheckpoint)).toEqual({
      languageCode: 'en',
      bookSlug: 'MAT',
      bookName: 'Matthew',
      chapter: '5',
    });
  });

  it('marks audio-only chapters opened from the downloads library', () => {
    expect(checkpointToReadParams(libraryAudioCheckpoint)).toEqual({
      languageCode: 'es',
      bookSlug: 'MRK',
      bookName: 'Marcos',
      chapter: '2',
      audioOnly: '1',
      from: 'downloads-library',
    });
  });
});

describe('reading parent href', () => {
  it('returns the downloads library from a library session', () => {
    expect(
      getReadingParentHref({
        languageCode: 'en',
        audioOnly: false,
        source: 'downloads-library',
      }),
    ).toEqual({ pathname: '/downloads-library', params: { restored: '1' } });
  });

  it('returns the book list for a restored catalog session', () => {
    expect(
      getReadingParentHref({
        languageCode: 'fr',
        audioOnly: false,
        source: 'catalog',
      }),
    ).toEqual({
      pathname: '/books',
      params: { languageCode: 'fr', hasText: '1', restored: '1' },
    });
    expect(
      getReadingParentHref({
        languageCode: 'fr',
        audioOnly: true,
        source: 'catalog',
      }),
    ).toEqual({
      pathname: '/books',
      params: { languageCode: 'fr', hasText: '0', restored: '1' },
    });
  });
});

describe('isRestoredRoute', () => {
  it('is true only for the parent pushed under a restored reader', () => {
    const parent = getReadingParentHref({
      languageCode: 'en',
      audioOnly: false,
      source: 'catalog',
    });
    expect(isRestoredRoute(parent.params)).toBe(true);
    expect(isRestoredRoute({ languageCode: 'en', hasText: '1' })).toBe(false);
    expect(isRestoredRoute(undefined)).toBe(false);
  });
});

describe('checkpoint helpers', () => {
  it('treats matching checkpoints as equal', () => {
    expect(readingCheckpointsEqual(catalogCheckpoint, { ...catalogCheckpoint })).toBe(true);
    expect(readingCheckpointsEqual(catalogCheckpoint, libraryAudioCheckpoint)).toBe(false);
    expect(readingCheckpointsEqual(null, null)).toBe(true);
    expect(readingCheckpointsEqual(catalogCheckpoint, null)).toBe(false);
  });

  it('resolves the library source from the route param', () => {
    expect(resolveReadingCheckpointSource('downloads-library')).toBe('downloads-library');
    expect(resolveReadingCheckpointSource(undefined)).toBe('catalog');
    expect(resolveReadingCheckpointSource('catalog')).toBe('catalog');
  });
});
