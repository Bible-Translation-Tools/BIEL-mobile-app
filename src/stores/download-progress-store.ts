import { useCallback, useSyncExternalStore } from 'react';

import { buildDownloadTaskId } from '@/domain/downloads';
import {
  getDownloadTask,
  getDownloadTaskList,
  subscribeDownloadTasks,
} from '@/services/download-progress';
import type { DownloadProgressTask, GlobalDownloadSync } from '@/types/download-progress';

const EMPTY_TASKS: DownloadProgressTask[] = [];

export function useDownloadProgressStore(): DownloadProgressTask[] {
  return useSyncExternalStore(subscribeDownloadTasks, getDownloadTaskList, () => EMPTY_TASKS);
}

export function useDownloadProgress(sync: GlobalDownloadSync | undefined) {
  const id = sync ? buildDownloadTaskId(sync) : null;

  const getTaskSnapshot = useCallback(() => {
    if (!id) return undefined;
    return getDownloadTask(id);
  }, [id]);

  return useSyncExternalStore(subscribeDownloadTasks, getTaskSnapshot, () => undefined);
}
