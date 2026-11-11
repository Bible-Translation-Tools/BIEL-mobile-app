import type { DownloadFailure, DownloadOutcome } from '@/types/download';

export type DownloadJob = (options: {
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}) => Promise<DownloadOutcome>;

export type BookDownloadKind = 'book-text' | 'book-audio';
export type LanguageDownloadKind = 'language-text' | 'language-audio';
export type ChapterDownloadKind = 'chapter-text' | 'chapter-audio';
export type DownloadKind = BookDownloadKind | LanguageDownloadKind | ChapterDownloadKind;

export type DownloadTaskStatus = 'downloading' | 'completed' | 'failed';

export type GlobalBookDownloadSync = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  kind: BookDownloadKind;
};

export type GlobalLanguageDownloadSync = {
  languageCode: string;
  languageName: string;
  kind: LanguageDownloadKind;
};

export type GlobalChapterDownloadSync = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  chapter: number;
  kind: ChapterDownloadKind;
};

export type GlobalDownloadSync =
  | GlobalBookDownloadSync
  | GlobalLanguageDownloadSync
  | GlobalChapterDownloadSync;

export type DownloadProgressTask = {
  id: string;
  languageCode: string;
  displayName: string;
  kind: DownloadKind;
  bookSlug?: string;
  progress: number;
  status: DownloadTaskStatus;
  failure?: DownloadFailure;
  updatedAt: number;
};
