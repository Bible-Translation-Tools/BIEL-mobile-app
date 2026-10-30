import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { clearReadingCheckpoint, saveReadingCheckpoint } from '@/stores/reading-checkpoint-store';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

/**
 * Keeps a screen's checkpoint (the book list or the reader) saved while that screen is focused, so a
 * relaunch reopens it. Losing focus (any way of leaving: Back, hardware Back, swipe-back, or a screen
 * pushed on top) clears it if it is still this screen's; regaining focus saves it again. Saves are
 * skipped while unfocused so a screen left under another one can't save itself back.
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
        if (checkpointRef.current != null) clearReadingCheckpoint(checkpointRef.current);
      };
    }, []),
  );
}
