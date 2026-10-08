import { File } from 'expo-file-system';

import { catalogApi } from '@/api/catalog';
import { fetchRenderedContent } from '@/api/content-fetch';
import {
  deleteFileAndTemp,
  ensureOfflineAudioDirectory,
  ensureOfflineRootExists,
  getChapterCueFile,
  getChapterMp3File,
  getOfflineAudioDirectory,
  writeFileAtomically,
} from '@/api/offline-storage';
import type { AudioChapterRecord } from '@/db';
import {
  deleteAudioBook as deleteAudioBookRecord,
  getAudioBookRecord,
  listAudioChaptersForBook,
  listDownloadedAudioBooksForLanguage,
  listDownloadedAudioBookSlugs,
  markAudioBookComplete,
  upsertAudioBookWithChapters,
} from '@/db';
import {
  parseBookAudioManifest,
  parseLanguageAudioManifests,
  pickChapterAudioFiles,
} from '@/domain/audio-manifest';
import { normalizeBookSlug } from '@/domain/book-slug';
import {
  averageProgress,
  DOWNLOAD_CANCELLED,
  DOWNLOAD_COMPLETED,
  isManifestFullyDownloaded,
  listMissingChapters,
  mergeChapterRecords,
  sumChapterBytes,
  sumManifestBytes,
} from '@/domain/downloads';
import type { AudioBookManifest, ResolvedChapterAudio } from '@/types/audio';
import type { AudioFile } from '@/types/catalog';
import type { DownloadOutcome } from '@/types/download';
import { createAbortError, isAbortError, runWithConcurrency } from '@/utils/run-with-concurrency';

import { missingAudioChaptersError } from './failures';

const AUDIO_CHAPTER_DOWNLOAD_CONCURRENCY = 3;
export type DownloadProgressCallback = (progress: number) => void;

/** Dedupes overlapping language audio catalog requests per language code. */
const languageAudioFilesInflight = new Map<string, Promise<AudioFile[]>>();

async function fetchLanguageAudioFiles(languageCode: string): Promise<AudioFile[]> {
  const key = languageCode.toUpperCase();
  const inflight = languageAudioFilesInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const request = catalogApi.getLanguageAudioFiles(languageCode).finally(() => {
    languageAudioFilesInflight.delete(key);
  });
  languageAudioFilesInflight.set(key, request);
  return request;
}

