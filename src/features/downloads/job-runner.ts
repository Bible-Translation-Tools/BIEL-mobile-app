import { buildDownloadTaskId } from '@/domain/downloads';
import type { DownloadFailure } from '@/types/download';
import type { DownloadJob, GlobalDownloadSync } from '@/types/download-progress';
import { isAbortError } from '@/utils/run-with-concurrency';

import { partialDownloadFailure, toDownloadFailure } from './failures';
import { showDownloadFinishedNotification, syncDownloadNotification } from './notifications';
import {
  isDownloadActive,
  removeDownloadTask,
  updateDownloadTaskProgress,
  upsertDownloadTask,
} from './task-registry';

type ActiveJob = {
  sync: GlobalDownloadSync;
  controller: AbortController;
};

const activeJobs = new Map<string, ActiveJob>();

/** How long a finished task stays in the list before it is cleared. */
const FINISHED_TASK_LINGER_MS = 4500;

/** Pending "clear the finished task" timers, by task id. */
const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Drops the pending cleanup for a task. A new run of the same download owns the task from then
 * on; a cleanup left over from the previous run would remove the new run's task, which hides its
 * progress and stops the Android foreground service while it is still downloading.
 */
function cancelPendingCleanup(id: string): void {
  const timer = cleanupTimers.get(id);
  if (timer == null) {
    return;
  }
  clearTimeout(timer);
  cleanupTimers.delete(id);
}

export function cancelDownload(sync: GlobalDownloadSync): void {
  const id = buildDownloadTaskId(sync);
  activeJobs.get(id)?.controller.abort();
}

export async function runDownload(params: {
  sync: GlobalDownloadSync;
  download: DownloadJob;
  onSuccess?: () => void;
  onError?: (failure: DownloadFailure) => void;
}): Promise<void> {
  const id = buildDownloadTaskId(params.sync);
  if (isDownloadActive(params.sync) || activeJobs.has(id)) {
    return;
  }

  const controller = new AbortController();
  activeJobs.set(id, { sync: params.sync, controller });
  cancelPendingCleanup(id);

  upsertDownloadTask(params.sync, { status: 'downloading', progress: 0 });
  await syncDownloadNotification();

  const fail = async (failure: DownloadFailure) => {
    const task = upsertDownloadTask(params.sync, { status: 'failed', failure });
    await showDownloadFinishedNotification(task, false);
    params.onError?.(failure);
  };

  const cancel = async () => {
    removeDownloadTask(id);
    await syncDownloadNotification();
  };

  try {
    const outcome = await params.download({
      signal: controller.signal,
      onProgress: (progress) => {
        updateDownloadTaskProgress(id, progress);
        void syncDownloadNotification();
      },
    });

    if (outcome.status === 'cancelled') {
      await cancel();
      return;
    }
    if (outcome.status === 'partial') {
      await fail(partialDownloadFailure(outcome.failedBookSlugs));
      return;
    }

    const task = upsertDownloadTask(params.sync, { status: 'completed', progress: 1 });
    await showDownloadFinishedNotification(task, true);
    params.onSuccess?.();
  } catch (err) {
    if (isAbortError(err)) {
      await cancel();
      return;
    }
    await fail(toDownloadFailure(err));
  } finally {
    activeJobs.delete(id);
    cleanupTimers.set(
      id,
      setTimeout(() => {
        cleanupTimers.delete(id);
        removeDownloadTask(id);
        void syncDownloadNotification();
      }, FINISHED_TASK_LINGER_MS),
    );
  }
}
