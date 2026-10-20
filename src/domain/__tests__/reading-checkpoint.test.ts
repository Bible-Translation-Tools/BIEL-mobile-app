import { describe, expect, it } from 'vitest';

import {
  checkpointToReadParams,
  getReadingParentHref,
  parseReadingCheckpoint,
  readingCheckpointsEqual,
  resolveReadingCheckpointSource,
  serializeReadingCheckpoint,
} from '@/domain/reading-checkpoint';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

const catalogCheckpoint: ReadingCheckpoint = {
  languageCode: 'en',
  bookSlug: 'MAT',
  bookName: 'Matthew',
  chapter: 5,
  audioOnly: false,
  source: 'catalog',
};

const libraryAudioCheckpoint: ReadingCheckpoint = {
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
    ).toBe('/downloads-library');
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
      params: { languageCode: 'fr', hasText: '1' },
    });
    expect(
      getReadingParentHref({
        languageCode: 'fr',
        audioOnly: true,
        source: 'catalog',
      }),
    ).toEqual({
      pathname: '/books',
      params: { languageCode: 'fr', hasText: '0' },
    });
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
