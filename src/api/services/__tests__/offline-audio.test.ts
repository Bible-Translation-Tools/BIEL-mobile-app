import { describe, expect, it } from 'vitest';

import type { AudioChapterRecord } from '@/db';
import type { AudioBookManifest } from '@/types/audio';

import {
  isManifestChapterSetComplete,
  mergeChapterRecords,
  sumChapterBytes,
} from '../offline-audio/manifest-helpers';

describe('book audio download helpers', () => {
  const manifest: Pick<AudioBookManifest, 'chapters'> = {
    chapters: [
      { chapter: 1, mp3Url: 'a.mp3', mp3ByteSize: 1000 },
      { chapter: 2, mp3Url: 'b.mp3', mp3ByteSize: 2000 },
      { chapter: 3, mp3Url: 'c.mp3', mp3ByteSize: 3000 },
    ],
  };

  it('treats a single downloaded chapter as incomplete', () => {
    expect(isManifestChapterSetComplete(manifest, [1])).toBe(false);
  });

  it('treats all manifest chapters as complete', () => {
    expect(isManifestChapterSetComplete(manifest, [1, 2, 3])).toBe(true);
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
    expect(
      isManifestChapterSetComplete(
        manifest,
        merged.map((chapter) => chapter.chapterNumber),
      ),
    ).toBe(false);
  });
});
