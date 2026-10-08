import { catalogApi } from '@/api/catalog';
import { loadChapterCatalog, saveChapterCatalog } from '@/db';
import { normalizeBookSlug } from '@/domain/book-slug';
import { loadOfflineAudioChapterNumbers } from '@/features/downloads/offline-audio';
import { loadOfflineChapterNumbers } from '@/features/downloads/offline-scripture';
import type { ChapterItem } from '@/types/book';
import { cacheFirst } from '@/utils/source-strategy';

async function loadMergedOfflineChapterNumbers(
  languageCode: string,
  bookSlug: string,
): Promise<number[]> {
  const [scripture, audio] = await Promise.all([
    loadOfflineChapterNumbers(languageCode, bookSlug),
    loadOfflineAudioChapterNumbers(languageCode, bookSlug),
  ]);
  return [...new Set([...scripture, ...audio])].sort((a, b) => a - b);
}

async function fetchChapterNumbers(languageCode: string, bookSlug: string): Promise<number[]> {
  const chapterNumbers = new Set(await catalogApi.getChapterNumbersForBook(languageCode, bookSlug));
  const sorted = [...chapterNumbers].sort((a, b) => a - b);
  if (sorted.length > 0) {
    await saveChapterCatalog(languageCode, normalizeBookSlug(bookSlug), 'text', sorted).catch(
      () => {},
    );
  }
  return sorted;
}

/**
 * Chapters of a book: the cached catalog list, then the catalog (saved for next time),
 * then offline the chapters downloaded as scripture or audio. The cache is never refreshed.
 */
export async function getChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
  const chapterNumbers = await cacheFirst(
    () => loadChapterCatalog(languageCode, normalizeBookSlug(bookSlug), 'text'),
    () => fetchChapterNumbers(languageCode, bookSlug),
    () => loadMergedOfflineChapterNumbers(languageCode, bookSlug),
    (chapters) => chapters.length > 0,
  );
  return chapterNumbers.map((number) => ({ number }));
}
