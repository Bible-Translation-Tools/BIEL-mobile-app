import { graphqlRequest } from '@/api/graphql/client';
import { CHAPTERS_FOR_BOOK_QUERY } from '@/api/graphql/queries';
import {
  getOfflineAudioChapterNumbers,
  resolveBookAudioChapters,
} from '@/api/services/offline-audio';
import { getOfflineChapterNumbers } from '@/api/services/offline-text';
import type { ChapterItem, ChaptersQueryResult } from '@/types/book';

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

/** Local chapter numbers only — used by Downloads Library (no network). */
export async function fetchOfflineChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
  const numbers = await getMergedOfflineChapterNumbers(languageCode, bookSlug);
  return numbers.map((number) => ({ number }));
}

export async function fetchAudioChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
  try {
    const manifest = await resolveBookAudioChapters(languageCode, bookSlug);
    if (manifest.chapters.length === 0) {
      return [];
    }
    return manifest.chapters.map((chapter) => ({ number: chapter.chapter }));
  } catch (err) {
    const offlineChapters = await getOfflineAudioChapterNumbers(languageCode, bookSlug);
    if (offlineChapters.length > 0) {
      return offlineChapters.map((number) => ({ number }));
    }
    throw err;
  }
}

export async function fetchChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
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
    const offlineChapters = await getMergedOfflineChapterNumbers(languageCode, bookSlug);
    if (offlineChapters.length > 0) {
      return offlineChapters.map((number) => ({ number }));
    }
    throw err;
  }
}
