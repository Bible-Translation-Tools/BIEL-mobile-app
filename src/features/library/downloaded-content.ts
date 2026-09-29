import { getCanonicalChapterCount, isOldTestament } from '@/constants/bible-books';
import {
  listDownloadedAudioBookSlugs,
  listDownloadedBookSlugs,
  listLanguagesWithDownloads,
  listLocalContentBooks,
  listLocalContentBooksForLanguage,
} from '@/db';
import { sortBooks } from '@/features/catalog/books';
import {
  LANGUAGE_CATALOG_LOAD_FAILED,
  withDownloadStatus,
  type LanguageCatalogSnapshot,
} from '@/features/catalog/language-cache';
import { loadOfflineAudioChapterNumbers } from '@/features/downloads/offline-audio';
import { loadOfflineChapterNumbers } from '@/features/downloads/offline-scripture';
import type { BookItem, ChapterItem } from '@/types/book';
import type { LanguageItem } from '@/types/language';

export type DownloadedLibraryLanguage = {
  language: LanguageItem;
  books: BookItem[];
};

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

/** Languages with local books for the Downloads Library accordion. Local DB only. */
export async function loadDownloadedLibrary(): Promise<DownloadedLibraryLanguage[]> {
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

/** Languages that have local scripture and/or audio (Downloads Library). */
export async function loadDownloadedLanguages(): Promise<LanguageCatalogSnapshot> {
  try {
    const items = await listLanguagesWithDownloads();
    try {
      return {
        languages: await withDownloadStatus(items),
        error: null,
      };
    } catch {
      return { languages: items, error: null };
    }
  } catch (err) {
    return {
      languages: [],
      error: err instanceof Error ? err.message : LANGUAGE_CATALOG_LOAD_FAILED,
    };
  }
}

/** Books that have local scripture and/or audio — Downloads Library / offline-only list. */
export async function loadDownloadedBooksForLanguage(languageCode: string): Promise<BookItem[]> {
  const records = await listLocalContentBooksForLanguage(languageCode);
  return sortBooks(records.map(localRecordToBookItem));
}

/** Slugs of books with downloaded scripture and audio. Local DB only; failures yield empty lists. */
export async function loadDownloadedBookSlugsByKind(
  languageCode: string,
): Promise<{ scripture: string[]; audio: string[] }> {
  const [scripture, audio] = await Promise.all([
    listDownloadedBookSlugs(languageCode).catch(() => []),
    listDownloadedAudioBookSlugs(languageCode).catch(() => []),
  ]);
  return { scripture, audio };
}

/** Full book chapter grid for Downloads Library: every chapter, with local text/audio flags. */
export async function loadDownloadedChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
  const [scripture, audio] = await Promise.all([
    loadOfflineChapterNumbers(languageCode, bookSlug),
    loadOfflineAudioChapterNumbers(languageCode, bookSlug),
  ]);
  const scriptureSet = new Set(scripture);
  const audioSet = new Set(audio);
  const localNumbers = new Set([...scripture, ...audio]);
  const canonicalCount = getCanonicalChapterCount(bookSlug) ?? 0;
  const maxLocal = localNumbers.size > 0 ? Math.max(...localNumbers) : 0;
  const total = Math.max(canonicalCount, maxLocal);

  if (total === 0) {
    return [];
  }

  return Array.from({ length: total }, (_, index) => {
    const number = index + 1;
    const hasText = scriptureSet.has(number);
    const hasAudio = audioSet.has(number);
    return { number, available: hasText || hasAudio, hasText, hasAudio };
  });
}
