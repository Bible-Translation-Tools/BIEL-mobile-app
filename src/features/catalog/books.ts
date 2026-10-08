import { catalogApi } from '@/api/catalog';
import { BOOK_SLUG_ORDER, isOldTestament } from '@/constants/bible-books';
import { listBookCatalog, listDownloadedBooksForLanguage, replaceBookCatalog } from '@/db';
import type { BookItem } from '@/types/book';
import type { CatalogBook } from '@/types/catalog';

function mapCatalogBookToItem(book: CatalogBook): BookItem | null {
  const slug = book.bookSlug?.trim();
  if (!slug || !BOOK_SLUG_ORDER.has(slug as never)) {
    return null;
  }

  return {
    id: slug,
    name: book.bookName,
    slug,
    testament: isOldTestament(slug) ? 'old' : 'new',
    downloadStatus: 'pending',
    audioDownloadStatus: 'pending',
    hasAudio: false,
  };
}

export function sortBooks(books: BookItem[]): BookItem[] {
  return [...books].sort(
    (a, b) =>
      (BOOK_SLUG_ORDER.get(a.slug as never) ?? 999) - (BOOK_SLUG_ORDER.get(b.slug as never) ?? 999),
  );
}

export async function fetchBooksForLanguage(languageCode: string): Promise<BookItem[]> {
  const catalogBooks = await catalogApi.getBooksForLanguage(languageCode);

  const books = catalogBooks
    .map(mapCatalogBookToItem)
    .filter((book): book is BookItem => book !== null);

  const sorted = sortBooks(books);
  try {
    await replaceBookCatalog(languageCode, sorted);
  } catch {
    // Catalog cache is optional; do not fail the online book list.
  }
  return sorted;
}

function downloadedRecordToBookItem(record: { bookSlug: string; bookName: string }): BookItem {
  const slug = record.bookSlug;
  return {
    id: slug,
    name: record.bookName,
    slug,
    testament: isOldTestament(slug) ? 'old' : 'new',
    downloadStatus: 'downloaded',
    audioDownloadStatus: 'pending',
    hasAudio: false,
  };
}

/** Loads books from SQLite when the network catalog is unavailable. */
export async function loadBooksForLanguage(languageCode: string): Promise<BookItem[]> {
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

/** Cache, then network, then downloaded-only: slugs for bulk download. */
export async function getLanguageBookSlugs(languageCode: string): Promise<string[]> {
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
