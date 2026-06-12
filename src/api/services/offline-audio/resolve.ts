import { graphqlRequest } from '@/api/graphql/client';
import {
  BOOK_AUDIO_FILES_QUERY,
  CHAPTER_AUDIO_FILE_QUERY,
} from '@/api/graphql/queries';
import { normalizeBookSlug } from '@/constants/offline-storage';
import { getAudioBookRecord, listAudioChaptersForBook } from '@/db';
import type {
  AudioBookManifest,
  BookAudioFilesQueryResult,
  ChapterAudioQueryResult,
} from '@/types/audio';

import {
  getLanguageAudioManifests,
  parseBookAudioManifestFromQuery,
  resolveChapterAudioFromQuery,
  sumManifestBytes,
} from './manifest';

export async function resolveBookAudioChapters(
  languageCode: string,
  bookSlug: string,
): Promise<AudioBookManifest> {
  const data = await graphqlRequest<BookAudioFilesQueryResult>(BOOK_AUDIO_FILES_QUERY, {
    languageCode,
    bookSlug,
  });

  const canonicalSlug = normalizeBookSlug(bookSlug);
  const { bookName, chapters } = parseBookAudioManifestFromQuery(data, canonicalSlug);

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
