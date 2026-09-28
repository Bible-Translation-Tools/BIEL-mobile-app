import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import {
  consumeSuppressStopPlayback,
  setReadingScreenFocused,
  stopPlayback,
} from '@/features/playback';

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
