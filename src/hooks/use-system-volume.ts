import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

/**
 * Reads and controls the device's system media volume.
 *
 * On Android, `addVolumeListener` reports the `music` stream volume by default,
 * matching what hardware volume buttons control during playback.
 *
 * Returns 1 on web (the library is a no-op there).
 */
export function useSystemVolume() {
  const [volume, setVolumeState] = useState(1);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    VolumeManager.getVolume()
      .then((result) => {
        if (cancelled) return;
        setVolumeState(result.volume);
      })
      .catch((err) => {
        console.warn('[volume] failed to read system volume', err);
      });

    const listener = VolumeManager.addVolumeListener((result) => {
      setVolumeState(result.volume);
    });

    return () => {
      cancelled = true;
      listener.remove();
    };
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);
    if (Platform.OS === 'web') return;
    VolumeManager.setVolume(clamped).catch((err) => {
      console.warn('[volume] failed to set system volume', err);
    });
  }, []);

  return { volume, setVolume };
}
