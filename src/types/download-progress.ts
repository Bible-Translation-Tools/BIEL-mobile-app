export type BookDownloadKind = 'book-scripture' | 'book-audio';

export type DownloadTaskStatus = 'downloading' | 'completed' | 'failed';

export type GlobalBookDownloadSync = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  kind: BookDownloadKind;
};

export type DownloadProgressTask = GlobalBookDownloadSync & {
  id: string;
  progress: number;
  status: DownloadTaskStatus;
  errorMessage?: string;
  updatedAt: number;
};

export function buildBookDownloadTaskId(sync: GlobalBookDownloadSync): string {
  return `${sync.languageCode}:${sync.bookSlug.toUpperCase()}:${sync.kind}`;
}
