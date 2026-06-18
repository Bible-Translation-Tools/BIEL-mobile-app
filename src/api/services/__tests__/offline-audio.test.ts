import { describe, expect, it } from 'vitest';

import type { AudioChapterRecord } from '@/db';
import type { AudioBookManifest } from '@/types/audio';

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

function isManifestFullyDownloaded(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  chapterNumbers: number[],
): boolean {
  if (manifest.chapters.length === 0 || chapterNumbers.length === 0) {
    return false;
  }

  const downloadedSet = new Set(chapterNumbers);
  return manifest.chapters.every((chapter) => downloadedSet.has(chapter.chapter));
}

describe('book audio download helpers', () => {
  const manifest: Pick<AudioBookManifest, 'chapters'> = {
    chapters: [
      { chapter: 1, mp3Url: 'a.mp3', mp3ByteSize: 1000 },
      { chapter: 2, mp3Url: 'b.mp3', mp3ByteSize: 2000 },
      { chapter: 3, mp3Url: 'c.mp3', mp3ByteSize: 3000 },
    ],
  };

  it('treats a single downloaded chapter as incomplete', () => {
    expect(isManifestFullyDownloaded(manifest, [1])).toBe(false);
  });

  it('treats all manifest chapters as complete', () => {
    expect(isManifestFullyDownloaded(manifest, [1, 2, 3])).toBe(true);
  });

  it('merges existing and newly saved chapters without dropping prior downloads', () => {
    const existing: AudioChapterRecord[] = [
      {
        chapterNumber: 1,
        mp3Path: '/offline/ch-1.mp3',
        cuePath: null,
        mp3ByteSize: 1000,
        cueByteSize: 0,
      },
    ];
    const saved: AudioChapterRecord[] = [
      {
        chapterNumber: 2,
        mp3Path: '/offline/ch-2.mp3',
        cuePath: null,
        mp3ByteSize: 2000,
        cueByteSize: 0,
      },
    ];

    const merged = mergeChapterRecords(existing, saved);

    expect(merged.map((chapter) => chapter.chapterNumber)).toEqual([1, 2]);
    expect(sumChapterBytes(merged)).toBe(3000);
    expect(isManifestFullyDownloaded(manifest, merged.map((chapter) => chapter.chapterNumber))).toBe(
      false,
    );
  });
});
