import { File } from 'expo-file-system';

import { graphqlRequest } from '@/api/graphql/client';
import {
  BOOK_AUDIO_FILES_QUERY,
  CHAPTER_AUDIO_FILE_QUERY,
  LANGUAGE_AUDIO_FILES_QUERY,
} from '@/api/graphql/queries';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import { isAbortError, runWithConcurrency } from '@/utils/run-with-concurrency';

import {
  ensureOfflineAudioDirectory,
  ensureOfflineRootExists,
  getChapterCueFile,
  getChapterMp3File,
  getOfflineAudioDirectory,
  normalizeBookSlug,
} from '@/constants/offline-storage';
import type { AudioChapterRecord } from '@/db';
import {
  deleteAudioBook as deleteAudioBookRecord,
  deleteAudioChapter as deleteAudioChapterRecord,
  getAudioBookRecord,
  listAudioChaptersForBook,
  listDownloadedAudioBookSlugs,
  listDownloadedAudioBooksForLanguage,
  markAudioBookComplete,
  mergeAudioChapter,
  upsertAudioBookWithChapters,
} from '@/db';
import type {
  AudioBookManifest,
  BookAudioFilesQueryResult, ChapterAudioQueryResult, ResolvedChapterAudio
} from '@/types/audio';

const AUDIO_CHAPTER_DOWNLOAD_CONCURRENCY = 3;
export type DownloadProgressCallback = (progress: number) => void;

/** Dedupes overlapping LANGUAGE_AUDIO_FILES_QUERY requests per language code. */
const languageAudioFilesInflight = new Map<string, Promise<BookAudioFilesQueryResult>>();

function abortError(): Error {
  const error = new Error('Download aborted');
  error.name = 'AbortError';
  return error;
}

function isContentsUrl(url: string | null | undefined): boolean {
  return Boolean(url && url.includes('CONTENTS'));
}

function parseBookAudioManifest(
  data: BookAudioFilesQueryResult,
  bookSlug: string,
): Pick<AudioBookManifest, 'bookName' | 'chapters'> {
  const byChapter = new Map<
    number,
    { mp3Url?: string; mp3ByteSize?: number; cueUrl?: string; cueByteSize?: number }
  >();
  let bookName = bookSlug;

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      if (!isContentsUrl(rendered.url)) continue;

      const meta = rendered.scriptural_rendering_metadata;
      if (!meta) continue;

      const chapter = meta.chapter;
      if (chapter == null) continue;

      if (meta.book_name) {
        bookName = meta.book_name;
      }

      const entry = byChapter.get(chapter) ?? {};
      const fileType = rendered.file_type?.toLowerCase();

      if (fileType === 'mp3') {
        entry.mp3Url = rendered.url;
        entry.mp3ByteSize = rendered.file_size_bytes ?? 0;
      } else if (fileType === 'cue') {
        entry.cueUrl = rendered.url;
        entry.cueByteSize = rendered.file_size_bytes ?? 0;
      }

      byChapter.set(chapter, entry);
    }
  }

  const chapters: ResolvedChapterAudio[] = [...byChapter.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([chapter, entry]) => {
      if (!entry.mp3Url) return [];
      return [
        {
          chapter,
          mp3Url: entry.mp3Url,
          mp3ByteSize: entry.mp3ByteSize ?? 0,
          cueUrl: entry.cueUrl,
          cueByteSize: entry.cueByteSize,
        },
      ];
    });

  return { bookName, chapters };
}

function sumManifestBytes(manifest: Pick<AudioBookManifest, 'chapters'>): number {
  return manifest.chapters.reduce(
    (sum, chapter) => sum + chapter.mp3ByteSize + (chapter.cueByteSize ?? 0),
    0,
  );
}

