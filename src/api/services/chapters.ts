import { graphqlRequest } from '@/api/graphql/client';
import { CHAPTERS_FOR_BOOK_QUERY } from '@/api/graphql/queries';
import {
  getOfflineAudioChapterNumbers,
  resolveBookAudioChapters,
} from '@/api/services/offline-audio';
import { getOfflineChapterNumbers } from '@/api/services/offline-books';
import type { ChapterItem, ChaptersQueryResult } from '@/types/book';

export async function fetchAudioChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
  const offlineChapters = await getOfflineAudioChapterNumbers(languageCode, bookSlug);

  try {
    const manifest = await resolveBookAudioChapters(languageCode, bookSlug);
    if (manifest.chapters.length === 0 && offlineChapters.length === 0) {
      return [];
    }
    return manifest.chapters.map((chapter) => ({ number: chapter.chapter }));
  } catch (err) {
    if (offlineChapters.length > 0) {
      return offlineChapters.map((number) => ({ number }));
    }
    throw err;
  }
}

async function getMergedOfflineChapterNumbers(
  languageCode: string,
  bookSlug: string,
): Promise<number[]> {
  const [scripture, audio] = await Promise.all([
    getOfflineChapterNumbers(languageCode, bookSlug),
    getOfflineAudioChapterNumbers(languageCode, bookSlug),
  ]);
  return [...new Set([...scripture, ...audio])].sort((a, b) => a - b);
}

export async function fetchChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
  const offlineChapters = await getMergedOfflineChapterNumbers(languageCode, bookSlug);

  try {
    const data = await graphqlRequest<ChaptersQueryResult>(CHAPTERS_FOR_BOOK_QUERY, {
      languageCode,
      bookSlug,
    });

    const chapterNumbers = new Set<number>();
    for (const item of data.scriptural_rendering_metadata) {
      if (item.chapter != null) {
        chapterNumbers.add(item.chapter);
      }
    }

    return [...chapterNumbers]
      .sort((a, b) => a - b)
      .map((number) => ({ number }));
  } catch (err) {
    if (offlineChapters.length > 0) {
      return offlineChapters.map((number) => ({ number }));
    }
    throw err;
  }
}
