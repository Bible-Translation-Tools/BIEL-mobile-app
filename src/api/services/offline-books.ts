import { File } from 'expo-file-system';

import { graphqlRequest } from '@/api/graphql/client';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import { BOOK_CONTENT_QUERY } from '@/api/graphql/queries';
import { pickRendering } from '@/api/services/resource-selection';
import { parseWholeBookJson } from '@/api/services/whole-book-parser';
import {
  ensureOfflineBookDirectory,
  ensureOfflineRootExists,
  getOfflineBookDirectory,
  getWholeJsonFile,
  normalizeBookSlug,
} from '@/constants/offline-storage';
import {
  deleteBook as deleteBookRecord,
  getBookDownloadRecord,
  getChapterNumbersForBook,
  upsertBookWithChapters,
} from '@/db';
import type { BookContentQueryResult, ResolvedBookContent } from '@/types/offline';

function abortError(): Error {
  const error = new Error('Download aborted');
  error.name = 'AbortError';
  return error;
}

let wholeBookCache: Map<string, Map<number, string>> = new Map();

function cacheKey(languageCode: string, bookSlug: string): string {
  return `${languageCode}:${bookSlug.toUpperCase()}`;
}

export async function resolveBookContent(
  languageCode: string,
  bookSlug: string,
): Promise<ResolvedBookContent> {
  const data = await graphqlRequest<BookContentQueryResult>(BOOK_CONTENT_QUERY, {
    languageCode,
    bookSlug,
  });

  const rendering = pickRendering(data.scriptural_rendering_metadata, { bookSlug });
  if (!rendering?.rendered_content.url) {
    throw new Error('Book content not found');
  }

  return {
    bookName: rendering.book_name,
    bookSlug: rendering.book_slug,
    url: rendering.rendered_content.url,
    resourceType: rendering.rendered_content.content.resource_type,
    contentName: rendering.rendered_content.content.name,
    fileSizeBytes: rendering.rendered_content.file_size_bytes,
  };
}

export async function getBookScriptureFileSizeBytes(
  languageCode: string,
  bookSlug: string,
): Promise<number> {
  const resolved = await resolveBookContent(languageCode, bookSlug);
  return resolved.fileSizeBytes;
}

export async function isBookDownloaded(
  languageCode: string,
  bookSlug: string,
): Promise<boolean> {
  const record = await getBookDownloadRecord(languageCode, bookSlug);
  if (!record) return false;
  return getWholeJsonFile(languageCode, bookSlug).exists;
}

export async function loadWholeBookChapters(
  languageCode: string,
  bookSlug: string,
): Promise<Map<number, string>> {
  const key = cacheKey(languageCode, bookSlug);
  const cached = wholeBookCache.get(key);
  if (cached) return cached;

  const file = getWholeJsonFile(languageCode, bookSlug);
  if (!file.exists) {
    return new Map();
  }

  const jsonText = await file.text();
  const payload = JSON.parse(jsonText) as unknown;
  const chapters = parseWholeBookJson(payload);
  wholeBookCache.set(key, chapters);
  return chapters;
}

export async function getOfflineChapterHtml(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<{ html: string; bookName: string } | null> {
  const record = await getBookDownloadRecord(languageCode, bookSlug);
  if (!record) return null;

  const file = getWholeJsonFile(languageCode, bookSlug);
  if (!file.exists) return null;

  const chapters = await loadWholeBookChapters(languageCode, bookSlug);
  const html = chapters.get(chapter);
  if (!html) return null;

  return { html, bookName: record.bookName };
}

export type DownloadProgressCallback = (progress: number) => void;

export async function downloadBookScripture(
  languageCode: string,
  bookSlug: string,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<void> {
  await ensureOfflineRootExists();

  const resolved = await resolveBookContent(languageCode, bookSlug);
  if (options?.signal?.aborted) {
    throw abortError();
  }

  options?.onProgress?.(0.1);

  const response = await fetchRenderedContent(resolved.url, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to download book (${response.status})`);
  }

  const jsonText = (await response.text()).trim();
  if (options?.signal?.aborted) {
    throw abortError();
  }

  options?.onProgress?.(0.6);

  let payload: unknown;
  try {
    payload = JSON.parse(jsonText) as unknown;
  } catch {
    const preview = jsonText.slice(0, 80);
    if (preview.startsWith('<')) {
      throw new Error('Download returned HTML instead of book data');
    }
    if (preview.startsWith('\\id ')) {
      throw new Error('Received USFM text instead of whole.json');
    }
    throw new Error('Downloaded book data is not valid JSON');
  }
  const chapters = parseWholeBookJson(payload);
  if (chapters.size === 0) {
    throw new Error('Downloaded book has no chapters');
  }

  const canonicalSlug = normalizeBookSlug(bookSlug);
  ensureOfflineBookDirectory(languageCode, canonicalSlug);

  const wholeFile = getWholeJsonFile(languageCode, canonicalSlug);
  const tempFile = new File(wholeFile.parentDirectory, 'whole.json.tmp');
  if (tempFile.exists) {
    tempFile.delete();
  }
  tempFile.write(jsonText);
  if (wholeFile.exists) {
    wholeFile.delete();
  }
  tempFile.move(wholeFile);

  wholeBookCache.set(cacheKey(languageCode, canonicalSlug), chapters);

  options?.onProgress?.(0.9);

  const byteSize = new TextEncoder().encode(jsonText).length;
  const chapterNumbers = [...chapters.keys()].sort((a, b) => a - b);

  await upsertBookWithChapters({
    languageCode,
    bookSlug: canonicalSlug,
    bookName: resolved.bookName,
    resourceType: resolved.resourceType,
    contentName: resolved.contentName,
    sourceUrl: resolved.url,
    localPath: wholeFile.uri,
    byteSize,
    chapterNumbers,
  });

  options?.onProgress?.(1);
}

export async function deleteBookScripture(languageCode: string, bookSlug: string): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  wholeBookCache.delete(cacheKey(languageCode, canonicalSlug));

  const bookDir = getOfflineBookDirectory(languageCode, canonicalSlug);
  if (bookDir.exists) {
    bookDir.delete();
  }

  await deleteBookRecord(languageCode, canonicalSlug);
}

export async function getOfflineChapterNumbers(
  languageCode: string,
  bookSlug: string,
): Promise<number[]> {
  if (!(await isBookDownloaded(languageCode, bookSlug))) {
    return [];
  }
  return getChapterNumbersForBook(languageCode, normalizeBookSlug(bookSlug));
}

export async function getDownloadedBookByteSize(
  languageCode: string,
  bookSlug: string,
): Promise<number | null> {
  const record = await getBookDownloadRecord(languageCode, bookSlug);
  return record?.byteSize ?? null;
}
