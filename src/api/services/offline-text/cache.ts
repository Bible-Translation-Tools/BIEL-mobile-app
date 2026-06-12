import {
  offlineBookChapterHtmlMap,
  parseWholeBookJson,
} from '@/api/services/whole-book-parser';
import { getWholeJsonFile, normalizeBookSlug } from '@/constants/offline-storage';
import type { OfflineBook } from '@/types/offline';

let wholeBookCache: Map<string, OfflineBook> = new Map();

export function cacheKey(languageCode: string, bookSlug: string): string {
  return `${languageCode}:${bookSlug.toUpperCase()}`;
}

function withOfflineBookIdentity(
  book: OfflineBook,
  identity: { slug: string; name: string },
): OfflineBook {
  return {
    ...book,
    slug: book.slug || identity.slug,
    name: book.name || identity.name,
  };
}

export function clearWholeBookCache(languageCode: string, bookSlug: string): void {
  wholeBookCache.delete(cacheKey(languageCode, bookSlug));
}

export async function loadWholeBookChapters(
  languageCode: string,
  bookSlug: string,
): Promise<Map<number, string>> {
  const key = cacheKey(languageCode, bookSlug);
  const cached = wholeBookCache.get(key);
  if (cached) return offlineBookChapterHtmlMap(cached);

  const file = getWholeJsonFile(languageCode, bookSlug);
  if (!file.exists) {
    return new Map();
  }

  const jsonText = await file.text();
  const payload = JSON.parse(jsonText) as unknown;
  const offlineBook = withOfflineBookIdentity(parseWholeBookJson(payload), {
    slug: normalizeBookSlug(bookSlug),
    name: bookSlug,
  });
  wholeBookCache.set(key, offlineBook);
  return offlineBookChapterHtmlMap(offlineBook);
}
