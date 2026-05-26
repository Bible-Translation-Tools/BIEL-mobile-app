import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';

import { fetchChapterAudioUrl } from '@/services/audio';

type UseChapterAudioParams = {
  languageCode?: string;
  bookSlug?: string;
  chapter?: number;
  /** Defer the URL fetch until needed (e.g. when the audio panel opens). */
  enabled?: boolean;
};

export function useChapterAudio({
  languageCode,
  bookSlug,
  chapter,
  enabled = true,
}: UseChapterAudioParams) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!enabled || !languageCode || !bookSlug || !chapter) return;

    let cancelled = false;
    setIsFetching(true);
    setError(null);
    setAudioUrl(null);

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

  return {
    audioUrl,
    isFetching,
    error,
    isPlaying: status.playing,
    currentTime: status.currentTime ?? 0,
    duration: status.duration ?? 0,
    togglePlay,
    pause,
    seekTo,
  };
}
