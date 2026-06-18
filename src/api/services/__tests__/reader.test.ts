import { describe, expect, it } from 'vitest';

import { buildChapterContentFromHtml } from '@/api/services/reader';

import { loadChapterHtml } from './test-utils';
import { allVerses, verseText } from './reader-helpers';

const enPsa1 = { bookName: 'Psalms', chapter: 1, html: loadChapterHtml('en-psa-1') };
const frPsa1 = { bookName: 'Psaumes', chapter: 1, html: loadChapterHtml('fr-psa-1') };

describe('buildChapterContentFromHtml', () => {
  it('parses sequential verses from chapter HTML', () => {
    const verses = allVerses(buildChapterContentFromHtml(enPsa1.html, enPsa1.bookName, enPsa1.chapter));

    expect(verses).toHaveLength(6);
    expect(verses.map((verse) => verse.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(verses.every((verse) => verse.lines.length > 0)).toBe(true);
  });

  it('does not truncate verses that contain nested word-entry spans', () => {
    const verses = allVerses(buildChapterContentFromHtml(frPsa1.html, frPsa1.bookName, frPsa1.chapter));
    const verse1 = verses.find((verse) => verse.number === 1);

    expect(verse1).toBeDefined();
    expect(verseText(verse1!)).toMatch(/Heureux.*moqueurs/i);
    expect(verse1!.lines).toHaveLength(1);
  });
});
