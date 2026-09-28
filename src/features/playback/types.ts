import type { VerseTiming } from '@/types/audio';

export type ChapterPlaybackSession = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  chapterNumbers: number[];
  activeChapter: number;
  audioOnly?: boolean;
};

export type ChapterPlaybackSnapshot = {
  isFetching: boolean;
  error: string | null;
  audioUrl: string | null;
  loadedChapter: number | null;
  verseTimings: VerseTiming[];
  didJustFinish: boolean;
};
