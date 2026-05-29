export type ApiAudioRenderedContent = {
  url: string;
  file_type: string;
  file_size_bytes: number | null;
  scriptural_rendering_metadata?: {
    chapter: number | null;
    book_slug: string;
    book_name: string;
  } | null;
};

export type ApiAudioContent = {
  rendered_contents: ApiAudioRenderedContent[];
};

export type ChapterAudioQueryResult = {
  content: ApiAudioContent[];
};

export type ApiTimingRenderedContent = {
  url: string;
  file_type: string;
};

export type ApiTimingContent = {
  rendered_contents: ApiTimingRenderedContent[];
};

export type ChapterTimingQueryResult = {
  content: ApiTimingContent[];
};

export type VerseTiming = {
  verse: number;
  /** Start time of the verse in seconds. */
  time: number;
};

export type BookAudioFilesQueryResult = {
  content: ApiAudioContent[];
};

export type AudioBooksForLanguageQueryResult = {
  content: ApiAudioContent[];
};

export type ResolvedChapterAudio = {
  chapter: number;
  mp3Url: string;
  mp3ByteSize: number;
  cueUrl?: string;
  cueByteSize?: number;
};

export type AudioBookManifest = {
  bookSlug: string;
  bookName: string;
  chapters: ResolvedChapterAudio[];
};
