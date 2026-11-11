/**
 * Playback engine adapter: the only module allowed to import `react-native-track-player`
 * (enforced in oxlint.config.ts). Everything above it — the playback session, hooks, routing —
 * talks to this engine-neutral API, so replacing the player library touches this folder only.
 */
import { Platform } from 'react-native';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';

import type { NowPlayingMetadata, PlaybackProgress, PlaybackStatus, PlaybackTrack } from './types';

export type { NowPlayingMetadata, PlaybackProgress, PlaybackStatus, PlaybackTrack } from './types';

// --- Lifecycle -------------------------------------------------------------------------------

let setupPromise: Promise<void> | null = null;

function isEngineAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** Initializes the player and its media-notification options once. No-op on web. */
export function setupPlaybackEngine(): Promise<void> {
  if (!isEngineAvailable()) return Promise.resolve();
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
      compactCapabilities: [Capability.Play, Capability.Pause],
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
    });
  })();

  return setupPromise;
}

/**
 * Registers the background service that handles lock-screen / notification controls.
 * Must run at app entry (index.js), before the router mounts.
 *
 * `getOnQueueEnded` is resolved lazily when the service starts, so the entry file does not have
 * to load the playback session eagerly.
 */
export function registerPlaybackEngineService(
  getOnQueueEnded: () => () => void | Promise<void>,
): void {
  TrackPlayer.registerPlaybackService(() => async () => {
    const onQueueEnded = getOnQueueEnded();

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
      void TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
      void TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
      void TrackPlayer.stop();
    });

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      void onQueueEnded();
    });
  });
}

/** True when an incoming URL is the engine's "user tapped the media notification" link. */
export function isEngineNotificationClick(path: string, appScheme: string): boolean {
  try {
    const url = new URL(path, `${appScheme}://`);
    return url.protocol === 'trackplayer:' && url.hostname === 'notification.click';
  } catch {
    return path.includes('trackplayer://notification.click') || path.includes('notification.click');
  }
}

// --- Commands --------------------------------------------------------------------------------

/** Replaces whatever is loaded with a single track (does not start playback). */
export async function loadTrack(track: PlaybackTrack): Promise<void> {
  await TrackPlayer.reset();
  await TrackPlayer.add(track);
}

/** Stops playback, clears the queue, and dismisses system media controls. */
export async function reset(): Promise<void> {
  await TrackPlayer.reset();
}

export async function play(): Promise<void> {
  await TrackPlayer.play();
}

export async function pause(): Promise<void> {
  await TrackPlayer.pause();
}

export async function seekTo(seconds: number): Promise<void> {
  await TrackPlayer.seekTo(seconds);
}

export async function updateNowPlaying(metadata: NowPlayingMetadata): Promise<void> {
  await TrackPlayer.updateNowPlayingMetadata(metadata);
}

// --- Queries ---------------------------------------------------------------------------------

function toPlaybackStatus(state: State | undefined): PlaybackStatus {
  if (state === State.Playing) return 'playing';
  if (state === State.Ended) return 'ended';
  return 'other';
}

export async function getPlaybackStatus(): Promise<PlaybackStatus> {
  const { state } = await TrackPlayer.getPlaybackState();
  return toPlaybackStatus(state);
}

export async function getProgress(): Promise<PlaybackProgress> {
  const { position, duration } = await TrackPlayer.getProgress();
  return { position, duration };
}

// --- React hooks -----------------------------------------------------------------------------

export function useIsPlaying(): boolean {
  return usePlaybackState().state === State.Playing;
}

export function useEngineProgress(): PlaybackProgress {
  const { position, duration } = useProgress();
  return { position, duration };
}

/** Calls `onEnded` when the loaded track finishes. */
export function useOnQueueEnded(onEnded: () => void): void {
  useTrackPlayerEvents([Event.PlaybackQueueEnded], onEnded);
}
