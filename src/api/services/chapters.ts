import { graphqlRequest } from '@/api/graphql/client';
import { CHAPTERS_FOR_BOOK_QUERY } from '@/api/graphql/queries';
import { getOfflineChapterNumbers } from '@/api/services/offline-books';
import type { ChapterItem, ChaptersQueryResult } from '@/types/book';

export async function fetchChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
  const offlineChapters = await getOfflineChapterNumbers(languageCode, bookSlug);
  if (offlineChapters.length > 0) {
    return offlineChapters.map((number) => ({ number }));
  }

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
}
