export type ResolvedBookContent = {
  bookName: string;
  bookSlug: string;
  url: string;
  hash: string | null;
  resourceType: string;
  contentName: string;
  fileSizeBytes: number;
};

export type OfflineChapter = {
  number: number;
  html: string;
};

export type OfflineBook = {
  slug: string;
  name: string;
  chapters: Map<number, OfflineChapter>;
};
