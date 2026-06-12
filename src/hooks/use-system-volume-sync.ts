import { useEffect } from 'react';

import {
  getSystemVolume,
  setNativeVolumeUiVisible,
  subscribeSystemVolume,
} from '@/services/system-audio-volume';
import { setAudioVolumeFromSystem } from '@/stores/audio-volume-store';

/**
 * Keeps the in-app volume slider aligned with OS media volume while audio UI is visible.
 * Uses a custom slider instead of the native volume HUD on Android; iOS still reflects changes.
 */
export function useSystemVolumeSync(active: boolean) {
  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    void (async () => {
      await setNativeVolumeUiVisible(false);
      const current = await getSystemVolume();
      if (!cancelled && current != null) setAudioVolumeFromSystem(current);
    })();

    const unsubscribe = subscribeSystemVolume((volume) => {
      if (!cancelled) setAudioVolumeFromSystem(volume);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      void setNativeVolumeUiVisible(true);
    };
  }, [active]);
}
