/** A published scripture file (one chapter or one whole book) from the remote catalog. */
export type ScriptureRendering = {
  /** Missing on chapter queries, which already filter by book. */
  bookSlug: string | null;
  bookName: string;
  /** `null` for whole-book renderings. */
  chapter: number | null;
  resourceType: string;
  contentName: string;
  url: string;
  hash: string | null;
  fileSizeBytes: number | null;
};

export type CatalogLanguage = {
  code: string;
  englishName: string;
  nationalName: string | null;
  resourceTypes: string[];
};

export type CatalogBook = {
  bookSlug: string;
  bookName: string;
};

/** A downloadable chapter audio or timing file. */
export type AudioFile = {
  url: string;
  /** Lower-case file extension, e.g. `mp3` or `cue`. */
  fileType: string;
  fileSizeBytes: number | null;
  chapter: number | null;
  bookSlug: string | null;
  bookName: string | null;
};
