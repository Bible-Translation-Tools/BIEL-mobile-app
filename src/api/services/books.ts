import { catalogApi } from '@/api/catalog';
import { BOOK_SLUG_ORDER, isOldTestament } from '@/constants/bible-books';
import {
  listBookCatalog,
  listDownloadedBooksForLanguage,
  listLanguagesWithDownloads,
  listLocalContentBooks,
  listLocalContentBooksForLanguage,
  replaceBookCatalog,
} from '@/db';
import type { ApiBookMetadata, BookItem } from '@/types/book';
import type { LanguageItem } from '@/types/language';

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
    hasAudio: false,
  };
}

function sortBooks(books: BookItem[]): BookItem[] {
  return [...books].sort(
    (a, b) => (BOOK_SLUG_ORDER.get(a.slug as never) ?? 999) - (BOOK_SLUG_ORDER.get(b.slug as never) ?? 999),
  );
}

export async function fetchBooksForLanguage(languageCode: string): Promise<BookItem[]> {
  const data = await catalogApi.getBooksForLanguage(languageCode);

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
    hasAudio: false,
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

function localRecordToBookItem(record: {
  bookSlug: string;
  bookName: string;
  hasText: boolean;
  hasAudio: boolean;
}): BookItem {
  const slug = record.bookSlug;
  return {
    id: slug,
    name: record.bookName,
    slug,
    testament: isOldTestament(slug) ? 'old' : 'new',
    downloadStatus: record.hasText ? 'downloaded' : 'pending',
    audioDownloadStatus: record.hasAudio ? 'downloaded' : 'pending',
    hasAudio: record.hasAudio,
  } satisfies BookItem;
}

/** Books that have local scripture and/or audio — Downloads Library / offline-only list. */
export async function fetchDownloadedBooksForLanguage(languageCode: string): Promise<BookItem[]> {
  const records = await listLocalContentBooksForLanguage(languageCode);
  return sortBooks(records.map(localRecordToBookItem));
}

export type DownloadedLibraryLanguage = {
  language: LanguageItem;
  books: BookItem[];
};

/** Languages with local books for the Downloads Library accordion. Local DB only. */
export async function fetchDownloadedLibrary(): Promise<DownloadedLibraryLanguage[]> {
  const [languages, records] = await Promise.all([
    listLanguagesWithDownloads(),
    listLocalContentBooks(),
  ]);

  const booksByLanguage = new Map<string, BookItem[]>();
  for (const record of records) {
    const key = record.languageCode.toUpperCase();
    const books = booksByLanguage.get(key) ?? [];
    books.push(localRecordToBookItem(record));
    booksByLanguage.set(key, books);
  }

  return languages.flatMap((language) => {
    const books = booksByLanguage.get(language.code.toUpperCase());
    if (!books || books.length === 0) return [];
    return [{ language, books: sortBooks(books) }];
  });
}

/** Book slugs for bulk download: network, then cached catalog, then downloaded-only fallback. */
export async function resolveLanguageBookSlugs(languageCode: string): Promise<string[]> {
  try {
    const books = await fetchBooksForLanguage(languageCode);
    if (books.length > 0) {
      return books.map((book) => book.slug);
    }
  } catch {
    // Fall through to cached catalog / downloaded-only list when offline.
  }

  const catalog = await listBookCatalog(languageCode);
  if (catalog.length > 0) {
    return catalog.map((book) => book.slug);
  }

  const downloaded = await listDownloadedBooksForLanguage(languageCode).catch(() => []);
  if (downloaded.length > 0) {
    return downloaded.map((record) => record.bookSlug);
  }

  throw new Error('Book list unavailable. Connect to the internet and open this language first.');
}
