import { AppState, Platform } from 'react-native';

import { stopPlayback } from '@/services/track-player/chapter-playback';

let readingScreenFocused = false;

export function setReadingScreenFocused(focused: boolean): void {
  readingScreenFocused = focused;
}

/** Stops playback when the app leaves the foreground outside the reading screen. */
export function initPlaybackAppLifecycle(): () => void {
  if (Platform.OS === 'web') return () => {};

  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background' && !readingScreenFocused) {
      void stopPlayback();
    }
  });

  return () => subscription.remove();
}
