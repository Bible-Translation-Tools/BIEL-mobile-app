import { File } from 'expo-file-system';

import { graphqlRequest } from '@/api/graphql/client';
import {
  AUDIO_BOOKS_FOR_LANGUAGE_QUERY,
  BOOK_AUDIO_FILES_QUERY,
  CHAPTER_AUDIO_FILE_QUERY,
} from '@/api/graphql/queries';
import { fetchRenderedContent } from '@/api/services/content-fetch';
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
  AudioBooksForLanguageQueryResult,
  BookAudioFilesQueryResult,
  ResolvedChapterAudio,
} from '@/types/audio';

export type DownloadProgressCallback = (progress: number) => void;

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
  const data = await graphqlRequest<AudioBooksForLanguageQueryResult>(
    AUDIO_BOOKS_FOR_LANGUAGE_QUERY,
    { languageCode },
  );

  const books = new Map<string, string>();

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      const meta = rendered.scriptural_rendering_metadata;
      if (!meta?.book_slug) continue;

      const slug = normalizeBookSlug(meta.book_slug);
      books.set(slug, meta.book_name || slug);
    }
  }

  return [...books.entries()]
    .map(([bookSlug, bookName]) => ({ bookSlug, bookName }))
    .sort((a, b) => a.bookSlug.localeCompare(b.bookSlug));
}

export async function getBookAudioTotalBytes(
  languageCode: string,
  bookSlug: string,
): Promise<number> {
  const manifest = await resolveBookAudioChapters(languageCode, bookSlug);
  return manifest.chapters.reduce(
    (sum, chapter) => sum + chapter.mp3ByteSize + (chapter.cueByteSize ?? 0),
    0,
  );
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
  const record = await getAudioBookRecord(languageCode, bookSlug);
  if (!record) return false;

  const chapters = await listAudioChaptersForBook(languageCode, bookSlug);
  if (chapters.length === 0) return false;

  for (const chapter of chapters) {
    const mp3File = new File(chapter.mp3Path);
    if (!mp3File.exists) return false;
  }

  return true;
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

  const savedChapters: AudioChapterRecord[] = [];
  let totalBytes = 0;
  const totalChapters = manifest.chapters.length;

  try {
    for (let index = 0; index < manifest.chapters.length; index++) {
      if (options?.signal?.aborted) {
        throw abortError();
      }

      const chapterAudio = manifest.chapters[index]!;
      const mp3File = getChapterMp3File(languageCode, canonicalSlug, chapterAudio.chapter);
      const mp3ByteSize = await writeBinaryFile(chapterAudio.mp3Url, mp3File, {
        signal: options?.signal,
      });

      let cuePath: string | null = null;
      let cueByteSize = 0;

      if (chapterAudio.cueUrl) {
        const cueFile = getChapterCueFile(languageCode, canonicalSlug, chapterAudio.chapter);
        cueByteSize = await writeTextFile(chapterAudio.cueUrl, cueFile, {
          signal: options?.signal,
        });
        cuePath = cueFile.uri;
      }

      totalBytes += mp3ByteSize + cueByteSize;
      savedChapters.push({
        chapterNumber: chapterAudio.chapter,
        mp3Path: mp3File.uri,
        cuePath,
        mp3ByteSize,
        cueByteSize,
      });

      options?.onProgress?.((index + 1) / totalChapters);
    }
  } catch (err) {
    removeAudioDirectory(languageCode, canonicalSlug);
    throw err;
  }

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

export async function getLanguageAudioTotalBytes(languageCode: string): Promise<number> {
  const books = await resolveLanguageAudioBooks(languageCode);
  let total = 0;

  for (const book of books) {
    const downloadedBytes = await getDownloadedBookAudioByteSize(languageCode, book.bookSlug);
    if (downloadedBytes != null) {
      total += downloadedBytes;
      continue;
    }
    total += await getBookAudioTotalBytes(languageCode, book.bookSlug);
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
