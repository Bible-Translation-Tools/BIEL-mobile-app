import { catalogApi } from '@/api/catalog';
import { loadOfflineAudioChapterNumbers } from '@/features/downloads/offline-audio';
import { loadOfflineChapterNumbers } from '@/features/downloads/offline-scripture';
import type { ChapterItem } from '@/types/book';
import { networkFirst } from '@/utils/source-strategy';

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

/** Chapters of a book from the catalog; offline, the chapters downloaded as scripture or audio. */
export async function getChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
  return networkFirst(
    async () => {
      const chapterNumbers = new Set(
        await catalogApi.getChapterNumbersForBook(languageCode, bookSlug),
      );
      return [...chapterNumbers].sort((a, b) => a - b).map((number) => ({ number }));
    },
    async () =>
      (await loadMergedOfflineChapterNumbers(languageCode, bookSlug)).map((number) => ({ number })),
    (chapters) => chapters.length > 0,
  );
}
