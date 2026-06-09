import { File } from 'expo-file-system';

import { graphqlRequest } from '@/api/graphql/client';
import {
  BOOK_AUDIO_FILES_QUERY,
  CHAPTER_AUDIO_FILE_QUERY,
  LANGUAGE_AUDIO_FILES_QUERY,
} from '@/api/graphql/queries';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import { runWithConcurrency } from '@/utils/run-with-concurrency';

import {
  ensureOfflineAudioDirectory,
  ensureOfflineRootExists,
  getChapterCueFile,
  getChapterMp3File,
  getOfflineAudioDirectory,
  normalizeBookSlug,
} from '@/constants/offline-storage';
import {
  deleteAudioBook as deleteAudioBookRecord,
  deleteAudioChapter as deleteAudioChapterRecord,
  getAudioBookRecord,
  listAudioChaptersForBook,
  listDownloadedAudioBookSlugs,
  listDownloadedAudioBooksForLanguage,
  mergeAudioChapter,
  upsertAudioBookWithChapters,
} from '@/db';
import type { ChapterAudioQueryResult } from '@/types/audio';
import type { AudioChapterRecord } from '@/db';
import type {
  AudioBookManifest,
  BookAudioFilesQueryResult,
  ResolvedChapterAudio,
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

function isBookFullyDownloadedLocally(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  languageCode: string,
  bookSlug: string,
  downloadedNumbers: number[],
): boolean {
  if (manifest.chapters.length === 0 || downloadedNumbers.length === 0) {
    return false;
  }

  const downloadedSet = new Set(downloadedNumbers);
  for (const chapter of manifest.chapters) {
    if (!downloadedSet.has(chapter.chapter)) {
      return false;
    }

    const mp3File = getChapterMp3File(languageCode, bookSlug, chapter.chapter);
    if (!mp3File.exists) {
      return false;
    }
  }

  return true;
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
  const downloadedNumbers = await getOfflineAudioChapterNumbers(languageCode, canonicalSlug);
  if (downloadedNumbers.length === 0) return false;

  for (const chapterNumber of downloadedNumbers) {
    const mp3File = getChapterMp3File(languageCode, canonicalSlug, chapterNumber);
    if (!mp3File.exists) return false;
  }

  try {
    const manifest = await resolveBookAudioChapters(languageCode, canonicalSlug);
    if (manifest.chapters.length === 0) return false;

    const downloadedSet = new Set(downloadedNumbers);
    return manifest.chapters.every((chapter) => downloadedSet.has(chapter.chapter));
  } catch {
    // Offline: without the remote manifest we cannot confirm a full-book download.
    return false;
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

function removeAudioDirectory(languageCode: string, bookSlug: string): void {
  const audioDir = getOfflineAudioDirectory(languageCode, bookSlug);
  if (audioDir.exists) {
    audioDir.delete();
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
  const mp3Promise = writeBinaryFile(chapterAudio.mp3Url, mp3File, {
    signal: options?.signal,
  });

  const cuePromise = chapterAudio.cueUrl
    ? (async () => {
        const cueFile = getChapterCueFile(languageCode, bookSlug, chapterAudio.chapter);
        const cueByteSize = await writeTextFile(chapterAudio.cueUrl!, cueFile, {
          signal: options?.signal,
        });
        return { cuePath: cueFile.uri, cueByteSize };
      })()
    : Promise.resolve({ cuePath: null as string | null, cueByteSize: 0 });

  const [mp3ByteSize, cueResult] = await Promise.all([mp3Promise, cuePromise]);

  return {
    chapterNumber: chapterAudio.chapter,
    mp3Path: mp3File.uri,
    cuePath: cueResult.cuePath,
    mp3ByteSize,
    cueByteSize: cueResult.cueByteSize,
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
    throw abortError();
  }

  const canonicalSlug = manifest.bookSlug;
  ensureOfflineAudioDirectory(languageCode, canonicalSlug);

  const totalChapters = manifest.chapters.length;
  const progressByChapter = new Array<number>(totalChapters).fill(0);
  const reportProgress = () => {
    const overall =
      progressByChapter.reduce((sum, chapterProgress) => sum + chapterProgress, 0) /
      totalChapters;
    options?.onProgress?.(overall);
  };

  let savedChapters: AudioChapterRecord[];

  try {
    if (options?.signal?.aborted) {
      throw abortError();
    }

    savedChapters = await runWithConcurrency(
      manifest.chapters,
      AUDIO_CHAPTER_DOWNLOAD_CONCURRENCY,
      async (chapterAudio, index) => {
        const chapterRecord = await writeChapterAudioFiles(
          languageCode,
          canonicalSlug,
          chapterAudio,
          options,
        );
        progressByChapter[index] = 1;
        reportProgress();
        return chapterRecord;
      },
    );
  } catch (err) {
    removeAudioDirectory(languageCode, canonicalSlug);
    throw err;
  }

  const totalBytes = savedChapters.reduce(
    (sum, chapter) => sum + chapter.mp3ByteSize + chapter.cueByteSize,
    0,
  );

  await upsertAudioBookWithChapters({
    languageCode,
    bookSlug: canonicalSlug,
    bookName: manifest.bookName,
    byteSize: totalBytes,
    chapters: savedChapters,
  });

  options?.onProgress?.(1);
}

export async function deleteBookAudio(languageCode: string, bookSlug: string): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  removeAudioDirectory(languageCode, canonicalSlug);
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
    const downloadedNumbers = await getOfflineAudioChapterNumbers(languageCode, bookSlug);
    if (!isBookFullyDownloadedLocally(manifest, languageCode, bookSlug, downloadedNumbers)) {
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
      const downloadedNumbers = await getOfflineAudioChapterNumbers(languageCode, bookSlug);
      if (isBookFullyDownloadedLocally(manifest, languageCode, bookSlug, downloadedNumbers)) {
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
      throw abortError();
    }
    if (!(await isBookAudioDownloaded(languageCode, book.bookSlug))) {
      pendingBooks.push(book);
    }
  }

  if (pendingBooks.length === 0) {
    options?.onProgress?.(1);
    return;
  }

  for (let index = 0; index < pendingBooks.length; index++) {
    if (options?.signal?.aborted) {
      throw abortError();
    }

    const book = pendingBooks[index]!;
    await downloadBookAudio(languageCode, book.bookSlug, {
      signal: options?.signal,
      onProgress: (bookProgress) => {
        const overall = (index + bookProgress) / pendingBooks.length;
        options?.onProgress?.(overall);
      },
    });
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
    const cueFile = getChapterCueFile(languageCode, canonicalSlug, chapter);
    cueByteSize = await writeTextFile(cue.cueUrl, cueFile, { signal: options?.signal });
    cuePath = cueFile.uri;
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