async function fetchLanguageAudioManifests(
  languageCode: string,
): Promise<Map<string, AudioBookManifest>> {
  return parseLanguageAudioManifests(await fetchLanguageAudioFiles(languageCode));
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

function manifestChapterNumbers(manifest: Pick<AudioBookManifest, 'chapters'>): number[] {
  return manifest.chapters.map((chapter) => chapter.chapter);
}

/** Manifest chapters whose mp3 is on disk, at the standard path or a recorded one. */
function listAvailableAudioChapters(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  languageCode: string,
  bookSlug: string,
  chapterRecords: AudioChapterRecord[],
): Set<number> {
  return new Set(
    manifestChapterNumbers(manifest).filter((chapter) => {
      const existing = chapterRecords.find((record) => record.chapterNumber === chapter);
      return isChapterMp3Available(languageCode, bookSlug, chapter, existing);
    }),
  );
}

function isBookFullyDownloadedLocally(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  languageCode: string,
  bookSlug: string,
  chapterRecords: AudioChapterRecord[],
): boolean {
  return isManifestFullyDownloaded(
    manifestChapterNumbers(manifest),
    listAvailableAudioChapters(manifest, languageCode, bookSlug, chapterRecords),
  );
}

function listMissingAudioChapters(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  languageCode: string,
  bookSlug: string,
  chapterRecords: AudioChapterRecord[],
): number[] {
  return listMissingChapters(
    manifestChapterNumbers(manifest),
    listAvailableAudioChapters(manifest, languageCode, bookSlug, chapterRecords),
  );
}

/** Adds or replaces one chapter in the book's record; the book stays incomplete until synced. */
async function saveChapterAudioRecord(
  languageCode: string,
  bookSlug: string,
  bookName: string,
  chapter: AudioChapterRecord,
): Promise<void> {
  const existing = await listAudioChaptersForBook(languageCode, bookSlug);
  const chapters = mergeChapterRecords(existing, [chapter]);
  await upsertAudioBookWithChapters({
    languageCode,
    bookSlug,
    bookName,
    byteSize: sumChapterBytes(chapters),
    chapters,
    isComplete: false,
  });
}

/** Removes one chapter from the book's record, deleting the book when none remain. */
async function removeChapterAudioRecord(
  languageCode: string,
  bookSlug: string,
  chapterNumber: number,
): Promise<void> {
  const record = await getAudioBookRecord(languageCode, bookSlug);
  if (!record) return;

  const remaining = (await listAudioChaptersForBook(languageCode, bookSlug)).filter(
    (item) => item.chapterNumber !== chapterNumber,
  );

  if (remaining.length === 0) {
    await deleteAudioBookRecord(languageCode, bookSlug);
    return;
  }

  await upsertAudioBookWithChapters({
    languageCode,
    bookSlug,
    bookName: record.bookName,
    byteSize: sumChapterBytes(remaining),
    chapters: remaining,
    isComplete: false,
  });
}

export async function fetchBookAudioManifest(
  languageCode: string,
  bookSlug: string,
): Promise<AudioBookManifest> {
  const files = await catalogApi.getBookAudioFiles(languageCode, bookSlug);

  const canonicalSlug = normalizeBookSlug(bookSlug);
  const { bookName, chapters } = parseBookAudioManifest(files, canonicalSlug);

  return {
    bookSlug: canonicalSlug,
    bookName,
    chapters,
  };
}

export async function fetchLanguageAudioBooks(
  languageCode: string,
): Promise<Pick<AudioBookManifest, 'bookSlug' | 'bookName'>[]> {
  const manifests = await fetchLanguageAudioManifests(languageCode);

  return [...manifests.values()]
    .map(({ bookSlug, bookName }) => ({ bookSlug, bookName }))
    .sort((a, b) => a.bookSlug.localeCompare(b.bookSlug));
}

export async function fetchBookAudioTotalBytes(
  languageCode: string,
  bookSlug: string,
): Promise<number> {
  const manifest = await fetchBookAudioManifest(languageCode, bookSlug);
  return sumManifestBytes(manifest.chapters);
}

export async function loadDownloadedBookAudioByteSize(
  languageCode: string,
  bookSlug: string,
): Promise<number | null> {
  const record = await getAudioBookRecord(languageCode, bookSlug);
  return record?.byteSize ?? null;
}

export async function loadOfflineAudioChapterNumbers(
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

/** Local-only: reads the database and disk, never the network. */
export async function isBookAudioDownloaded(
  languageCode: string,
  bookSlug: string,
): Promise<boolean> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const record = await getAudioBookRecord(languageCode, canonicalSlug);
  if (!record?.isComplete) return false;

  const chapters = await listAudioChaptersForBook(languageCode, canonicalSlug);
  return (
    chapters.length > 0 &&
    chapters.every((chapter) =>
      isChapterMp3Available(languageCode, canonicalSlug, chapter.chapterNumber, chapter),
    )
  );
}

/** Compares local files with the server manifest and marks the book complete when they match. */
async function syncBookAudioCompletion(
  languageCode: string,
  bookSlug: string,
  manifest?: Pick<AudioBookManifest, 'chapters'>,
): Promise<boolean> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const [resolvedManifest, existingChapters] = await Promise.all([
    manifest ?? fetchBookAudioManifest(languageCode, canonicalSlug),
    listAudioChaptersForBook(languageCode, canonicalSlug),
  ]);

  const isComplete = isBookFullyDownloadedLocally(
    resolvedManifest,
    languageCode,
    canonicalSlug,
    existingChapters,
  );
  if (isComplete) {
    await markAudioBookComplete(languageCode, canonicalSlug);
  }
  return isComplete;
}

export async function loadOfflineChapterAudioUri(
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
  return (await loadOfflineChapterAudioUri(languageCode, bookSlug, chapter)) != null;
}

