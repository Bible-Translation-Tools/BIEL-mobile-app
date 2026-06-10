import type { DownloadStatus } from '@/types/download';

export type Testament = 'old' | 'new';

export type ChapterItem = {
  number: number;
};

export type BookItem = {
  id: string;
  name: string;
  slug: string;
  testament: Testament;
  downloadStatus: DownloadStatus;
  audioDownloadStatus: DownloadStatus;
  hasAudio: boolean;
};

export type ApiBookMetadata = {
  book_name: string;
  book_slug: string;
};

export type BooksQueryResult = {
  scriptural_rendering_metadata: ApiBookMetadata[];
};

export type ApiChapterMetadata = {
  chapter: number | null;
};

export type ChaptersQueryResult = {
  scriptural_rendering_metadata: ApiChapterMetadata[];
};
