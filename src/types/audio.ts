export type VerseTiming = {
  verse: number;
  /** Start time of the verse in seconds. */
  time: number;
};

/** Supported verse-timing file formats. */
export type TimingFileFormat = 'cue';

/** Parses verse start times from a timing file payload. */
export type VerseTimingParser = {
  parse(timingText: string): VerseTiming[];
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
