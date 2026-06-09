import { BOOK_SLUG_ORDER, isOldTestament } from '@/constants/bible-books';
import { graphqlRequest } from '@/api/graphql/client';
import { BOOKS_FOR_LANGUAGE_QUERY } from '@/api/graphql/queries';
import {
  listBookCatalog,
  listDownloadedBooksForLanguage,
  replaceBookCatalog,
} from '@/db';
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
    audioDownloadStatus: 'pending',
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

  const sorted = sortBooks(books);
  try {
    await replaceBookCatalog(languageCode, sorted);
  } catch {
    // Catalog cache is optional; do not fail the online book list.
  }
  return sorted;
}

function downloadedRecordToBookItem(record: {
  bookSlug: string;
  bookName: string;
}): BookItem {
  const slug = record.bookSlug;
  return {
    id: slug,
    name: record.bookName,
    slug,
    testament: isOldTestament(slug) ? 'old' : 'new',
    downloadStatus: 'downloaded',
    audioDownloadStatus: 'pending',
  };
}

/** Loads books from SQLite when the network catalog is unavailable. */
export async function fetchBooksForLanguageOffline(languageCode: string): Promise<BookItem[]> {
  const catalog = await listBookCatalog(languageCode);
  const downloaded = await listDownloadedBooksForLanguage(languageCode).catch(() => []);

  if (catalog.length === 0) {
    return sortBooks(downloaded.map(downloadedRecordToBookItem));
  }

  if (downloaded.length === 0) {
    return sortBooks(catalog);
  }

  const bySlug = new Map<string, BookItem>();
  for (const book of catalog) {
    bySlug.set(book.slug.toUpperCase(), book);
  }
  for (const record of downloaded) {
    const item = downloadedRecordToBookItem(record);
    bySlug.set(item.slug.toUpperCase(), item);
  }

  return sortBooks([...bySlug.values()]);
}

/** Book slugs for bulk download: cached catalog, then network, then downloaded-only fallback. */
export async function resolveLanguageBookSlugs(languageCode: string): Promise<string[]> {
  const catalog = await listBookCatalog(languageCode);
  if (catalog.length > 0) {
    return catalog.map((book) => book.slug);
  }

  try {
    const books = await fetchBooksForLanguage(languageCode);
    if (books.length > 0) {
      return books.map((book) => book.slug);
    }
  } catch {
    // Fall through to downloaded-only list when offline.
  }

  const downloaded = await listDownloadedBooksForLanguage(languageCode).catch(() => []);
  if (downloaded.length > 0) {
    return downloaded.map((record) => record.bookSlug);
  }

  throw new Error('Book list unavailable. Connect to the internet and open this language first.');
}
