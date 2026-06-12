import type { AudioBookManifest } from '@/types/audio';

import { downloadBookAudio } from './download-book';
import { resolveLanguageAudioBooks } from './resolve';
import { isBookAudioDownloaded } from './status';
import type { DownloadProgressCallback } from './types';

export async function downloadLanguageAudio(
  languageCode: string,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<void> {
  const books = await resolveLanguageAudioBooks(languageCode);
  if (books.length === 0) {
    throw new Error('No audio available to download for this language');
  }

  const pendingBooks: Pick<AudioBookManifest, 'bookSlug' | 'bookName'>[] = [];
  for (const book of books) {
    if (options?.signal?.aborted) {
      break;
    }
    if (!(await isBookAudioDownloaded(languageCode, book.bookSlug))) {
      pendingBooks.push(book);
    }
  }

  if (pendingBooks.length === 0) {
    options?.onProgress?.(1);
    return;
  }

  for (let index = 0; index < pendingBooks.length; index++) {
    if (options?.signal?.aborted) {
      break;
    }

    const book = pendingBooks[index]!;
    try {
      await downloadBookAudio(languageCode, book.bookSlug, {
        signal: options?.signal,
        onProgress: (bookProgress) => {
          const overall = (index + bookProgress) / pendingBooks.length;
          options?.onProgress?.(overall);
        },
      });
    } catch {
      // Failed books are skipped; abort is handled inside downloadBookAudio.
    }
  }

  options?.onProgress?.(1);
}
