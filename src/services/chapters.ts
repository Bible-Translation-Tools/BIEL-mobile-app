import { graphqlRequest } from '@/lib/graphql/client';
import { CHAPTERS_FOR_BOOK_QUERY } from '@/lib/graphql/queries';
import type { ChapterItem, ChaptersQueryResult } from '@/types/book';

export async function fetchChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
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
