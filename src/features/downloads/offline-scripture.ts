import { File } from 'expo-file-system';

import { catalogApi } from '@/api/catalog';
import { fetchRenderedContent } from '@/api/content-fetch';
import {
    ensureOfflineRootExists,
    ensureOfflineScriptureDirectory,
    getChapterHtmlFile,
    getWholeJsonFile,
    removeBookScriptureDirectory,
    writeFileAtomically,
} from '@/api/offline-storage';
import {
    deleteBook as deleteBookRecord,
    deleteScriptureChapter as deleteScriptureChapterRecord,
    deleteScriptureChaptersForBook,
    getBookDownloadRecord,
    getChapterNumbersForBook,
    getScriptureChapterRecord,
    listDownloadedBooksForLanguage,
    listDownloadedBookSlugs,
    listScriptureChapterNumbersForBook,
    sumScriptureChapterByteSizeForBook,
    upsertBookWithChapters,
    upsertScriptureChapter,
} from '@/db';
import { normalizeBookSlug } from '@/domain/book-slug';
import { averageProgress, DOWNLOAD_CANCELLED, DOWNLOAD_COMPLETED } from '@/domain/downloads';
import { bookByteSizesFromRenderings, pickRendering } from '@/domain/resource-selection';
import {
    extractChapterNumbersFromWholeBookJson,
    offlineBookChapterHtmlMap,
    parseDownloadedBookJson,
    parseWholeBookJson,
    withOfflineBookIdentity,
} from '@/domain/whole-book-parser';
import { getLanguageBookSlugs } from '@/features/catalog/books';
import type { ScriptureRendering } from '@/types/catalog';
import type { DownloadOutcome } from '@/types/download';
import type { OfflineBook, ResolvedBookContent } from '@/types/offline';
import { createAbortError, isAbortError, runWithConcurrency } from '@/utils/run-with-concurrency';
import { yieldToUi } from '@/utils/yield-to-ui';

const SCRIPTURE_BOOK_DOWNLOAD_CONCURRENCY = 10;

/** Dedupes overlapping language scripture catalog requests per language code. */
const languageScriptureFilesInflight = new Map<string, Promise<ScriptureRendering[]>>();

let wholeBookCache: Map<string, OfflineBook> = new Map();

function cacheKey(languageCode: string, bookSlug: string): string {
  return `${languageCode}:${bookSlug.toUpperCase()}`;
}

export async function fetchBookContent(
  languageCode: string,
  bookSlug: string,
): Promise<ResolvedBookContent> {
  const renderings = await catalogApi.getBookRenderings(languageCode, bookSlug);

  const rendering = pickRendering(renderings, { bookSlug });
  if (!rendering?.url) {
    throw new Error('Book content not found');
  }

  return {
    bookName: rendering.bookName,
    bookSlug: rendering.bookSlug ?? bookSlug,
    url: rendering.url,
    hash: rendering.hash,
    resourceType: rendering.resourceType,
    contentName: rendering.contentName,
    fileSizeBytes: rendering.fileSizeBytes ?? 0,
  };
}

export async function fetchBookScriptureFileSizeBytes(
  languageCode: string,
  bookSlug: string,
): Promise<number> {
  const resolved = await fetchBookContent(languageCode, bookSlug);
  return resolved.fileSizeBytes;
}

