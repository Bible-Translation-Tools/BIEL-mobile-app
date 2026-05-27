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

    fetchChapterAudioUrl(languageCode, bookSlug, chapter)
      .then((url) => {
        if (cancelled) return;
        if (!url) {
          setError('No audio available for this chapter');
          return;
        }
        setAudioUrl(url);
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

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const togglePlay = useCallback(() => {
    if (!audioUrl) return;
    if (status.playing) player.pause();
    else player.play();
  }, [audioUrl, player, status.playing]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.seekTo(seconds);
    },
    [player],
  );

  const seekToNextVerse = useCallback(() => {
    if (verseTimings.length === 0) return;
    const now = currentTimeRef.current;
    const next = verseTimings.find((t) => t.time > now + VERSE_BOUNDARY_EPSILON);
    if (next) player.seekTo(next.time);
  }, [verseTimings, player]);

  const seekToPreviousVerse = useCallback(() => {
    if (verseTimings.length === 0) return;
    const now = currentTimeRef.current;

    let currentIdx = -1;
    for (let i = verseTimings.length - 1; i >= 0; i -= 1) {
      if (verseTimings[i].time <= now + VERSE_BOUNDARY_EPSILON) {
        currentIdx = i;
        break;
      }
    }

    if (currentIdx <= 0) {
      player.seekTo(verseTimings[0]?.time ?? 0);
      return;
    }

    const offsetIntoVerse = now - verseTimings[currentIdx].time;
    const target =
      offsetIntoVerse > PREVIOUS_VERSE_RESTART_THRESHOLD
        ? verseTimings[currentIdx]
        : verseTimings[currentIdx - 1];
    player.seekTo(target.time);
  }, [verseTimings, player]);

  const currentVerse = useMemo(() => {
    if (verseTimings.length === 0) return null;
    const now = status.currentTime ?? 0;

    let activeVerse: number | null = null;
    for (let i = 0; i < verseTimings.length; i += 1) {
      if (verseTimings[i].time <= now + VERSE_BOUNDARY_EPSILON) {
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
    error,
    isPlaying: status.playing,
    currentTime: status.currentTime ?? 0,
    duration: status.duration ?? 0,
    currentVerse,
    hasVerseTimings: verseTimings.length > 0,
    togglePlay,
    pause,
    seekTo,
    seekToNextVerse,
    seekToPreviousVerse,
  };
}
