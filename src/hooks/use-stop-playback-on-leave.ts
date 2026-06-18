import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import {
  consumeSuppressStopPlayback,
  stopPlayback,
} from '@/services/track-player/chapter-playback';
import { setReadingScreenFocused } from '@/services/track-player/app-lifecycle';

/** Stops chapter audio when the reading screen loses focus (unless resuming from notification). */
export function useStopPlaybackOnLeave(): void {
  useFocusEffect(
    useCallback(() => {
      setReadingScreenFocused(true);
      return () => {
        setReadingScreenFocused(false);
        if (consumeSuppressStopPlayback()) return;
        void stopPlayback();
      };
    }, []),
  );
}

/** Stops chapter audio before navigating away from the reading screen. */
export function stopPlaybackBeforeLeave(): void {
  void stopPlayback();
}