export async function loadOfflineChapterCueText(
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

async function downloadBinaryFile(
  url: string,
  targetFile: File,
  options?: { signal?: AbortSignal },
): Promise<number> {
  const response = await fetchRenderedContent(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`Failed to download audio (${response.status})`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileAtomically(targetFile, bytes);
  return bytes.byteLength;
}

async function downloadTextFile(
  url: string,
  targetFile: File,
  options?: { signal?: AbortSignal },
): Promise<number> {
  const response = await fetchRenderedContent(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`Failed to download timing file (${response.status})`);
  }

  const text = await response.text();
  writeFileAtomically(targetFile, text);
  return new TextEncoder().encode(text).length;
}

/** Downloads the cue file if there is one. Cue failures are ignored; only aborts propagate. */
async function downloadOptionalCueFile(
  cueUrl: string | undefined,
  cueFile: File,
  options?: { signal?: AbortSignal },
): Promise<{ cuePath: string | null; cueByteSize: number }> {
  if (!cueUrl) return { cuePath: null, cueByteSize: 0 };

  try {
    const cueByteSize = await downloadTextFile(cueUrl, cueFile, options);
    return { cuePath: cueFile.uri, cueByteSize };
  } catch (err) {
    if (isAbortError(err)) {
      throw err;
    }
    return { cuePath: null, cueByteSize: 0 };
  }
}

function removePartialChapterAudioFiles(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): void {
  deleteFileAndTemp(getChapterMp3File(languageCode, bookSlug, chapter));
  deleteFileAndTemp(getChapterCueFile(languageCode, bookSlug, chapter));
}

async function writeChapterAudioFiles(
  languageCode: string,
  bookSlug: string,
  chapterAudio: ResolvedChapterAudio,
  options?: { signal?: AbortSignal },
): Promise<AudioChapterRecord> {
  if (options?.signal?.aborted) {
    throw createAbortError();
  }

  const mp3File = getChapterMp3File(languageCode, bookSlug, chapterAudio.chapter);
  const mp3ByteSize = await downloadBinaryFile(chapterAudio.mp3Url, mp3File, {
    signal: options?.signal,
  });

  const { cuePath, cueByteSize } = await downloadOptionalCueFile(
    chapterAudio.cueUrl,
    getChapterCueFile(languageCode, bookSlug, chapterAudio.chapter),
    { signal: options?.signal },
  );

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
): Promise<DownloadOutcome> {
  await ensureOfflineRootExists();

  const manifest = await fetchBookAudioManifest(languageCode, bookSlug);
  if (manifest.chapters.length === 0) {
    throw new Error('No audio available for this book');
  }

  if (options?.signal?.aborted) {
    return DOWNLOAD_CANCELLED;
  }

  const canonicalSlug = manifest.bookSlug;
  ensureOfflineAudioDirectory(languageCode, canonicalSlug);

  const existingChapters = await listAudioChaptersForBook(languageCode, canonicalSlug);
  const pendingChapters = manifest.chapters.filter((chapterAudio) => {
    const existing = existingChapters.find(
      (chapter) => chapter.chapterNumber === chapterAudio.chapter,
    );
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
    const isComplete = isBookFullyDownloadedLocally(manifest, languageCode, canonicalSlug, merged);
    await persistChapters(merged, isComplete);

    if (!isComplete) {
      throw missingAudioChaptersError(
        listMissingAudioChapters(manifest, languageCode, canonicalSlug, merged),
      );
    }

    options?.onProgress?.(1);
    return DOWNLOAD_COMPLETED;
  }

  const progressByChapter = new Array<number>(pendingChapters.length).fill(0);
  const failedChapters: number[] = [];
  const markChapterDone = (index: number) => {
    progressByChapter[index] = 1;
    options?.onProgress?.(averageProgress(progressByChapter));
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
          markChapterDone(index);
          return chapterRecord;
        } catch (err) {
          if (isAbortError(err)) {
            removePartialChapterAudioFiles(languageCode, canonicalSlug, chapterAudio.chapter);
          } else {
            failedChapters.push(chapterAudio.chapter);
          }
          markChapterDone(index);
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
    return DOWNLOAD_CANCELLED;
  }

  const merged = mergeChapterRecords(existingChapters, savedChapters);
  const isComplete = isBookFullyDownloadedLocally(manifest, languageCode, canonicalSlug, merged);

  if (merged.length > 0) {
    await persistChapters(merged, isComplete);
  }

  if (!isComplete) {
    throw missingAudioChaptersError(
      failedChapters.length > 0
        ? failedChapters
        : listMissingAudioChapters(manifest, languageCode, canonicalSlug, merged),
    );
  }

  options?.onProgress?.(1);
  return DOWNLOAD_COMPLETED;
}

export async function deleteBookAudio(languageCode: string, bookSlug: string): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const audioDir = getOfflineAudioDirectory(languageCode, canonicalSlug);
  if (audioDir.exists) {
    audioDir.delete();
  }
  await deleteAudioBookRecord(languageCode, canonicalSlug);
}

export async function loadLanguageDownloadedAudioByteSize(languageCode: string): Promise<number> {
  const records = await listDownloadedAudioBooksForLanguage(languageCode);
  return records.reduce((sum, record) => sum + record.byteSize, 0);
}

export async function isLanguageAudioDownloaded(languageCode: string): Promise<boolean> {
  const manifests = await fetchLanguageAudioManifests(languageCode);
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
    fetchLanguageAudioManifests(languageCode),
    listDownloadedAudioBooksForLanguage(languageCode),
  ]);

  const downloadedBytesBySlug = new Map(
    downloadedRecords.map((record) => [normalizeBookSlug(record.bookSlug), record.byteSize]),
  );

  let total = 0;

  for (const [bookSlug, manifest] of manifests) {
    const remoteBytes = sumManifestBytes(manifest.chapters);
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
): Promise<DownloadOutcome> {
  const books = await fetchLanguageAudioBooks(languageCode);
  if (books.length === 0) {
    throw new Error('No audio available to download for this language');
  }

  const pendingBooks: Pick<AudioBookManifest, 'bookSlug' | 'bookName'>[] = [];
  for (const book of books) {
    if (options?.signal?.aborted) {
      return DOWNLOAD_CANCELLED;
    }
    if (!(await isBookAudioDownloaded(languageCode, book.bookSlug))) {
      pendingBooks.push(book);
    }
  }

  if (pendingBooks.length === 0) {
    options?.onProgress?.(1);
    return DOWNLOAD_COMPLETED;
  }

  const failedBookSlugs: string[] = [];

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

      console.warn('[offline-audio] book download failed', {
        languageCode,
        bookSlug: book.bookSlug,
        err,
      });
      failedBookSlugs.push(book.bookSlug);
    }
  }

  if (options?.signal?.aborted) {
    return DOWNLOAD_CANCELLED;
  }

  if (failedBookSlugs.length > 0) {
    return { status: 'partial', failedBookSlugs };
  }

  options?.onProgress?.(1);
  return DOWNLOAD_COMPLETED;
}

