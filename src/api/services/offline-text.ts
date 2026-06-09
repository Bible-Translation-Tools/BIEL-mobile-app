import { File } from 'expo-file-system';

import { resolveLanguageBookSlugs } from '@/api/services/books';
import { graphqlRequest } from '@/api/graphql/client';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import {
  BOOK_CONTENT_QUERY,
  CHAPTER_CONTENT_QUERY,
  LANGUAGE_SCRIPTURE_FILES_QUERY,
} from '@/api/graphql/queries';
import { pickRendering } from '@/api/services/resource-selection';
import {
  extractChapterNumbersFromWholeBookJson,
  offlineBookChapterHtmlMap,
  parseWholeBookJson,
} from '@/api/services/whole-book-parser';
import { isAbortError, runWithConcurrency } from '@/utils/run-with-concurrency';
import { yieldToUi } from '@/utils/yield-to-ui';

import {
  ensureOfflineRootExists,
  ensureOfflineScriptureDirectory,
  getChapterHtmlFile,
  getWholeJsonFile,
  normalizeBookSlug,
  removeBookScriptureDirectory,
  resolveExistingWholeJsonFile,
} from '@/constants/offline-storage';
import {
  deleteBook as deleteBookRecord,
  deleteScriptureChaptersForBook,
  deleteScriptureChapter as deleteScriptureChapterRecord,
  getBookDownloadRecord,
  getChapterNumbersForBook,
  getScriptureChapterRecord,
  listDownloadedBookSlugs,
  listDownloadedBooksForLanguage,
  listScriptureChapterNumbersForBook,
  upsertBookWithChapters,
  upsertScriptureChapter,
} from '@/db';
import type {
  ApiBookContentRendering,
  BookContentQueryResult,
  LanguageScriptureFilesQueryResult,
  OfflineBook,
  ResolvedBookContent,
} from '@/types/offline';
import type { ChapterContentQueryResult } from '@/types/reading';

const SCRIPTURE_BOOK_DOWNLOAD_CONCURRENCY = 10;

function abortError(): Error {
  const error = new Error('Download aborted');
  error.name = 'AbortError';
  return error;
}

/** Dedupes overlapping LANGUAGE_SCRIPTURE_FILES_QUERY requests per language code. */
const languageScriptureFilesInflight = new Map<string, Promise<LanguageScriptureFilesQueryResult>>();

let wholeBookCache: Map<string, OfflineBook> = new Map();