function parseLanguageAudioManifests(
  data: BookAudioFilesQueryResult,
): Map<string, AudioBookManifest> {
  const renderedByBook = new Map<
    string,
    BookAudioFilesQueryResult['content'][number]['rendered_contents']
  >();

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      const meta = rendered.scriptural_rendering_metadata;
      if (!meta?.book_slug) continue;

      const slug = normalizeBookSlug(meta.book_slug);
      const renderedContents = renderedByBook.get(slug) ?? [];
      renderedContents.push(rendered);
      renderedByBook.set(slug, renderedContents);
    }
  }

  const manifests = new Map<string, AudioBookManifest>();
  for (const [bookSlug, renderedContents] of renderedByBook) {
    const { bookName, chapters } = parseBookAudioManifest(
      { content: [{ rendered_contents: renderedContents }] },
      bookSlug,
    );
    manifests.set(bookSlug, { bookSlug, bookName, chapters });
  }

  return manifests;
}

async function fetchLanguageAudioFiles(languageCode: string): Promise<BookAudioFilesQueryResult> {
  const key = languageCode.toUpperCase();
  const inflight = languageAudioFilesInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const request = graphqlRequest<BookAudioFilesQueryResult>(LANGUAGE_AUDIO_FILES_QUERY, {
    languageCode,
  }).finally(() => {
    languageAudioFilesInflight.delete(key);
  });
  languageAudioFilesInflight.set(key, request);
  return request;
}

async function getLanguageAudioManifests(
  languageCode: string,
): Promise<Map<string, AudioBookManifest>> {
  return parseLanguageAudioManifests(await fetchLanguageAudioFiles(languageCode));
}

function sumChapterBytes(chapters: AudioChapterRecord[]): number {
  return chapters.reduce((sum, chapter) => sum + chapter.mp3ByteSize + chapter.cueByteSize, 0);
}

