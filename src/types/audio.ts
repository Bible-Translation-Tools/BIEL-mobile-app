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
