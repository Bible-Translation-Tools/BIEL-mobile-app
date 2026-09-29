import type { DownloadFailure } from '@/types/download';

type ErrorWithFailure = Error & { downloadFailure: DownloadFailure };

function hasDownloadFailure(err: unknown): err is ErrorWithFailure {
  return err instanceof Error && 'downloadFailure' in err;
}

/** Thrown when a book's audio download ends with chapters still missing. The message is for logs only. */
export function missingAudioChaptersError(chapters: readonly number[]): Error {
  const sorted = [...new Set(chapters)].sort((a, b) => a - b);
  const error = new Error(`Missing audio for chapters: ${sorted.join(', ')}`) as ErrorWithFailure;
  error.downloadFailure = { reason: 'missing-audio-chapters', chapters: sorted };
  return error;
}

export function toDownloadFailure(err: unknown): DownloadFailure {
  if (hasDownloadFailure(err)) return err.downloadFailure;
  return { reason: 'error', message: err instanceof Error ? err.message : undefined };
}
export function partialDownloadFailure(failedBookSlugs: readonly string[]): DownloadFailure {
  return { reason: 'failed-books', count: failedBookSlugs.length };
}

