export type BookDownloadKind = 'book-scripture' | 'book-audio';
export type LanguageDownloadKind = 'language-scripture' | 'language-audio';
export type DownloadKind = BookDownloadKind | LanguageDownloadKind;

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

export type GlobalDownloadSync = GlobalBookDownloadSync | GlobalLanguageDownloadSync;

export type DownloadProgressTask = {
  id: string;
  languageCode: string;
  displayName: string;
  kind: DownloadKind;
  bookSlug?: string;
  progress: number;
  status: DownloadTaskStatus;
  errorMessage?: string;
  updatedAt: number;
};

export function buildDownloadTaskId(sync: GlobalDownloadSync): string {
  if ('bookSlug' in sync) {
    return `${sync.languageCode}:${sync.bookSlug.toUpperCase()}:${sync.kind}`;
  }
  return `${sync.languageCode}:__language__:${sync.kind}`;
}

/** @deprecated Use buildDownloadTaskId */
export const buildBookDownloadTaskId = buildDownloadTaskId;
