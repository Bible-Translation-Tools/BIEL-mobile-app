import type { AudioBookManifest, ResolvedChapterAudio } from '@/types/audio';
import type { AudioFile } from '@/types/catalog';

import { normalizeBookSlug } from './book-slug';

export type ChapterAudioFiles = {
  mp3Url?: string;
  mp3ByteSize?: number;
  cueUrl?: string;
  cueByteSize?: number;
};

/** Picks the mp3 and cue entries from one chapter's catalog files; later files win. */
export function pickChapterAudioFiles(files: readonly AudioFile[]): ChapterAudioFiles {
  const entry: ChapterAudioFiles = {};

  for (const file of files) {
    if (file.fileType === 'mp3') {
      entry.mp3Url = file.url;
      entry.mp3ByteSize = file.fileSizeBytes ?? 0;
    } else if (file.fileType === 'cue') {
      entry.cueUrl = file.url;
      entry.cueByteSize = file.fileSizeBytes ?? 0;
    }
  }

  return entry;
}

/**
 * Builds a book's chapter list from its catalog audio files, sorted by chapter.
 * Chapters without an mp3 are dropped; `bookSlug` is the name fallback.
 */
export function parseBookAudioManifest(
  files: readonly AudioFile[],
  bookSlug: string,
): Pick<AudioBookManifest, 'bookName' | 'chapters'> {
  const filesByChapter = new Map<number, AudioFile[]>();
  let bookName = bookSlug;

  for (const file of files) {
    if (file.chapter == null) continue;
    if (file.bookName) {
      bookName = file.bookName;
    }
    const chapterFiles = filesByChapter.get(file.chapter) ?? [];
    chapterFiles.push(file);
    filesByChapter.set(file.chapter, chapterFiles);
  }

  const chapters: ResolvedChapterAudio[] = [...filesByChapter.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([chapter, chapterFiles]) => {
      const entry = pickChapterAudioFiles(chapterFiles);
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

/** Splits a language's catalog audio files into one manifest per normalized book slug. */
export function parseLanguageAudioManifests(
  files: readonly AudioFile[],
): Map<string, AudioBookManifest> {
  const filesByBook = new Map<string, AudioFile[]>();

  for (const file of files) {
    if (!file.bookSlug) continue;
    const slug = normalizeBookSlug(file.bookSlug);
    const bookFiles = filesByBook.get(slug) ?? [];
    bookFiles.push(file);
    filesByBook.set(slug, bookFiles);
  }

  const manifests = new Map<string, AudioBookManifest>();
  for (const [bookSlug, bookFiles] of filesByBook) {
    const { bookName, chapters } = parseBookAudioManifest(bookFiles, bookSlug);
    manifests.set(bookSlug, { bookSlug, bookName, chapters });
  }

  return manifests;
}
