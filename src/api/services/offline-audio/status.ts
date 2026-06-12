import { File } from 'expo-file-system';

import {
  getChapterCueFile,
  getChapterMp3File,
  getOfflineAudioDirectory,
  normalizeBookSlug,
} from '@/constants/offline-storage';
import {
  getAudioBookRecord,
  listAudioChaptersForBook,
  listDownloadedAudioBooksForLanguage,
  markAudioBookComplete,
} from '@/db';

import {
  getLanguageAudioManifests,
  isBookFullyDownloadedLocally,
  sumManifestBytes,
} from './manifest';
import { resolveBookAudioChapters } from './resolve';

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

    const isComplete = isBookFullyDownloadedLocally(
      manifest,
      languageCode,
      canonicalSlug,
      downloadedNumbers,
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
