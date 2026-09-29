import { describe, expect, it } from 'vitest';

import {
  parseBookAudioManifest,
  parseLanguageAudioManifests,
  pickChapterAudioFiles,
} from '@/domain/audio-manifest';
import type { AudioFile } from '@/types/catalog';

function audioFile(overrides: Partial<AudioFile>): AudioFile {
  return {
    url: 'https://example.test/file',
    fileType: 'mp3',
    fileSizeBytes: 100,
    chapter: 1,
    bookSlug: 'gen',
    bookName: 'Genesis',
    ...overrides,
  };
}

describe('pickChapterAudioFiles', () => {
  it('picks the mp3 and cue entries and ignores other types', () => {
    expect(
      pickChapterAudioFiles([
        audioFile({ url: 'a.mp3', fileType: 'mp3', fileSizeBytes: 1000 }),
        audioFile({ url: 'a.cue', fileType: 'cue', fileSizeBytes: 10 }),
        audioFile({ url: 'a.wav', fileType: 'wav' }),
      ]),
    ).toEqual({ mp3Url: 'a.mp3', mp3ByteSize: 1000, cueUrl: 'a.cue', cueByteSize: 10 });
  });

  it('treats a missing size as zero', () => {
    expect(pickChapterAudioFiles([audioFile({ fileSizeBytes: null })]).mp3ByteSize).toBe(0);
  });
});

describe('parseBookAudioManifest', () => {
  it('sorts chapters and drops ones without an mp3', () => {
    const { chapters } = parseBookAudioManifest(
      [
        audioFile({ chapter: 2, url: '2.mp3' }),
        audioFile({ chapter: 3, fileType: 'cue', url: '3.cue' }),
        audioFile({ chapter: 1, url: '1.mp3' }),
        audioFile({ chapter: 1, fileType: 'cue', url: '1.cue', fileSizeBytes: 5 }),
        audioFile({ chapter: null, url: 'intro.mp3' }),
      ],
      'GEN',
    );

    expect(chapters).toEqual([
      { chapter: 1, mp3Url: '1.mp3', mp3ByteSize: 100, cueUrl: '1.cue', cueByteSize: 5 },
      { chapter: 2, mp3Url: '2.mp3', mp3ByteSize: 100, cueUrl: undefined, cueByteSize: undefined },
    ]);
  });

  it('falls back to the slug when no file names the book', () => {
    expect(parseBookAudioManifest([audioFile({ bookName: null })], 'GEN').bookName).toBe('GEN');
  });
});

describe('parseLanguageAudioManifests', () => {
  it('groups files by normalized book slug', () => {
    const manifests = parseLanguageAudioManifests([
      audioFile({ bookSlug: 'gen', chapter: 1 }),
      audioFile({ bookSlug: ' GEN ', chapter: 2 }),
      audioFile({ bookSlug: 'exo', bookName: 'Exodus', chapter: 1 }),
      audioFile({ bookSlug: null }),
    ]);

    expect([...manifests.keys()]).toEqual(['GEN', 'EXO']);
    expect(manifests.get('GEN')?.chapters.map((chapter) => chapter.chapter)).toEqual([1, 2]);
    expect(manifests.get('EXO')?.bookName).toBe('Exodus');
  });
});
