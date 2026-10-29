import { useRouter } from 'expo-router';

import { stopPlaybackBeforeLeave } from '@/hooks/use-stop-playback-on-leave';

/**
 * Back from the reader: stops audio and goes back. The checkpoint is cleared when the reader loses
 * focus (`usePersistReadingCheckpoint`), which also covers hardware Back and swipe-back.
 */
export function useLeaveReadingScreen(): () => void {
  const router = useRouter();

  return () => {
    stopPlaybackBeforeLeave();
    router.back();
  };
}