export async function deleteLanguageAudio(languageCode: string): Promise<void> {
  const slugs = await listDownloadedAudioBookSlugs(languageCode);
  for (const bookSlug of slugs) {
    await deleteBookAudio(languageCode, bookSlug);
  }
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
      catalogApi.getChapterAudioFiles(languageCode, bookSlug, chapter, 'mp3'),
      catalogApi.getChapterAudioFiles(languageCode, bookSlug, chapter, 'cue'),
    ]);

    const mp3 = pickChapterAudioFiles(mp3Data);
    const cue = pickChapterAudioFiles(cueData);
    return (mp3.mp3ByteSize ?? 0) + (cue.cueByteSize ?? 0);
  } catch {
    return 0;
  }
}

export async function loadDownloadedChapterAudioByteSize(
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
): Promise<DownloadOutcome> {
  await ensureOfflineRootExists();

  const [mp3Data, cueData] = await Promise.all([
    catalogApi.getChapterAudioFiles(languageCode, bookSlug, chapter, 'mp3'),
    catalogApi.getChapterAudioFiles(languageCode, bookSlug, chapter, 'cue'),
  ]);

  const mp3 = pickChapterAudioFiles(mp3Data);
  const cue = pickChapterAudioFiles(cueData);

  if (!mp3.mp3Url) {
    throw new Error('No audio available for this chapter');
  }

  if (options?.signal?.aborted) {
    throw createAbortError();
  }

  const canonicalSlug = normalizeBookSlug(bookSlug);
  ensureOfflineAudioDirectory(languageCode, canonicalSlug);

  options?.onProgress?.(0.1);

  const mp3File = getChapterMp3File(languageCode, canonicalSlug, chapter);
  const mp3ByteSize = await downloadBinaryFile(mp3.mp3Url, mp3File, { signal: options?.signal });

  if (cue.cueUrl) {
    options?.onProgress?.(0.7);
  }
  const { cuePath, cueByteSize } = await downloadOptionalCueFile(
    cue.cueUrl,
    getChapterCueFile(languageCode, canonicalSlug, chapter),
    { signal: options?.signal },
  );

  const manifest = await fetchBookAudioManifest(languageCode, canonicalSlug).catch(() => ({
    bookSlug: canonicalSlug,
    bookName: canonicalSlug,
    chapters: [],
  }));

  await saveChapterAudioRecord(languageCode, canonicalSlug, manifest.bookName, {
    chapterNumber: chapter,
    mp3Path: mp3File.uri,
    cuePath,
    mp3ByteSize,
    cueByteSize,
  });

  if (manifest.chapters.length > 0) {
    await syncBookAudioCompletion(languageCode, canonicalSlug, manifest);
  }

  options?.onProgress?.(1);
  return DOWNLOAD_COMPLETED;
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

  await removeChapterAudioRecord(languageCode, canonicalSlug, chapter);
}
