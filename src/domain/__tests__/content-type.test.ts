import { describe, expect, it } from 'vitest';

import {
  bookMatchesContentFilter,
  getBookContentFlags,
  getChapterContentIndicator,
} from '@/domain/content-type';
import type { BookItem } from '@/types/book';

function book(overrides: Partial<BookItem>): BookItem {
  return {
    id: 'gen',
    name: 'Genesis',
    slug: 'gen',
    testament: 'old',
    downloadStatus: 'pending',
    audioDownloadStatus: 'pending',
    hasAudio: false,
    ...overrides,
  };
}

describe('getBookContentFlags', () => {
  it('counts text only when downloaded, and audio when downloaded or available', () => {
    expect(getBookContentFlags(book({ downloadStatus: 'partial' }))).toEqual({
      hasText: false,
      hasAudio: false,
    });
    expect(getBookContentFlags(book({ downloadStatus: 'downloaded', hasAudio: true }))).toEqual({
      hasText: true,
      hasAudio: true,
    });
    expect(getBookContentFlags(book({ audioDownloadStatus: 'downloaded' })).hasAudio).toBe(true);
  });
});

describe('getChapterContentIndicator', () => {
  it('maps text/audio flags to an indicator', () => {
    expect(getChapterContentIndicator({ number: 1, hasText: true, hasAudio: true })).toBe('both');
    expect(getChapterContentIndicator({ number: 1, hasText: true })).toBe('text');
    expect(getChapterContentIndicator({ number: 1, hasAudio: true })).toBe('audio');
    expect(getChapterContentIndicator({ number: 1 })).toBeNull();
  });
});

describe('bookMatchesContentFilter', () => {
  const textOnly = book({ downloadStatus: 'downloaded' });
  const audioOnly = book({ hasAudio: true });
  const both = book({ downloadStatus: 'downloaded', hasAudio: true });

  it('matches each filter', () => {
    expect([textOnly, audioOnly, both].map((b) => bookMatchesContentFilter(b, 'all'))).toEqual([
      true,
      true,
      true,
    ]);
    expect(
      [textOnly, audioOnly, both].map((b) => bookMatchesContentFilter(b, 'scripture')),
    ).toEqual([true, false, true]);
    expect([textOnly, audioOnly, both].map((b) => bookMatchesContentFilter(b, 'audio'))).toEqual([
      false,
      true,
      true,
    ]);
    expect([textOnly, audioOnly, both].map((b) => bookMatchesContentFilter(b, 'both'))).toEqual([
      false,
      false,
      true,
    ]);
  });
});
