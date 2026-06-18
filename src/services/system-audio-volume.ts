import { Platform } from 'react-native';

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function isSystemVolumeAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function getSystemVolume(): Promise<number | null> {
  if (!isSystemVolumeAvailable()) return null;

  try {
    const { VolumeManager } = await import('react-native-volume-manager');
    const { volume } = await VolumeManager.getVolume();
    return clampVolume(volume);
  } catch (err) {
    console.warn('[audio] failed to read system volume', err);
    return null;
  }
}

export async function setSystemVolume(value: number): Promise<void> {
  if (!isSystemVolumeAvailable()) return;

  try {
    const { VolumeManager } = await import('react-native-volume-manager');
    await VolumeManager.setVolume(clampVolume(value), { showUI: false });
  } catch (err) {
    console.warn('[audio] failed to set system volume', err);
  }
}

export async function setNativeVolumeUiVisible(visible: boolean): Promise<void> {
  if (!isSystemVolumeAvailable()) return;

  try {
    const { VolumeManager } = await import('react-native-volume-manager');
    await VolumeManager.showNativeVolumeUI({ enabled: visible });
  } catch (err) {
    console.warn('[audio] failed to toggle native volume UI', err);
  }
}

export function subscribeSystemVolume(onChange: (volume: number) => void): () => void {
  if (!isSystemVolumeAvailable()) return () => {};

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { VolumeManager } = require('react-native-volume-manager') as typeof import('react-native-volume-manager');
    const subscription = VolumeManager.addVolumeListener((result) => {
      onChange(clampVolume(result.volume));
    });
    return () => subscription.remove();
  } catch (err) {
    console.warn('[audio] failed to subscribe to system volume', err);
    return () => {};
  }
}
