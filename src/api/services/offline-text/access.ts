import { File } from 'expo-file-system';

import { graphqlRequest } from '@/api/graphql/client';
import { CHAPTER_CONTENT_QUERY } from '@/api/graphql/queries';
import { resolveLanguageBookSlugs } from '@/api/services/books';
import { pickRendering } from '@/api/services/resource-selection';
import { getChapterHtmlFile, getWholeJsonFile, normalizeBookSlug } from '@/constants/offline-storage';
import {
  getBookDownloadRecord,
  getChapterNumbersForBook,
  getScriptureChapterRecord,
  listDownloadedBooksForLanguage,
  listScriptureChapterNumbersForBook,
} from '@/db';
import type { ChapterContentQueryResult } from '@/types/reading';

import { loadWholeBookChapters } from './cache';
import {
  fetchLanguageScriptureFiles,
  parseLanguageScriptureBytesBySlug,
} from './resolve';

export async function isBookDownloaded(
  languageCode: string,
  bookSlug: string,
): Promise<boolean> {
  const record = await getBookDownloadRecord(languageCode, bookSlug);
  if (!record) return false;
  return getWholeJsonFile(languageCode, bookSlug).exists;
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

export async function hasStandaloneChapterScripture(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<boolean> {
  const record = await getScriptureChapterRecord(languageCode, bookSlug, chapter);
  if (record) return true;
  return getChapterHtmlFile(languageCode, bookSlug, chapter).exists;
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
