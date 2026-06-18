export type UseChapterAudioParams = {
  languageCode?: string;
  bookSlug?: string;
  bookName?: string;
  chapter?: number;
  /** Defer loading until needed (e.g. when the audio panel opens). */
  enabled?: boolean;
  /** Whether playback started from audio-only mode (affects notification deep links). */
  audioOnly?: boolean;
};