function cacheKey(languageCode: string, bookSlug: string): string {
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

async function fetchLanguageScriptureFiles(
  languageCode: string,
): Promise<LanguageScriptureFilesQueryResult> {
  const key = languageCode.toUpperCase();
  const inflight = languageScriptureFilesInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const request = graphqlRequest<LanguageScriptureFilesQueryResult>(
    LANGUAGE_SCRIPTURE_FILES_QUERY,
    { languageCode },
  ).finally(() => {
    languageScriptureFilesInflight.delete(key);
  });
  languageScriptureFilesInflight.set(key, request);
  return request;
}

function groupScriptureRenderingsByBookSlug(
  renderings: ApiBookContentRendering[],
): Map<string, ApiBookContentRendering[]> {
  const bySlug = new Map<string, ApiBookContentRendering[]>();

  for (const rendering of renderings) {
    const slug = normalizeBookSlug(rendering.book_slug);
    const grouped = bySlug.get(slug) ?? [];
    grouped.push(rendering);
    bySlug.set(slug, grouped);
  }

  return bySlug;
}

function parseLanguageScriptureBytesBySlug(
  data: LanguageScriptureFilesQueryResult,
): Map<string, number> {
  const bytesBySlug = new Map<string, number>();

  for (const [bookSlug, renderings] of groupScriptureRenderingsByBookSlug(
    data.scriptural_rendering_metadata,
  )) {
    const rendering = pickRendering(renderings, { bookSlug });
    if (rendering?.rendered_content.file_size_bytes != null) {
      bytesBySlug.set(bookSlug, rendering.rendered_content.file_size_bytes);
    }
  }

  return bytesBySlug;
}

export async function isBookDownloaded(
  languageCode: string,
  bookSlug: string,
): Promise<boolean> {
  const record = await getBookDownloadRecord(languageCode, bookSlug);
  if (!record) return false;
  return resolveExistingWholeJsonFile(languageCode, bookSlug) != null;
}

export async function loadWholeBookChapters(
  languageCode: string,
  bookSlug: string,
): Promise<Map<number, string>> {
  const key = cacheKey(languageCode, bookSlug);
  const cached = wholeBookCache.get(key);
  if (cached) return offlineBookChapterHtmlMap(cached);

  const file = resolveExistingWholeJsonFile(languageCode, bookSlug);
  if (!file) {
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

async function getOfflineChapterHtmlFromFile(
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

export async function getOfflineChapterHtml(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<{ html: string; bookName: string } | null> {
  const fromFile = await getOfflineChapterHtmlFromFile(languageCode, bookSlug, chapter);
  if (fromFile) return fromFile;

  const record = await getBookDownloadRecord(languageCode, bookSlug);
  if (!record) return null;

  if (!resolveExistingWholeJsonFile(languageCode, bookSlug)) return null;

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
  if (!bookRecord || !resolveExistingWholeJsonFile(languageCode, bookSlug)) {
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

  const data = await graphqlRequest<ChapterContentQueryResult>(CHAPTER_CONTENT_QUERY, {
    languageCode,
    bookSlug,
    chapter,
  });

  const rendering = pickRendering(data.scriptural_rendering_metadata, {
    bookSlug,
    requireChapter: true,
  });

  return rendering?.rendered_content.file_size_bytes ?? 0;
}

export async function getDownloadedChapterScriptureByteSize(
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
): Promise<void> {
  await ensureOfflineRootExists();

  const data = await graphqlRequest<ChapterContentQueryResult>(CHAPTER_CONTENT_QUERY, {
    languageCode,
    bookSlug,
    chapter,
  });

  const rendering = pickRendering(data.scriptural_rendering_metadata, {
    bookSlug,
    requireChapter: true,
  });

  if (!rendering?.chapter || !rendering.rendered_content.url) {
    throw new Error('Chapter content not found');
  }

  if (options?.signal?.aborted) {
    throw abortError();
  }

  options?.onProgress?.(0.1);

  const response = await fetchRenderedContent(rendering.rendered_content.url, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to download chapter (${response.status})`);
  }

  const html = await response.text();
  if (options?.signal?.aborted) {
    throw abortError();
  }

  options?.onProgress?.(0.8);

  const canonicalSlug = normalizeBookSlug(bookSlug);
  ensureOfflineScriptureDirectory(languageCode, canonicalSlug);

  const htmlFile = getChapterHtmlFile(languageCode, canonicalSlug, chapter);
  const tempFile = new File(htmlFile.parentDirectory, `${htmlFile.name}.tmp`);
  if (tempFile.exists) {
    tempFile.delete();
  }
  tempFile.write(html);
  if (htmlFile.exists) {
    htmlFile.delete();
  }
  tempFile.move(htmlFile);

  const byteSize = new TextEncoder().encode(html).length;

  await upsertScriptureChapter({
    languageCode,
    bookSlug: canonicalSlug,
    chapterNumber: chapter,
    bookName: rendering.book_name,
    resourceType: rendering.rendered_content.content.resource_type,
    contentName: rendering.rendered_content.content.name,
    sourceUrl: rendering.rendered_content.url,
    localPath: htmlFile.uri,
    byteSize,
  });

  options?.onProgress?.(1);
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
): Promise<void> {
  await ensureOfflineRootExists();

  const canonicalSlug = normalizeBookSlug(bookSlug);
  let completed = false;

  try {
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

    await yieldToUi();

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

    await yieldToUi();

    const chapterNumbers = extractChapterNumbersFromWholeBookJson(payload);
    if (chapterNumbers.length === 0) {
      throw new Error('Downloaded book has no chapters');
    }

    ensureOfflineScriptureDirectory(languageCode, canonicalSlug);

    const bookJsonFile = getWholeJsonFile(languageCode, canonicalSlug);
    const tempFile = new File(bookJsonFile.parentDirectory, 'whole.json.tmp');
    if (tempFile.exists) {
      tempFile.delete();
    }
    tempFile.write(jsonText);
    if (bookJsonFile.exists) {
      bookJsonFile.delete();
    }
    tempFile.move(bookJsonFile);

    wholeBookCache.delete(cacheKey(languageCode, canonicalSlug));

    options?.onProgress?.(0.9);

    await yieldToUi();

    const byteSize = jsonText.length;

    await upsertBookWithChapters({
      languageCode,
      bookSlug: canonicalSlug,
      bookName: resolved.bookName,
      resourceType: resolved.resourceType,
      contentName: resolved.contentName,
      sourceUrl: resolved.url,
      localPath: bookJsonFile.uri,
      byteSize,
      chapterNumbers,
    });

    completed = true;
    options?.onProgress?.(1);
  } catch (err) {
    if (isAbortError(err)) {
      if (!completed) {
        removeBookScriptureDirectory(languageCode, canonicalSlug);
      }
      return;
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

export async function getOfflineChapterNumbers(
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

export async function getDownloadedBookByteSize(
  languageCode: string,
  bookSlug: string,
): Promise<number | null> {
  const record = await getBookDownloadRecord(languageCode, bookSlug);
  return record?.byteSize ?? null;
}

export async function getLanguageDownloadedByteSize(languageCode: string): Promise<number> {
  const records = await listDownloadedBooksForLanguage(languageCode);
  return records.reduce((sum, record) => sum + record.byteSize, 0);
}

export async function getLanguageScriptureTotalBytes(languageCode: string): Promise<number> {
  const [slugs, remoteBytesBySlug, downloadedRecords] = await Promise.all([
    resolveLanguageBookSlugs(languageCode),
    fetchLanguageScriptureFiles(languageCode).then(parseLanguageScriptureBytesBySlug),
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
  const slugs = await resolveLanguageBookSlugs(languageCode);
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
): Promise<void> {
  const slugs = await resolveLanguageBookSlugs(languageCode);
  if (slugs.length === 0) {
    throw new Error('No books available to download for this language');
  }

  const pendingSlugs: string[] = [];
  for (const bookSlug of slugs) {
    if (options?.signal?.aborted) {
      break;
    }
    if (!(await isBookDownloaded(languageCode, bookSlug))) {
      pendingSlugs.push(bookSlug);
    }
  }

  if (pendingSlugs.length === 0) {
    options?.onProgress?.(1);
    return;
  }

  const progressByBook = new Array<number>(pendingSlugs.length).fill(0);
  const reportOverallProgress = () => {
    const overall =
      progressByBook.reduce((sum, bookProgress) => sum + bookProgress, 0) / pendingSlugs.length;
    options?.onProgress?.(overall);
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
        progressByBook[index] = 1;
        reportOverallProgress();
      }
    },
  );

  options?.onProgress?.(1);
}

export async function deleteLanguageScripture(languageCode: string): Promise<void> {
  const slugs = await listDownloadedBookSlugs(languageCode);
  for (const bookSlug of slugs) {
    await deleteBookScripture(languageCode, bookSlug);
  }
}