function mergeChapterRecords(
  existing: AudioChapterRecord[],
  saved: AudioChapterRecord[],
): AudioChapterRecord[] {
  const mergedByNumber = new Map(existing.map((chapter) => [chapter.chapterNumber, chapter]));
  for (const chapter of saved) {
    mergedByNumber.set(chapter.chapterNumber, chapter);
  }
  return [...mergedByNumber.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

function isChapterMp3Available(
  languageCode: string,
  bookSlug: string,
  chapter: number,
  existing?: AudioChapterRecord,
): boolean {
  if (getChapterMp3File(languageCode, bookSlug, chapter).exists) {
    return true;
  }

  if (existing?.mp3Path && new File(existing.mp3Path).exists) {
    return true;
  }

  return false;
}

function isBookFullyDownloadedLocally(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  languageCode: string,
  bookSlug: string,
  chapterRecords: AudioChapterRecord[],
): boolean {
  if (manifest.chapters.length === 0) {
    return false;
  }

  return manifest.chapters.every((chapter) => {
    const existing = chapterRecords.find((record) => record.chapterNumber === chapter.chapter);
    return isChapterMp3Available(languageCode, bookSlug, chapter.chapter, existing);
  });
}

function listMissingAudioChapters(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  languageCode: string,
  bookSlug: string,
  chapterRecords: AudioChapterRecord[],
): number[] {
  return manifest.chapters
    .map((chapter) => chapter.chapter)
    .filter((chapter) => {
      const existing = chapterRecords.find((record) => record.chapterNumber === chapter);
      return !isChapterMp3Available(languageCode, bookSlug, chapter, existing);
    })
    .sort((a, b) => a - b);
}

function buildIncompleteBookAudioError(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  languageCode: string,
  bookSlug: string,
  chapterRecords: AudioChapterRecord[],
  failedDuringDownload: number[] = [],
): Error {
  const missing =
    failedDuringDownload.length > 0
      ? [...new Set(failedDuringDownload)].sort((a, b) => a - b)
      : listMissingAudioChapters(manifest, languageCode, bookSlug, chapterRecords);

  if (missing.length === 1) {
    return new Error(`Could not download audio for chapter ${missing[0]}`);
  }

  if (missing.length > 1) {
    return new Error(
      `Could not download audio for ${missing.length} chapters: ${missing.join(', ')}`,
    );
  }

  return new Error('Could not download all audio chapters');
}

function buildLanguageAudioFailureError(
  failedBooks: { bookName: string; message: string }[],
): Error {
  if (failedBooks.length === 1) {
    const failed = failedBooks[0]!;
    return new Error(`${failed.bookName}: ${failed.message}`);
  }

  const bookNames = failedBooks.map((book) => book.bookName).join(', ');
  return new Error(`Could not download audio for ${failedBooks.length} books: ${bookNames}`);
}

export async function resolveBookAudioChapters(
  languageCode: string,
  bookSlug: string,
): Promise<AudioBookManifest> {
  const data = await graphqlRequest<BookAudioFilesQueryResult>(BOOK_AUDIO_FILES_QUERY, {
    languageCode,
    bookSlug,
  });

  const canonicalSlug = normalizeBookSlug(bookSlug);
  const { bookName, chapters } = parseBookAudioManifest(data, canonicalSlug);

  return {
    bookSlug: canonicalSlug,
    bookName,
    chapters,
  };
}

export async function resolveLanguageAudioBooks(
  languageCode: string,
): Promise<Pick<AudioBookManifest, 'bookSlug' | 'bookName'>[]> {
  const manifests = await getLanguageAudioManifests(languageCode);

  return [...manifests.values()]
    .map(({ bookSlug, bookName }) => ({ bookSlug, bookName }))
    .sort((a, b) => a.bookSlug.localeCompare(b.bookSlug));
}

export async function getBookAudioTotalBytes(
  languageCode: string,
  bookSlug: string,
): Promise<number> {
  const manifest = await resolveBookAudioChapters(languageCode, bookSlug);
  return sumManifestBytes(manifest);
}

export async function getDownloadedBookAudioByteSize(
  languageCode: string,
  bookSlug: string,
): Promise<number | null> {
  const record = await getAudioBookRecord(languageCode, bookSlug);
  return record?.byteSize ?? null;
}

export async function getOfflineAudioChapterNumbers(
  languageCode: string,
  bookSlug: string,
): Promise<number[]> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const numbers = new Set<number>();

  for (const chapter of await listAudioChaptersForBook(languageCode, canonicalSlug)) {
    numbers.add(chapter.chapterNumber);
  }

  const audioDir = getOfflineAudioDirectory(languageCode, canonicalSlug);
  if (audioDir.exists) {
    for (const entry of audioDir.list()) {
      const match = /^ch-(\d+)\.mp3$/i.exec(entry.name);
      if (match) {
        numbers.add(Number.parseInt(match[1], 10));
      }
    }
  }

  return [...numbers].sort((a, b) => a - b);
}

export async function isBookAudioDownloaded(
  languageCode: string,
  bookSlug: string,
): Promise<boolean> {
  const canonicalSlug = normalizeBookSlug(bookSlug);

  try {
    const [manifest, existingChapters] = await Promise.all([
      resolveBookAudioChapters(languageCode, canonicalSlug),
      listAudioChaptersForBook(languageCode, canonicalSlug),
    ]);
    if (manifest.chapters.length === 0) return false;

    const isComplete = isBookFullyDownloadedLocally(
      manifest,
      languageCode,
      canonicalSlug,
      existingChapters,
    );
    if (isComplete) {
      await markAudioBookComplete(languageCode, canonicalSlug);
    }
    return isComplete;
  } catch {
    const record = await getAudioBookRecord(languageCode, canonicalSlug);
    return record?.isComplete === true;
  }
}

export async function getOfflineChapterAudioUri(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const mp3File = getChapterMp3File(languageCode, canonicalSlug, chapter);
  if (mp3File.exists) {
    return mp3File.uri;
  }

  const chapters = await listAudioChaptersForBook(languageCode, canonicalSlug);
  const record = chapters.find((item) => item.chapterNumber === chapter);
  if (!record) return null;

  const file = new File(record.mp3Path);
  return file.exists ? file.uri : null;
}

export async function isChapterAudioDownloaded(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<boolean> {
  return (await getOfflineChapterAudioUri(languageCode, bookSlug, chapter)) != null;
}

export async function getOfflineChapterCueText(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const cueFile = getChapterCueFile(languageCode, canonicalSlug, chapter);
  if (cueFile.exists) {
    return cueFile.text();
  }

  const chapters = await listAudioChaptersForBook(languageCode, canonicalSlug);
  const record = chapters.find((item) => item.chapterNumber === chapter);
  if (!record?.cuePath) return null;

  const file = new File(record.cuePath);
  return file.exists ? file.text() : null;
}

async function writeBinaryFile(
  url: string,
  targetFile: File,
  options?: { signal?: AbortSignal },
): Promise<number> {
  const response = await fetchRenderedContent(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`Failed to download audio (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const tempFile = new File(targetFile.parentDirectory, `${targetFile.name}.tmp`);

  if (tempFile.exists) {
    tempFile.delete();
  }

  tempFile.write(bytes);

  if (targetFile.exists) {
    targetFile.delete();
  }

  tempFile.move(targetFile);
  return bytes.byteLength;
}

async function writeTextFile(
  url: string,
  targetFile: File,
  options?: { signal?: AbortSignal },
): Promise<number> {
  const response = await fetchRenderedContent(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`Failed to download timing file (${response.status})`);
  }

  const text = await response.text();
  const tempFile = new File(targetFile.parentDirectory, `${targetFile.name}.tmp`);

  if (tempFile.exists) {
    tempFile.delete();
  }

  tempFile.write(text);

  if (targetFile.exists) {
    targetFile.delete();
  }

  tempFile.move(targetFile);
  return new TextEncoder().encode(text).length;
}

function removePartialChapterAudioFiles(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): void {
  for (const file of [
    getChapterMp3File(languageCode, bookSlug, chapter),
    getChapterCueFile(languageCode, bookSlug, chapter),
  ]) {
    const tempFile = new File(file.parentDirectory, `${file.name}.tmp`);
    if (tempFile.exists) {
      tempFile.delete();
    }
    if (file.exists) {
      file.delete();
    }
  }
}

async function writeChapterAudioFiles(
  languageCode: string,
  bookSlug: string,
  chapterAudio: ResolvedChapterAudio,
  options?: { signal?: AbortSignal },
): Promise<AudioChapterRecord> {
  if (options?.signal?.aborted) {
    throw abortError();
  }

  const mp3File = getChapterMp3File(languageCode, bookSlug, chapterAudio.chapter);
  const mp3ByteSize = await writeBinaryFile(chapterAudio.mp3Url, mp3File, {
    signal: options?.signal,
  });

  let cuePath: string | null = null;
  let cueByteSize = 0;

  if (chapterAudio.cueUrl) {
    try {
      const cueFile = getChapterCueFile(languageCode, bookSlug, chapterAudio.chapter);
      cueByteSize = await writeTextFile(chapterAudio.cueUrl, cueFile, {
        signal: options?.signal,
      });
      cuePath = cueFile.uri;
    } catch (err) {
      if (isAbortError(err)) {
        throw err;
      }
    }
  }

  return {
    chapterNumber: chapterAudio.chapter,
    mp3Path: mp3File.uri,
    cuePath,
    mp3ByteSize,
    cueByteSize,
  };
}

export async function downloadBookAudio(
  languageCode: string,
  bookSlug: string,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<void> {
  await ensureOfflineRootExists();

  const manifest = await resolveBookAudioChapters(languageCode, bookSlug);
  if (manifest.chapters.length === 0) {
    throw new Error('No audio available for this book');
  }

  if (options?.signal?.aborted) {
    return;
  }

  const canonicalSlug = manifest.bookSlug;
  ensureOfflineAudioDirectory(languageCode, canonicalSlug);

  const existingChapters = await listAudioChaptersForBook(languageCode, canonicalSlug);
  const pendingChapters = manifest.chapters.filter((chapterAudio) => {
    const existing = existingChapters.find((chapter) => chapter.chapterNumber === chapterAudio.chapter);
    return !isChapterMp3Available(languageCode, canonicalSlug, chapterAudio.chapter, existing);
  });

  const persistChapters = async (chapters: AudioChapterRecord[], isComplete: boolean) => {
    await upsertAudioBookWithChapters({
      languageCode,
      bookSlug: canonicalSlug,
      bookName: manifest.bookName,
      byteSize: sumChapterBytes(chapters),
      chapters,
      isComplete,
    });
  };

  if (pendingChapters.length === 0) {
    const merged = mergeChapterRecords(existingChapters, []);
    const isComplete = isBookFullyDownloadedLocally(
      manifest,
      languageCode,
      canonicalSlug,
      merged,
    );
    await persistChapters(merged, isComplete);

    if (!isComplete) {
      throw buildIncompleteBookAudioError(manifest, languageCode, canonicalSlug, merged);
    }

    options?.onProgress?.(1);
    return;
  }

  const totalChapters = pendingChapters.length;
  const progressByChapter = new Array<number>(totalChapters).fill(0);
  const failedChapters: number[] = [];
  const reportProgress = () => {
    const overall =
      progressByChapter.reduce((sum, chapterProgress) => sum + chapterProgress, 0) /
      totalChapters;
    options?.onProgress?.(overall);
  };

  const savedChapters = (
    await runWithConcurrency(
      pendingChapters,
      AUDIO_CHAPTER_DOWNLOAD_CONCURRENCY,
      async (chapterAudio, index) => {
        if (options?.signal?.aborted) {
          return null;
        }

        try {
          const chapterRecord = await writeChapterAudioFiles(
            languageCode,
            canonicalSlug,
            chapterAudio,
            options,
          );
          progressByChapter[index] = 1;
          reportProgress();
          return chapterRecord;
        } catch (err) {
          if (isAbortError(err)) {
            removePartialChapterAudioFiles(languageCode, canonicalSlug, chapterAudio.chapter);
            progressByChapter[index] = 1;
            reportProgress();
            return null;
          }
          failedChapters.push(chapterAudio.chapter);
          progressByChapter[index] = 1;
          reportProgress();
          return null;
        }
      },
    )
  ).filter((chapter): chapter is AudioChapterRecord => chapter !== null);

  if (options?.signal?.aborted) {
    if (savedChapters.length > 0) {
      const merged = mergeChapterRecords(existingChapters, savedChapters);
      await persistChapters(merged, false);
    }
    return;
  }

  const merged = mergeChapterRecords(existingChapters, savedChapters);
  const isComplete = isBookFullyDownloadedLocally(
    manifest,
    languageCode,
    canonicalSlug,
    merged,
  );

  if (merged.length > 0) {
    await persistChapters(merged, isComplete);
  }

  if (!isComplete) {
    throw buildIncompleteBookAudioError(
      manifest,
      languageCode,
      canonicalSlug,
      merged,
      failedChapters,
    );
  }

  options?.onProgress?.(1);
}

export async function deleteBookAudio(languageCode: string, bookSlug: string): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const audioDir = getOfflineAudioDirectory(languageCode, canonicalSlug);
  if (audioDir.exists) {
    audioDir.delete();
  }
  await deleteAudioBookRecord(languageCode, canonicalSlug);
}

export async function getLanguageDownloadedAudioByteSize(languageCode: string): Promise<number> {
  const records = await listDownloadedAudioBooksForLanguage(languageCode);
  return records.reduce((sum, record) => sum + record.byteSize, 0);
}

export async function isLanguageAudioDownloaded(languageCode: string): Promise<boolean> {
  const manifests = await getLanguageAudioManifests(languageCode);
  if (manifests.size === 0) {
    return false;
  }

  for (const [bookSlug, manifest] of manifests) {
    const existingChapters = await listAudioChaptersForBook(languageCode, bookSlug);
    if (!isBookFullyDownloadedLocally(manifest, languageCode, bookSlug, existingChapters)) {
      return false;
    }
  }

  return true;
}

export async function getLanguageAudioTotalBytes(languageCode: string): Promise<number> {
  const [manifests, downloadedRecords] = await Promise.all([
    getLanguageAudioManifests(languageCode),
    listDownloadedAudioBooksForLanguage(languageCode),
  ]);

  const downloadedBytesBySlug = new Map(
    downloadedRecords.map((record) => [normalizeBookSlug(record.bookSlug), record.byteSize]),
  );

  let total = 0;

  for (const [bookSlug, manifest] of manifests) {
    const remoteBytes = sumManifestBytes(manifest);
    const storedBytes = downloadedBytesBySlug.get(bookSlug);

    if (storedBytes != null) {
      const existingChapters = await listAudioChaptersForBook(languageCode, bookSlug);
      if (isBookFullyDownloadedLocally(manifest, languageCode, bookSlug, existingChapters)) {
        total += storedBytes;
        continue;
      }
    }

    total += remoteBytes;
  }

  return total;
}

export async function downloadLanguageAudio(
  languageCode: string,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<void> {
  const books = await resolveLanguageAudioBooks(languageCode);
  if (books.length === 0) {
    throw new Error('No audio available to download for this language');
  }

  const pendingBooks: Pick<AudioBookManifest, 'bookSlug' | 'bookName'>[] = [];
  for (const book of books) {
    if (options?.signal?.aborted) {
      break;
    }
    if (!(await isBookAudioDownloaded(languageCode, book.bookSlug))) {
      pendingBooks.push(book);
    }
  }

  if (pendingBooks.length === 0) {
    options?.onProgress?.(1);
    return;
  }

  const failedBooks: { bookName: string; message: string }[] = [];

  for (let index = 0; index < pendingBooks.length; index++) {
    if (options?.signal?.aborted) {
      break;
    }

    const book = pendingBooks[index]!;
    try {
      await downloadBookAudio(languageCode, book.bookSlug, {
        signal: options?.signal,
        onProgress: (bookProgress) => {
          const overall = (index + bookProgress) / pendingBooks.length;
          options?.onProgress?.(overall);
        },
      });
    } catch (err) {
      if (isAbortError(err)) {
        break;
      }

      failedBooks.push({
        bookName: book.bookName,
        message: err instanceof Error ? err.message : 'Download failed',
      });
    }
  }

  if (options?.signal?.aborted) {
    return;
  }

  if (failedBooks.length > 0) {
    throw buildLanguageAudioFailureError(failedBooks);
  }

  options?.onProgress?.(1);
}

export async function deleteLanguageAudio(languageCode: string): Promise<void> {
  const slugs = await listDownloadedAudioBookSlugs(languageCode);
  for (const bookSlug of slugs) {
    await deleteBookAudio(languageCode, bookSlug);
  }
}

function resolveChapterAudioFromQuery(
  data: ChapterAudioQueryResult,
): { mp3Url?: string; mp3ByteSize?: number; cueUrl?: string; cueByteSize?: number } {
  const entry: {
    mp3Url?: string;
    mp3ByteSize?: number;
    cueUrl?: string;
    cueByteSize?: number;
  } = {};

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      if (!isContentsUrl(rendered.url)) continue;

      const fileType = rendered.file_type?.toLowerCase();
      if (fileType === 'mp3') {
        entry.mp3Url = rendered.url;
        entry.mp3ByteSize = rendered.file_size_bytes ?? 0;
      } else if (fileType === 'cue') {
        entry.cueUrl = rendered.url;
        entry.cueByteSize = rendered.file_size_bytes ?? 0;
      }
    }
  }

  return entry;
}

export async function getChapterAudioTotalBytes(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<number> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const chapters = await listAudioChaptersForBook(languageCode, canonicalSlug);
  const record = chapters.find((item) => item.chapterNumber === chapter);
  if (record) {
    return record.mp3ByteSize + record.cueByteSize;
  }

  try {
    const [mp3Data, cueData] = await Promise.all([
      graphqlRequest<ChapterAudioQueryResult>(CHAPTER_AUDIO_FILE_QUERY, {
        languageCode,
        bookSlug,
        chapter,
        fileType: 'mp3',
      }),
      graphqlRequest<ChapterAudioQueryResult>(CHAPTER_AUDIO_FILE_QUERY, {
        languageCode,
        bookSlug,
        chapter,
        fileType: 'cue',
      }),
    ]);

    const mp3 = resolveChapterAudioFromQuery(mp3Data);
    const cue = resolveChapterAudioFromQuery(cueData);
    return (mp3.mp3ByteSize ?? 0) + (cue.cueByteSize ?? 0);
  } catch {
    return 0;
  }
}

export async function getDownloadedChapterAudioByteSize(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<number | null> {
  const chapters = await listAudioChaptersForBook(languageCode, bookSlug);
  const record = chapters.find((item) => item.chapterNumber === chapter);
  if (!record) return null;
  return record.mp3ByteSize + record.cueByteSize;
}

export async function downloadChapterAudio(
  languageCode: string,
  bookSlug: string,
  chapter: number,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<void> {
  await ensureOfflineRootExists();

  const [mp3Data, cueData] = await Promise.all([
    graphqlRequest<ChapterAudioQueryResult>(CHAPTER_AUDIO_FILE_QUERY, {
      languageCode,
      bookSlug,
      chapter,
      fileType: 'mp3',
    }),
    graphqlRequest<ChapterAudioQueryResult>(CHAPTER_AUDIO_FILE_QUERY, {
      languageCode,
      bookSlug,
      chapter,
      fileType: 'cue',
    }),
  ]);

  const mp3 = resolveChapterAudioFromQuery(mp3Data);
  const cue = resolveChapterAudioFromQuery(cueData);

  if (!mp3.mp3Url) {
    throw new Error('No audio available for this chapter');
  }

  if (options?.signal?.aborted) {
    throw abortError();
  }

  const canonicalSlug = normalizeBookSlug(bookSlug);
  ensureOfflineAudioDirectory(languageCode, canonicalSlug);

  options?.onProgress?.(0.1);

  const mp3File = getChapterMp3File(languageCode, canonicalSlug, chapter);
  const mp3ByteSize = await writeBinaryFile(mp3.mp3Url, mp3File, { signal: options?.signal });

  let cuePath: string | null = null;
  let cueByteSize = 0;

  if (cue.cueUrl) {
    options?.onProgress?.(0.7);
    try {
      const cueFile = getChapterCueFile(languageCode, canonicalSlug, chapter);
      cueByteSize = await writeTextFile(cue.cueUrl, cueFile, { signal: options?.signal });
      cuePath = cueFile.uri;
    } catch (err) {
      if (isAbortError(err)) {
        throw err;
      }
    }
  }

  const manifest = await resolveBookAudioChapters(languageCode, canonicalSlug).catch(() => ({
    bookSlug: canonicalSlug,
    bookName: canonicalSlug,
    chapters: [],
  }));

  await mergeAudioChapter(languageCode, canonicalSlug, manifest.bookName, {
    chapterNumber: chapter,
    mp3Path: mp3File.uri,
    cuePath,
    mp3ByteSize,
    cueByteSize,
  });

  options?.onProgress?.(1);
}

export async function deleteChapterAudio(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const mp3File = getChapterMp3File(languageCode, canonicalSlug, chapter);
  const cueFile = getChapterCueFile(languageCode, canonicalSlug, chapter);

  if (mp3File.exists) mp3File.delete();
  if (cueFile.exists) cueFile.delete();

  await deleteAudioChapterRecord(languageCode, canonicalSlug, chapter);
}
