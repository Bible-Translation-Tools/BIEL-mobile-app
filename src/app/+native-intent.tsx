import {
  getActivePlaybackReadRoute,
  markNotificationResume,
} from '@/services/track-player/chapter-playback';

const APP_SCHEME = 'bielmobileapp';

function isTrackPlayerNotificationClick(path: string): boolean {
  try {
    const url = new URL(path, `${APP_SCHEME}://`);
    return url.protocol === 'trackplayer:' && url.hostname === 'notification.click';
  } catch {
    return (
      path.includes('trackplayer://notification.click') ||
      path.includes('notification.click')
    );
  }
}

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    if (isTrackPlayerNotificationClick(path)) {
      markNotificationResume();
      return getActivePlaybackReadRoute() ?? '/';
    }

    return path;
  } catch {
    return '/';
  }
}