async function fetchLanguageScriptureFiles(languageCode: string): Promise<ScriptureRendering[]> {
  const key = languageCode.toUpperCase();
  const inflight = languageScriptureFilesInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const request = catalogApi.getLanguageScriptureRenderings(languageCode).finally(() => {
    languageScriptureFilesInflight.delete(key);
  });
  languageScriptureFilesInflight.set(key, request);
  return request;
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

async function loadOfflineChapterHtmlFromFile(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<{ html: string; bookName: string } | null> {
  const chapterFile = getChapterHtmlFile(languageCode, bookSlug, chapter);
  if (chapterFile.exists) {
    const record = await getScriptureChapterRecord(languageCode, bookSlug, chapter);
    return {
      html: await chapterFile.text(),
      bookName: record?.bookName ?? bookSlug,
    };
  }

  const record = await getScriptureChapterRecord(languageCode, bookSlug, chapter);
  if (!record) return null;

  const file = new File(record.localPath);
  if (!file.exists) return null;

  return { html: await file.text(), bookName: record.bookName };
}

export async function loadOfflineChapterHtml(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<{ html: string; bookName: string } | null> {
  const fromFile = await loadOfflineChapterHtmlFromFile(languageCode, bookSlug, chapter);
  if (fromFile) return fromFile;

  const record = await getBookDownloadRecord(languageCode, bookSlug);
  if (!record) return null;

  if (!getWholeJsonFile(languageCode, bookSlug).exists) return null;

  const chapters = await loadWholeBookChapters(languageCode, bookSlug);
  const html = chapters.get(chapter);
  if (!html) return null;

  return { html, bookName: record.bookName };
}

export async function isChapterScriptureDownloaded(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<boolean> {
  const chapterFile = getChapterHtmlFile(languageCode, bookSlug, chapter);
  if (chapterFile.exists) return true;

  const record = await getScriptureChapterRecord(languageCode, bookSlug, chapter);
  if (record) {
    const file = new File(record.localPath);
    if (file.exists) return true;
  }

  const bookRecord = await getBookDownloadRecord(languageCode, bookSlug);
  if (!bookRecord || !getWholeJsonFile(languageCode, bookSlug).exists) {
    return false;
  }

  const chapters = await loadWholeBookChapters(languageCode, bookSlug);
  return chapters.has(chapter);
}

export async function getChapterScriptureFileSizeBytes(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<number> {
  const record = await getScriptureChapterRecord(languageCode, bookSlug, chapter);
  if (record) return record.byteSize;

  const renderings = await catalogApi.getChapterRenderings(languageCode, bookSlug, chapter);

  const rendering = pickRendering(renderings, {
    bookSlug,
    requireChapter: true,
  });

  return rendering?.fileSizeBytes ?? 0;
}

export async function loadDownloadedChapterScriptureByteSize(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<number | null> {
  const record = await getScriptureChapterRecord(languageCode, bookSlug, chapter);
  if (record) return record.byteSize;

  if (await isChapterScriptureDownloaded(languageCode, bookSlug, chapter)) {
    return getChapterScriptureFileSizeBytes(languageCode, bookSlug, chapter).catch(() => null);
  }

  return null;
}

export async function downloadChapterScripture(
  languageCode: string,
  bookSlug: string,
  chapter: number,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<DownloadOutcome> {
  await ensureOfflineRootExists();

  const renderings = await catalogApi.getChapterRenderings(languageCode, bookSlug, chapter);

  const rendering = pickRendering(renderings, {
    bookSlug,
    requireChapter: true,
  });

  if (!rendering?.chapter || !rendering.url) {
    throw new Error('Chapter content not found');
  }

  if (options?.signal?.aborted) {
    throw createAbortError();
  }

  options?.onProgress?.(0.1);

  const response = await fetchRenderedContent(rendering.url, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to download chapter (${response.status})`);
  }

  const html = await response.text();
  if (options?.signal?.aborted) {
    throw createAbortError();
  }

  options?.onProgress?.(0.8);

  const canonicalSlug = normalizeBookSlug(bookSlug);
  ensureOfflineScriptureDirectory(languageCode, canonicalSlug);

  const htmlFile = getChapterHtmlFile(languageCode, canonicalSlug, chapter);
  writeFileAtomically(htmlFile, html);

  const byteSize = new TextEncoder().encode(html).length;

  await upsertScriptureChapter({
    languageCode,
    bookSlug: canonicalSlug,
    chapterNumber: chapter,
    bookName: rendering.bookName,
    resourceType: rendering.resourceType,
    contentName: rendering.contentName,
    sourceUrl: rendering.url,
    localPath: htmlFile.uri,
    byteSize,
    contentHash: rendering.hash,
  });

  options?.onProgress?.(1);
  return DOWNLOAD_COMPLETED;
}

export async function hasStandaloneChapterScripture(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<boolean> {
  const record = await getScriptureChapterRecord(languageCode, bookSlug, chapter);
  if (record) return true;
  return getChapterHtmlFile(languageCode, bookSlug, chapter).exists;
}

export async function deleteChapterScripture(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const htmlFile = getChapterHtmlFile(languageCode, canonicalSlug, chapter);
  if (htmlFile.exists) {
    htmlFile.delete();
  }

  await deleteScriptureChapterRecord(languageCode, canonicalSlug, chapter);
}

export type DownloadProgressCallback = (progress: number) => void;

export async function downloadBookScripture(
  languageCode: string,
  bookSlug: string,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<DownloadOutcome> {
  await ensureOfflineRootExists();

  const canonicalSlug = normalizeBookSlug(bookSlug);
  let completed = false;

  try {
    const resolved = await fetchBookContent(languageCode, bookSlug);
    if (options?.signal?.aborted) {
      throw createAbortError();
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
      throw createAbortError();
    }

    options?.onProgress?.(0.6);

    await yieldToUi();

    const payload = parseDownloadedBookJson(jsonText);

    await yieldToUi();

    const chapterNumbers = extractChapterNumbersFromWholeBookJson(payload);
    if (chapterNumbers.length === 0) {
      throw new Error('Downloaded book has no chapters');
    }

    ensureOfflineScriptureDirectory(languageCode, canonicalSlug);

    const bookJsonFile = getWholeJsonFile(languageCode, canonicalSlug);
    writeFileAtomically(bookJsonFile, jsonText);

    wholeBookCache.delete(cacheKey(languageCode, canonicalSlug));

    options?.onProgress?.(0.9);

    await yieldToUi();

    const byteSize = new TextEncoder().encode(jsonText).length;

    await upsertBookWithChapters({
      languageCode,
      bookSlug: canonicalSlug,
      bookName: resolved.bookName,
      resourceType: resolved.resourceType,
      contentName: resolved.contentName,
      sourceUrl: resolved.url,
      localPath: bookJsonFile.uri,
      byteSize,
      contentHash: resolved.hash,
      chapterNumbers,
    });

    completed = true;
    options?.onProgress?.(1);
    return DOWNLOAD_COMPLETED;
  } catch (err) {
    if (isAbortError(err)) {
      if (!completed) {
        removeBookScriptureDirectory(languageCode, canonicalSlug);
      }
      return DOWNLOAD_CANCELLED;
    }
    throw err;
  }
}

export async function deleteBookScripture(languageCode: string, bookSlug: string): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  wholeBookCache.delete(cacheKey(languageCode, canonicalSlug));

  removeBookScriptureDirectory(languageCode, canonicalSlug);

  await deleteBookRecord(languageCode, canonicalSlug);
  await deleteScriptureChaptersForBook(languageCode, canonicalSlug);
}

export async function loadOfflineChapterNumbers(
  languageCode: string,
  bookSlug: string,
): Promise<number[]> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const numbers = new Set<number>();

  if (await isBookDownloaded(languageCode, bookSlug)) {
    for (const chapterNumber of await getChapterNumbersForBook(languageCode, canonicalSlug)) {
      numbers.add(chapterNumber);
    }
  }

  for (const chapterNumber of await listScriptureChapterNumbersForBook(
    languageCode,
    canonicalSlug,
  )) {
    numbers.add(chapterNumber);
  }

  return [...numbers].sort((a, b) => a - b);
}

export async function loadDownloadedBookByteSize(
  languageCode: string,
  bookSlug: string,
): Promise<number | null> {
  const record = await getBookDownloadRecord(languageCode, bookSlug);
  if (record) return record.byteSize;

  const chapterBytes = await sumScriptureChapterByteSizeForBook(languageCode, bookSlug);
  return chapterBytes > 0 ? chapterBytes : null;
}

export async function loadLanguageDownloadedByteSize(languageCode: string): Promise<number> {
  const records = await listDownloadedBooksForLanguage(languageCode);
  return records.reduce((sum, record) => sum + record.byteSize, 0);
}

export async function getLanguageScriptureTotalBytes(languageCode: string): Promise<number> {
  const [slugs, remoteBytesBySlug, downloadedRecords] = await Promise.all([
    getLanguageBookSlugs(languageCode),
    fetchLanguageScriptureFiles(languageCode).then(bookByteSizesFromRenderings),
    listDownloadedBooksForLanguage(languageCode),
  ]);

  const downloadedBytesBySlug = new Map(
    downloadedRecords.map((record) => [normalizeBookSlug(record.bookSlug), record.byteSize]),
  );

  return slugs.reduce((total, bookSlug) => {
    const canonicalSlug = normalizeBookSlug(bookSlug);
    const downloadedBytes = downloadedBytesBySlug.get(canonicalSlug);
    if (downloadedBytes != null) {
      return total + downloadedBytes;
    }

    return total + (remoteBytesBySlug.get(canonicalSlug) ?? 0);
  }, 0);
}

export async function isLanguageScriptureDownloaded(languageCode: string): Promise<boolean> {
  const slugs = await getLanguageBookSlugs(languageCode);
  if (slugs.length === 0) return false;

  for (const bookSlug of slugs) {
    if (!(await isBookDownloaded(languageCode, bookSlug))) {
      return false;
    }
  }
  return true;
}

export async function downloadLanguageScripture(
  languageCode: string,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<DownloadOutcome> {
  const slugs = await getLanguageBookSlugs(languageCode);
  if (slugs.length === 0) {
    throw new Error('No books available to download for this language');
  }

  const pendingSlugs: string[] = [];
  for (const bookSlug of slugs) {
    if (options?.signal?.aborted) {
      return DOWNLOAD_CANCELLED;
    }
    if (!(await isBookDownloaded(languageCode, bookSlug))) {
      pendingSlugs.push(bookSlug);
    }
  }

  if (pendingSlugs.length === 0) {
    options?.onProgress?.(1);
    return DOWNLOAD_COMPLETED;
  }

  const failedBookSlugs: string[] = [];

  const progressByBook = new Array<number>(pendingSlugs.length).fill(0);
  const reportOverallProgress = () => {
    options?.onProgress?.(averageProgress(progressByBook));
  };

  await runWithConcurrency(
    pendingSlugs,
    SCRIPTURE_BOOK_DOWNLOAD_CONCURRENCY,
    async (bookSlug, index) => {
      if (options?.signal?.aborted) {
        return;
      }

      try {
        await downloadBookScripture(languageCode, bookSlug, {
          signal: options?.signal,
          onProgress: (bookProgress) => {
            progressByBook[index] = bookProgress;
            reportOverallProgress();
          },
        });
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }
        console.warn('[offline-scripture] book download failed', { languageCode, bookSlug, err });
        failedBookSlugs.push(bookSlug);
        progressByBook[index] = 1;
        reportOverallProgress();
      }
    },
  );

  if (options?.signal?.aborted) {
    return DOWNLOAD_CANCELLED;
  }

  options?.onProgress?.(1);
  return failedBookSlugs.length > 0
    ? { status: 'partial', failedBookSlugs }
    : DOWNLOAD_COMPLETED;
}

export async function deleteLanguageScripture(languageCode: string): Promise<void> {
  const slugs = await listDownloadedBookSlugs(languageCode);
  for (const bookSlug of slugs) {
    await deleteBookScripture(languageCode, bookSlug);
  }
}
