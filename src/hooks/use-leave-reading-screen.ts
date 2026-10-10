import { useLocalSearchParams, useRouter } from 'expo-router';

import { getReadingParentHref, resolveReadingCheckpointSource } from '@/domain/reading-checkpoint';
import { stopPlaybackBeforeLeave } from '@/hooks/use-stop-playback-on-leave';
import { clearReadingCheckpoint } from '@/stores/reading-checkpoint-store';
import { normalizeRouteParam } from '@/utils/route-params';

type LeaveOverrides = { languageCode?: string; audioOnly?: boolean };

/**
 * Back from the reader: stops audio, forgets the checkpoint, and goes back. A reader restored at
 * launch has no history, so it replaces itself with the screen it was opened from.
 */
export function useLeaveReadingScreen(): (overrides?: LeaveOverrides) => void {
  const router = useRouter();
  const params = useLocalSearchParams<{
    languageCode?: string;
    audioOnly?: string;
    from?: string;
  }>();
  const languageCode = normalizeRouteParam(params.languageCode) ?? '';
  const audioOnlyParam = normalizeRouteParam(params.audioOnly);
  const audioOnly = audioOnlyParam === '1' || audioOnlyParam === 'true';
  const source = resolveReadingCheckpointSource(normalizeRouteParam(params.from));

  return (overrides?: LeaveOverrides) => {
    stopPlaybackBeforeLeave();
    clearReadingCheckpoint();

    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(
      getReadingParentHref({
        languageCode: overrides?.languageCode ?? languageCode,
        audioOnly: overrides?.audioOnly ?? audioOnly,
        source,
      }),
    );
  };
}
