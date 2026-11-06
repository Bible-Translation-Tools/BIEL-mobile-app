import { getActivePlaybackReadRoute, markNotificationResume } from '@/features/playback';
import { isEngineNotificationClick } from '@/services/playback-engine';

const APP_SCHEME = 'bielmobileapp';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (isEngineNotificationClick(path, APP_SCHEME)) {
      markNotificationResume();
      return getActivePlaybackReadRoute() ?? '/';
    }

    return path;
  } catch {
    return '/';
  }
}
