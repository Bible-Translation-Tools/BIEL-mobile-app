import { useAudioVolume, useSetAudioVolume } from '@/stores/audio-volume-store';

import type { UseChapterAudioParams } from './use-chapter-audio.types';

export { useChapterHasAudio } from './use-chapter-has-audio';
export type { UseChapterAudioParams } from './use-chapter-audio.types';

const webChapterAudioStub = {
  audioUrl: null as string | null,
  isFetching: false,
  loadedChapter: null as number | null,
  error: null as string | null,
  isPlaying: false,
  didJustFinish: false,
  currentTime: 0,
  duration: 0,
  currentVerse: null as number | null,
  hasVerseTimings: false,
  togglePlay: () => {},
  pause: () => {},
  play: () => {},
  seekTo: (_seconds: number) => {},
  seekToVerse: (_verse: number) => false,
  seekToFirstVerse: () => {},
  seekToLastVerse: () => {},
  seekToNextVerse: () => false,
  seekToPreviousVerse: () => false,
};

export function useChapterAudio(_params: UseChapterAudioParams) {
  const volume = useAudioVolume();
  const setVolume = useSetAudioVolume();
  return { ...webChapterAudioStub, volume, setVolume };
}
