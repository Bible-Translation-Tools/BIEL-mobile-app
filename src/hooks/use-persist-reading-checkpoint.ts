import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import {
  cancelScheduledClearReadingCheckpoint,
  saveReadingCheckpoint,
  scheduleClearReadingCheckpoint,
} from '@/stores/reading-checkpoint-store';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

/**
 * Keeps the open chapter saved while the reader is focused so a relaunch reopens it. Losing focus
 * (any way of leaving: toolbar Back, hardware Back, swipe-back, or a screen pushed on top) schedules
 * the clear; regaining focus cancels it. Saves are skipped while unfocused so a reader left under
 * another screen can't save itself back.
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
      cancelScheduledClearReadingCheckpoint();
      if (checkpointRef.current != null) saveReadingCheckpoint(checkpointRef.current);

      return () => {
        focusedRef.current = false;
        scheduleClearReadingCheckpoint();
      };
    }, []),
  );
}
