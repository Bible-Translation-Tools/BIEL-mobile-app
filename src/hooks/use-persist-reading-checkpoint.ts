import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, BackHandler } from 'react-native';

import { useLeaveReadingScreen } from '@/hooks/use-leave-reading-screen';
import {
  cancelScheduledClearReadingCheckpoint,
  flushReadingCheckpoint,
  saveReadingCheckpoint,
  scheduleClearReadingCheckpoint,
} from '@/stores/reading-checkpoint-store';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

/**
 * Keeps the open chapter saved while the reader is focused so a relaunch reopens it. Leaving the
 * reader clears it; sending the app to the background writes it right away.
 */
export function usePersistReadingCheckpoint(checkpoint: ReadingCheckpoint | null): void {
  const leaveReadingScreen = useLeaveReadingScreen();
  const checkpointRef = useRef(checkpoint);
  const leaveRef = useRef(leaveReadingScreen);

  useEffect(() => {
    checkpointRef.current = checkpoint;
    if (checkpoint != null) saveReadingCheckpoint(checkpoint);
  }, [checkpoint]);

  useEffect(() => {
    leaveRef.current = leaveReadingScreen;
  }, [leaveReadingScreen]);

  useFocusEffect(
    useCallback(() => {
      cancelScheduledClearReadingCheckpoint();
      if (checkpointRef.current != null) saveReadingCheckpoint(checkpointRef.current);

      // Android back must also replace a restored reader that has no history behind it.
      const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
        const active = checkpointRef.current;
        leaveRef.current(
          active == null
            ? undefined
            : { languageCode: active.languageCode, audioOnly: active.audioOnly },
        );
        return true;
      });

      return () => {
        backSubscription.remove();
        scheduleClearReadingCheckpoint();
      };
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'background' && nextState !== 'inactive') return;
      if (checkpointRef.current != null) saveReadingCheckpoint(checkpointRef.current);
      flushReadingCheckpoint();
    });
    return () => subscription.remove();
  }, []);
}
