import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { clearReadingCheckpoint, saveReadingCheckpoint } from '@/stores/reading-checkpoint-store';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

/**
 * Keeps a screen's checkpoint (the book list or the reader) saved while that screen is focused, so a
 * relaunch reopens it. Losing focus (any way of leaving: Back, hardware Back, swipe-back, or a screen
 * pushed on top) clears it if it is still this screen's; regaining focus saves it again. Saves are
 * skipped while unfocused so a screen left under another one can't save itself back.
 *
 * Closing the app also runs the focus cleanup: iOS stops the React surface on terminate (swiping the
 * app away from the switcher) and Android does when the activity is destroyed, which unmounts every
 * screen. That is not the user leaving the screen, so the checkpoint is kept when the app is no
 * longer in the foreground; navigation only happens while it is `active`.
 */
export function usePersistReadingCheckpoint(checkpoint: ReadingCheckpoint | null): void {
  const checkpointRef = useRef(checkpoint);
  const focusedRef = useRef(false);

  useEffect(() => {
    checkpointRef.current = checkpoint;
    if (checkpoint != null && focusedRef.current) saveReadingCheckpoint(checkpoint);
  }, [checkpoint]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      if (checkpointRef.current != null) saveReadingCheckpoint(checkpointRef.current);

      return () => {
        focusedRef.current = false;
        if (AppState.currentState === 'active' && checkpointRef.current != null) {
          clearReadingCheckpoint(checkpointRef.current);
        }
      };
    }, []),
  );
}
