import type { AudioChapterRecord } from '@/db';
import type { AudioBookManifest } from '@/types/audio';

export function sumManifestBytes(manifest: Pick<AudioBookManifest, 'chapters'>): number {
  return manifest.chapters.reduce(
    (sum, chapter) => sum + chapter.mp3ByteSize + (chapter.cueByteSize ?? 0),
    0,
  );
}

export function sumChapterBytes(chapters: AudioChapterRecord[]): number {
  return chapters.reduce((sum, chapter) => sum + chapter.mp3ByteSize + chapter.cueByteSize, 0);
}

export function mergeChapterRecords(
  existing: AudioChapterRecord[],
  saved: AudioChapterRecord[],
): AudioChapterRecord[] {
  const mergedByNumber = new Map(existing.map((chapter) => [chapter.chapterNumber, chapter]));
  for (const chapter of saved) {
    mergedByNumber.set(chapter.chapterNumber, chapter);
  }
  return [...mergedByNumber.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export function isManifestChapterSetComplete(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  downloadedNumbers: number[],
): boolean {
  if (manifest.chapters.length === 0 || downloadedNumbers.length === 0) {
    return false;
  }

  const downloadedSet = new Set(downloadedNumbers);
  return manifest.chapters.every((chapter) => downloadedSet.has(chapter.chapter));
}
