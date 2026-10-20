import { useRouter } from 'expo-router';

import { stopPlaybackBeforeLeave } from '@/hooks/use-stop-playback-on-leave';
import { clearReadingCheckpoint } from '@/stores/reading-checkpoint-store';

/** Back from the reader: stops audio, forgets the checkpoint, and goes back. */
export function useLeaveReadingScreen(): () => void {
  const router = useRouter();

  return () => {
    stopPlaybackBeforeLeave();
    clearReadingCheckpoint();
    router.back();
  };
}
