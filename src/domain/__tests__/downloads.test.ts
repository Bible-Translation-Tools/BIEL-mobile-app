import { describe, expect, it } from 'vitest';

import {
  isFullyDownloaded,
  isManifestFullyDownloaded,
  mergeChapterRecords,
  sumChapterBytes,
  sumManifestBytes,
} from '@/domain/downloads';

describe('isFullyDownloaded', () => {
  it('requires every content type that exists', () => {
    expect(
      isFullyDownloaded({ hasText: true, textDownloaded: true, hasAudio: true, audioDownloaded: false }),
    ).toBe(false);
    expect(
      isFullyDownloaded({ hasText: true, textDownloaded: true, hasAudio: true, audioDownloaded: true }),
    ).toBe(true);
  });

  it('ignores content types that do not exist', () => {
    expect(
      isFullyDownloaded({ hasText: true, textDownloaded: true, hasAudio: false, audioDownloaded: false }),
    ).toBe(true);
    expect(
      isFullyDownloaded({ hasText: false, textDownloaded: false, hasAudio: true, audioDownloaded: true }),
    ).toBe(true);
  });

  it('is false when the only content type is missing', () => {
    expect(
      isFullyDownloaded({ hasText: true, textDownloaded: false, hasAudio: false, audioDownloaded: false }),
    ).toBe(false);
  });
});

describe('isManifestFullyDownloaded', () => {
  it('is true only when every manifest chapter is available', () => {
    expect(isManifestFullyDownloaded([1, 2, 3], new Set([1, 2, 3]))).toBe(true);
    expect(isManifestFullyDownloaded([1, 2, 3], new Set([1, 3]))).toBe(false);
  });

  it('ignores extra local chapters', () => {
    expect(isManifestFullyDownloaded([1, 2], new Set([1, 2, 99]))).toBe(true);
  });

  it('never treats an empty manifest as complete', () => {
    expect(isManifestFullyDownloaded([], new Set([1]))).toBe(false);
  });
});

describe('byte sums', () => {
  it('adds mp3 and cue sizes of chapter records', () => {
    expect(
      sumChapterBytes([
        { mp3ByteSize: 1000, cueByteSize: 10 },
        { mp3ByteSize: 2000, cueByteSize: 20 },
      ]),
    ).toBe(3030);
  });

  it('treats a missing cue size in the manifest as zero', () => {
    expect(sumManifestBytes([{ mp3ByteSize: 1000 }, { mp3ByteSize: 2000, cueByteSize: 5 }])).toBe(
      3005,
    );
  });
});

describe('mergeChapterRecords', () => {
  it('lets saved records replace existing ones and sorts by chapter', () => {
    const existing = [
      { chapterNumber: 3, tag: 'old-3' },
      { chapterNumber: 1, tag: 'old-1' },
    ];
    const saved = [
      { chapterNumber: 2, tag: 'new-2' },
      { chapterNumber: 3, tag: 'new-3' },
    ];

    expect(mergeChapterRecords(existing, saved).map((record) => record.tag)).toEqual([
      'old-1',
      'new-2',
      'new-3',
    ]);
  });
});
