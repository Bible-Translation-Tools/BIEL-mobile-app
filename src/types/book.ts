import type { DownloadStatus } from '@/types/download';

export type Testament = 'old' | 'new';

export type ChapterItem = {
  number: number;
  /** When false, the chapter has no local content. Omit or true = available. */
  available?: boolean;
  /** Local scripture for this chapter. Omit when content type is unknown (catalog). */
  hasText?: boolean;
  /** Local audio for this chapter. Omit when content type is unknown (catalog). */
  hasAudio?: boolean;
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
