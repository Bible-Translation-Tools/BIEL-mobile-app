import { resolveLanguageBookSlugs } from '@/api/services/books';
import { isAbortError, runWithConcurrency } from '@/utils/run-with-concurrency';

import { isBookDownloaded } from './access';
import { downloadBookScripture } from './download-book';
import type { DownloadProgressCallback } from './types';

const SCRIPTURE_BOOK_DOWNLOAD_CONCURRENCY = 10;

export async function downloadLanguageScripture(
  languageCode: string,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<void> {
  const slugs = await resolveLanguageBookSlugs(languageCode);
  if (slugs.length === 0) {
    throw new Error('No books available to download for this language');
  }

  const pendingSlugs: string[] = [];
  for (const bookSlug of slugs) {
    if (options?.signal?.aborted) {
      break;
    }
    if (!(await isBookDownloaded(languageCode, bookSlug))) {
      pendingSlugs.push(bookSlug);
    }
  }

  if (pendingSlugs.length === 0) {
    options?.onProgress?.(1);
    return;
  }

  const progressByBook = new Array<number>(pendingSlugs.length).fill(0);
  const reportOverallProgress = () => {
    const overall =
      progressByBook.reduce((sum, bookProgress) => sum + bookProgress, 0) / pendingSlugs.length;
    options?.onProgress?.(overall);
  };

  await runWithConcurrency(
    pendingSlugs,
    SCRIPTURE_BOOK_DOWNLOAD_CONCURRENCY,
    async (bookSlug, index) => {
      if (options?.signal?.aborted) {
        return;
      }

      try {
        await downloadBookScripture(languageCode, bookSlug, {
          signal: options?.signal,
          onProgress: (bookProgress) => {
            progressByBook[index] = bookProgress;
            reportOverallProgress();
          },
        });
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }
        progressByBook[index] = 1;
        reportOverallProgress();
      }
    },
  );

  options?.onProgress?.(1);
}
