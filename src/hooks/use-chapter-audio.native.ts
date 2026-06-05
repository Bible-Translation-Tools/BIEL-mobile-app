import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  Event,
  State,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';

import {
  canSeekToPreviousVerseInChapter,
  clearDidJustFinish,
  clearSession,
  getChapterPlaybackSnapshot,
  getPlaybackCurrentTime,
  loadChapter,
  pause as pausePlayback,
  play as playPlayback,
  resolveCurrentVerse,
  seekTo as seekToPlayback,
  seekToFirstVerse as seekToFirstVersePlayback,
  seekToLastVerse as seekToLastVersePlayback,
  seekToNextVerse as seekToNextVersePlayback,
  seekToPreviousVerse as seekToPreviousVersePlayback,
  seekToVerse as seekToVersePlayback,
  setPlaybackCurrentTime,
  setSessionContext,
  subscribeChapterPlayback,
  togglePlay as togglePlayPlayback,
  updateNowPlayingVerse,
  VERSE_BOUNDARY_EPSILON,
} from '@/services/track-player/chapter-playback';
import { useAudioVolume, useSetAudioVolume } from '@/stores/audio-volume-store';

import type { UseChapterAudioParams } from './use-chapter-audio.types';

export { useChapterHasAudio } from './use-chapter-has-audio';
export type { UseChapterAudioParams } from './use-chapter-audio.types';

function useChapterPlaybackSnapshot() {
  return useSyncExternalStore(
    subscribeChapterPlayback,
    getChapterPlaybackSnapshot,
    getChapterPlaybackSnapshot,
  );
}

export function useChapterAudio({
  languageCode,
  bookSlug,
  bookName,
  chapter,
  enabled = true,
}: UseChapterAudioParams) {
  const volume = useAudioVolume();
  const setVolume = useSetAudioVolume();
  const playbackSnapshot = useChapterPlaybackSnapshot();
  const playbackState = usePlaybackState();
  const progress = useProgress();
  const [queueEnded, setQueueEnded] = useState(false);
  const lastVerseRef = useRef<number | null>(null);

  useTrackPlayerEvents([Event.PlaybackQueueEnded], () => {
    setQueueEnded(true);
  });

  useEffect(() => {
    setPlaybackCurrentTime(progress.position);
  }, [progress.position]);

  const isPlaying = playbackState.state === State.Playing;
  const didJustFinish = playbackSnapshot.didJustFinish || queueEnded;

  useEffect(() => {
    if (!queueEnded) return;
    const timer = setTimeout(() => setQueueEnded(false), 0);
    return () => clearTimeout(timer);
  }, [queueEnded]);

  useEffect(() => {
    if (!didJustFinish) return;
    const timer = setTimeout(() => clearDidJustFinish(), 0);
    return () => clearTimeout(timer);
  }, [didJustFinish]);

  useEffect(() => {
    if (!enabled || !languageCode || !bookSlug || chapter == null) {
      void pausePlayback();
      return;
    }

    setSessionContext({
      languageCode,
      bookSlug,
      bookName: bookName?.trim() || bookSlug,
      activeChapter: chapter,
    });

    void loadChapter(chapter);
  }, [enabled, languageCode, bookSlug, bookName, chapter]);

  useEffect(() => {
    if (!enabled) {
      clearSession();
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      void pausePlayback();
      clearSession();
    };
  }, []);

  const currentVerse = useMemo(
    () => resolveCurrentVerse(playbackSnapshot.verseTimings, progress.position),
    [playbackSnapshot.verseTimings, progress.position],
  );

  useEffect(() => {
    if (chapter == null || currentVerse == null || currentVerse === lastVerseRef.current) return;
    lastVerseRef.current = currentVerse;
    void updateNowPlayingVerse(chapter, currentVerse);
  }, [chapter, currentVerse]);

  const togglePlay = useCallback(() => {
    void togglePlayPlayback();
  }, []);

  const pause = useCallback(() => {
    void pausePlayback();
  }, []);

  const play = useCallback(() => {
    void playPlayback();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    void seekToPlayback(seconds);
  }, []);

  const seekToVerse = useCallback((verse: number): boolean => {
    const found = getChapterPlaybackSnapshot().verseTimings.some((item) => item.verse === verse);
    if (!found) return false;
    void seekToVersePlayback(verse);
    return true;
  }, []);

  const seekToFirstVerse = useCallback(() => {
    void seekToFirstVersePlayback();
  }, []);

  const seekToLastVerse = useCallback(() => {
    void seekToLastVersePlayback(progress.duration);
  }, [progress.duration]);

  const seekToNextVerse = useCallback((): boolean => {
    const timings = getChapterPlaybackSnapshot().verseTimings;
    if (timings.length === 0) return false;
    const now = getPlaybackCurrentTime();
    const next = timings.find((item) => item.time > now + VERSE_BOUNDARY_EPSILON);
    if (!next) return false;
    void seekToNextVersePlayback();
    return true;
  }, []);

  const seekToPreviousVerse = useCallback((): boolean => {
    if (!canSeekToPreviousVerseInChapter()) return false;
    void seekToPreviousVersePlayback();
    return true;
  }, []);

  return {
    audioUrl: playbackSnapshot.audioUrl,
    isFetching: playbackSnapshot.isFetching,
    loadedChapter: playbackSnapshot.loadedChapter,
    error: playbackSnapshot.error,
    isPlaying,
    didJustFinish,
    currentTime: progress.position,
    duration: progress.duration,
    currentVerse,
    hasVerseTimings: playbackSnapshot.verseTimings.length > 0,
    togglePlay,
    pause,
    play,
    seekTo,
    seekToVerse,
    seekToFirstVerse,
    seekToLastVerse,
    seekToNextVerse,
    seekToPreviousVerse,
    volume,
    setVolume,
  };
}
