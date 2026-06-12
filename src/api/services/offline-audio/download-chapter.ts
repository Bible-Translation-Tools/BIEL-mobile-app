import { graphqlRequest } from '@/api/graphql/client';
import { CHAPTER_AUDIO_FILE_QUERY } from '@/api/graphql/queries';
import {
  ensureOfflineAudioDirectory,
  ensureOfflineRootExists,
  getChapterCueFile,
  getChapterMp3File,
  normalizeBookSlug,
} from '@/constants/offline-storage';
import { mergeAudioChapter } from '@/db';
import type { ChapterAudioQueryResult } from '@/types/audio';

import { writeBinaryFile, writeTextFile } from './file-writes';
import { resolveChapterAudioFromQuery } from './manifest';
import { resolveBookAudioChapters } from './resolve';
import { abortError } from '../offline/abort';
import type { DownloadProgressCallback } from './types';

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
