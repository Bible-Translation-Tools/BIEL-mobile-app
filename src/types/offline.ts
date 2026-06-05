export type ApiBookContentRendering = {
  book_name: string;
  book_slug: string;
  rendered_content: {
    url: string;
    file_size_bytes: number;
    content: {
      name: string;
      resource_type: string;
    };
  };
};

export type BookContentQueryResult = {
  scriptural_rendering_metadata: ApiBookContentRendering[];
};

export type ResolvedBookContent = {
  bookName: string;
  bookSlug: string;
  url: string;
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
