import { BOOK_SLUG_ORDER, isOldTestament } from '@/constants/bible-books';
import { graphqlRequest } from '@/lib/graphql/client';
import { BOOKS_FOR_LANGUAGE_QUERY } from '@/lib/graphql/queries';
import type { ApiBookMetadata, BookItem, BooksQueryResult } from '@/types/book';

function mapApiBookToItem(book: ApiBookMetadata): BookItem | null {
  const slug = book.book_slug?.trim();
  if (!slug || !BOOK_SLUG_ORDER.has(slug as never)) {
    return null;
  }

  return {
    id: slug,
    name: book.book_name,
    slug,
    testament: isOldTestament(slug) ? 'old' : 'new',
    downloadStatus: 'pending',
  };
}

function sortBooks(books: BookItem[]): BookItem[] {
  return [...books].sort(
    (a, b) => (BOOK_SLUG_ORDER.get(a.slug as never) ?? 999) - (BOOK_SLUG_ORDER.get(b.slug as never) ?? 999),
  );
}

export async function fetchBooksForLanguage(languageCode: string): Promise<BookItem[]> {
  const data = await graphqlRequest<BooksQueryResult>(BOOKS_FOR_LANGUAGE_QUERY, {
    languageCode,
  });

  const books = data.scriptural_rendering_metadata
    .map(mapApiBookToItem)
    .filter((book): book is BookItem => book !== null);

  return sortBooks(books);
}
