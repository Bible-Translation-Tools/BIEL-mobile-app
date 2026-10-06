import { useCallback, useSyncExternalStore } from 'react';

import { buildDownloadTaskId } from '@/domain/downloads';
import { getDownloadTask, subscribeDownloadTasks } from '@/features/downloads';
import type { GlobalDownloadSync } from '@/types/download-progress';

export function useDownloadProgress(sync: GlobalDownloadSync | undefined) {
  const id = sync ? buildDownloadTaskId(sync) : null;

  const getTaskSnapshot = useCallback(() => {
    if (!id) return undefined;
    return getDownloadTask(id);
  }, [id]);

  return useSyncExternalStore(subscribeDownloadTasks, getTaskSnapshot, () => undefined);
}
