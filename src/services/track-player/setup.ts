import { Platform } from 'react-native';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';

let setupPromise: Promise<void> | null = null;

export function isTrackPlayerAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function setupTrackPlayer(): Promise<void> {
  if (!isTrackPlayerAvailable()) return Promise.resolve();
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
      compactCapabilities: [Capability.Play, Capability.Pause],
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
    });
  })();

  return setupPromise;
}
