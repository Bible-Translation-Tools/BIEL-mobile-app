import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchChapterAudioUrl, fetchChapterVerseTimings } from '@/api/services/audio';
import type { VerseTiming } from '@/types/audio';

type UseChapterAudioParams = {
  languageCode?: string;
  bookSlug?: string;
  chapter?: number;
  /** Defer the URL fetch until needed (e.g. when the audio panel opens). */
  enabled?: boolean;
};

/** Seconds back into the current verse before "previous" restarts it instead of stepping back. */
const PREVIOUS_VERSE_RESTART_THRESHOLD = 3;
/** Small tolerance so we don't get stuck on the current marker when tapping "next". */
const VERSE_BOUNDARY_EPSILON = 0.1;

export function useChapterAudio({
  languageCode,
  bookSlug,
  chapter,
  enabled = true,
}: UseChapterAudioParams) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verseTimings, setVerseTimings] = useState<VerseTiming[]>([]);
  /** Chapter whose audio URL is currently loaded; null while switching or fetching. */
  const [loadedChapter, setLoadedChapter] = useState<number | null>(null);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const currentTimeRef = useRef(0);
  useEffect(() => {
    currentTimeRef.current = status.currentTime ?? 0;
  }, [status.currentTime]);

  useEffect(() => {
    if (!enabled || !languageCode || !bookSlug || !chapter) return;

    let cancelled = false;
    setIsFetching(true);
    setError(null);
    setAudioUrl(null);
    setVerseTimings([]);
    setLoadedChapter(null);

    fetchChapterAudioUrl(languageCode, bookSlug, chapter)
      .then((url) => {
        if (cancelled) return;
        if (!url) {
          setError('No audio available for this chapter');
          return;
        }
        setAudioUrl(url);
        setLoadedChapter(chapter);
        try {
          player.replace(url);
        } catch (err) {
          console.warn('[audio] failed to set source', err);
          setError('Failed to load audio');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load audio';
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    fetchChapterVerseTimings(languageCode, bookSlug, chapter)
      .then((timings) => {
        if (cancelled) return;
        setVerseTimings(timings);
      })
      .catch((err: unknown) => {
        // Timings are optional; log and continue without verse stepping.
        console.warn('[audio] failed to load verse timings', err);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, languageCode, bookSlug, chapter, player]);

  const togglePlay = useCallback(() => {
    if (!audioUrl) return;
    if (status.playing) player.pause();
    else player.play();
  }, [audioUrl, player, status.playing]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const play = useCallback(() => {
    if (!audioUrl) return;
    player.play();
  }, [audioUrl, player]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.seekTo(seconds);
    },
    [player],
  );

  const seekToVerse = useCallback(
    (verse: number): boolean => {
      const timing = verseTimings.find((t) => t.verse === verse);
      if (!timing) return false;
      player.seekTo(timing.time);
      return true;
    },
    [verseTimings, player],
  );

  const seekToFirstVerse = useCallback(() => {
    player.seekTo(verseTimings[0]?.time ?? 0);
  }, [verseTimings, player]);

  const seekToLastVerse = useCallback(() => {
    if (verseTimings.length > 0) {
      player.seekTo(verseTimings[verseTimings.length - 1].time);
      return;
    }
    const duration = status.duration ?? 0;
    if (duration > 0) player.seekTo(Math.max(0, duration - 1));
  }, [verseTimings, player, status.duration]);

  /** Returns true when seek stayed in the current chapter. */
  const seekToNextVerse = useCallback((): boolean => {
    if (verseTimings.length === 0) return false;
    const now = currentTimeRef.current;
    const next = verseTimings.find((t) => t.time > now + VERSE_BOUNDARY_EPSILON);
    if (!next) return false;
    player.seekTo(next.time);
    return true;
  }, [verseTimings, player]);

  /** Returns true when seek stayed in the current chapter. */
  const seekToPreviousVerse = useCallback((): boolean => {
    if (verseTimings.length === 0) return false;
    const playbackPosition = currentTimeRef.current;

    let currentIdx = -1;
    for (let i = verseTimings.length - 1; i >= 0; i -= 1) {
      if (verseTimings[i].time <= playbackPosition + VERSE_BOUNDARY_EPSILON) {
        currentIdx = i;
        break;
      }
    }

    if (currentIdx <= 0) {
      const firstVerseTime = verseTimings[0]?.time ?? 0;
      const offsetIntoVerse = playbackPosition - firstVerseTime;
      if (offsetIntoVerse > PREVIOUS_VERSE_RESTART_THRESHOLD) {
        player.seekTo(firstVerseTime);
        return true;
      }
      return false;
    }

    const offsetIntoVerse = playbackPosition - verseTimings[currentIdx].time;
    const target =
      offsetIntoVerse > PREVIOUS_VERSE_RESTART_THRESHOLD
        ? verseTimings[currentIdx]
        : verseTimings[currentIdx - 1];
    player.seekTo(target.time);
    return true;
  }, [verseTimings, player]);

  const currentVerse = useMemo(() => {
    if (verseTimings.length === 0) return null;
    const playbackPosition = status.currentTime ?? 0;

    let activeVerse: number | null = null;
    for (let i = 0; i < verseTimings.length; i += 1) {
      if (verseTimings[i].time <= playbackPosition + VERSE_BOUNDARY_EPSILON) {
        activeVerse = verseTimings[i].verse;
      } else {
        break;
      }
    }

    return activeVerse;
  }, [verseTimings, status.currentTime]);

  return {
    audioUrl,
    isFetching,
    loadedChapter,
    error,
    isPlaying: status.playing,
    didJustFinish: status.didJustFinish,
    currentTime: status.currentTime ?? 0,
    duration: status.duration ?? 0,
    currentVerse,
    hasVerseTimings: verseTimings.length > 0,
    togglePlay,
    pause,
    play,
    seekTo,
    seekToVerse,
    seekToFirstVerse,
    seekToLastVerse,
    seekToNextVerse,
    seekToPreviousVerse,
  };
}
