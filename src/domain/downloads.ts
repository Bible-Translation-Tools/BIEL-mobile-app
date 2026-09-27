import type { DownloadOutcome, DownloadStatus } from '@/types/download';
import type { GlobalDownloadSync } from '@/types/download-progress';

export const DOWNLOAD_COMPLETED: DownloadOutcome = { status: 'completed' };
export const DOWNLOAD_CANCELLED: DownloadOutcome = { status: 'cancelled' };

export function resolveDownloadStatus(
  isDownloading: boolean,
  isDownloaded: boolean,
  isChecking = false,
  isPartial = false,
): DownloadStatus {
  if (isChecking) return 'checking';
  if (isDownloading) return 'downloading';
  if (isDownloaded) return 'downloaded';
  if (isPartial) return 'partial';
  return 'pending';
}

export function buildDownloadTaskId(sync: GlobalDownloadSync): string {
  if ('bookSlug' in sync) {
    return `${sync.languageCode}:${sync.bookSlug.toUpperCase()}:${sync.kind}`;
  }
  return `${sync.languageCode}:__language__:${sync.kind}`;
}

/**
 * Whether every content type that exists for an item is on the device.
 * A content type that doesn't exist (`hasText` / `hasAudio` false) never blocks completion.
 */
export function isFullyDownloaded(params: {
  hasText: boolean;
  textDownloaded: boolean;
  hasAudio: boolean;
  audioDownloaded: boolean;
}): boolean {
  return (
    (!params.hasText || params.textDownloaded) && (!params.hasAudio || params.audioDownloaded)
  );
}

/** Whether every chapter in the manifest is available locally. An empty manifest is never complete. */
export function isManifestFullyDownloaded(
  manifestChapters: readonly number[],
  availableChapters: ReadonlySet<number>,
): boolean {
  return (
    manifestChapters.length > 0 &&
    manifestChapters.every((chapter) => availableChapters.has(chapter))
  );
}

export function sumChapterBytes(
  chapters: readonly { mp3ByteSize: number; cueByteSize: number }[],
): number {
  return chapters.reduce((sum, chapter) => sum + chapter.mp3ByteSize + chapter.cueByteSize, 0);
}

export function sumManifestBytes(
  chapters: readonly { mp3ByteSize: number; cueByteSize?: number }[],
): number {
  return chapters.reduce((sum, chapter) => sum + chapter.mp3ByteSize + (chapter.cueByteSize ?? 0), 0);
}

/** Merges chapter records by number, `saved` winning over `existing`, sorted by chapter. */
export function mergeChapterRecords<T extends { chapterNumber: number }>(
  existing: readonly T[],
  saved: readonly T[],
): T[] {
  const mergedByNumber = new Map(existing.map((chapter) => [chapter.chapterNumber, chapter]));
  for (const chapter of saved) {
    mergedByNumber.set(chapter.chapterNumber, chapter);
  }
  return [...mergedByNumber.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
}
