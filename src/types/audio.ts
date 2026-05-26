export type ApiAudioRenderedContent = {
  url: string;
  file_type: string;
  file_size_bytes: number | null;
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
