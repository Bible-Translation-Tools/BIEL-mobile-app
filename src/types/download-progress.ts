import type { DownloadFailure, DownloadOutcome } from '@/types/download';

export type DownloadJob = (options: {
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}) => Promise<DownloadOutcome>;

export type DownloadContentType = 'text' | 'audio';

export type DownloadTaskStatus = 'downloading' | 'completed' | 'failed';

/**
 * What a download covers. The level follows from the fields: no `book` is a whole
 * language, `book` alone is a book, and `book` with `chapter` is one chapter of it.
 * `chapter` is ignored without a `book`.
 */
export type GlobalDownloadSync = {
  languageCode: string;
  /** Shown for language-level downloads; falls back to the code. */
  languageName?: string;
  contentType: DownloadContentType;
  book?: {
    slug: string;
    name: string;
  };
  chapter?: number;
};

export type DownloadProgressTask = {
  id: string;
  displayName: string;
  contentType: DownloadContentType;
  progress: number;
  status: DownloadTaskStatus;
  failure?: DownloadFailure;
  updatedAt: number;
};
