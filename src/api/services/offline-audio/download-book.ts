import { File } from 'expo-file-system';

import { ensureOfflineAudioDirectory, ensureOfflineRootExists } from '@/constants/offline-storage';
import type { AudioChapterRecord } from '@/db';
import { listAudioChaptersForBook, upsertAudioBookWithChapters } from '@/db';
import { isAbortError, runWithConcurrency } from '@/utils/run-with-concurrency';

import {
  removePartialChapterAudioFiles,
  writeChapterAudioFiles,
} from './file-writes';
import {
  isBookFullyDownloadedLocally,
  mergeChapterRecords,
  sumChapterBytes,
} from './manifest';
import { resolveBookAudioChapters } from './resolve';
import type { DownloadProgressCallback } from './types';

const AUDIO_CHAPTER_DOWNLOAD_CONCURRENCY = 3;

export async function downloadBookAudio(
  languageCode: string,
  bookSlug: string,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<void> {
  await ensureOfflineRootExists();

  const manifest = await resolveBookAudioChapters(languageCode, bookSlug);
  if (manifest.chapters.length === 0) {
    throw new Error('No audio available for this book');
  }

  if (options?.signal?.aborted) {
    return;
  }

  const canonicalSlug = manifest.bookSlug;
  ensureOfflineAudioDirectory(languageCode, canonicalSlug);

  const existingChapters = await listAudioChaptersForBook(languageCode, canonicalSlug);
  const pendingChapters = manifest.chapters.filter((chapterAudio) => {
    const existing = existingChapters.find((chapter) => chapter.chapterNumber === chapterAudio.chapter);
    if (!existing) return true;
    return !new File(existing.mp3Path).exists;
  });

  const persistChapters = async (chapters: AudioChapterRecord[], isComplete: boolean) => {
    await upsertAudioBookWithChapters({
      languageCode,
      bookSlug: canonicalSlug,
      bookName: manifest.bookName,
      byteSize: sumChapterBytes(chapters),
      chapters,
      isComplete,
    });
  };

  if (pendingChapters.length === 0) {
    const merged = mergeChapterRecords(existingChapters, []);
    const isComplete = isBookFullyDownloadedLocally(
      manifest,
      languageCode,
      canonicalSlug,
      merged.map((chapter) => chapter.chapterNumber),
    );
    await persistChapters(merged, isComplete);

    if (!isComplete) {
      throw new Error('Could not download all audio chapters');
    }

    options?.onProgress?.(1);
    return;
  }

  const totalChapters = pendingChapters.length;
  const progressByChapter = new Array<number>(totalChapters).fill(0);
  const reportProgress = () => {
    const overall =
      progressByChapter.reduce((sum, chapterProgress) => sum + chapterProgress, 0) /
      totalChapters;
    options?.onProgress?.(overall);
  };

  const savedChapters = (
    await runWithConcurrency(
      pendingChapters,
      AUDIO_CHAPTER_DOWNLOAD_CONCURRENCY,
      async (chapterAudio, index) => {
        if (options?.signal?.aborted) {
          return null;
        }

        try {
          const chapterRecord = await writeChapterAudioFiles(
            languageCode,
            canonicalSlug,
            chapterAudio,
            options,
          );
          progressByChapter[index] = 1;
          reportProgress();
          return chapterRecord;
        } catch (err) {
          if (isAbortError(err)) {
            removePartialChapterAudioFiles(languageCode, canonicalSlug, chapterAudio.chapter);
            progressByChapter[index] = 1;
            reportProgress();
            return null;
          }
          progressByChapter[index] = 1;
          reportProgress();
          return null;
        }
      },
    )
  ).filter((chapter): chapter is AudioChapterRecord => chapter !== null);

  if (options?.signal?.aborted) {
    if (savedChapters.length > 0) {
      const merged = mergeChapterRecords(existingChapters, savedChapters);
      await persistChapters(merged, false);
    }
    return;
  }

  const merged = mergeChapterRecords(existingChapters, savedChapters);
  const isComplete = isBookFullyDownloadedLocally(
    manifest,
    languageCode,
    canonicalSlug,
    merged.map((chapter) => chapter.chapterNumber),
  );

  if (merged.length > 0) {
    await persistChapters(merged, isComplete);
  }

  if (!isComplete) {
    throw new Error('Could not download all audio chapters');
  }

  options?.onProgress?.(1);
}
