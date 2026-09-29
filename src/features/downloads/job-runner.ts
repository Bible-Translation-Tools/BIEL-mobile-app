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
    setTimeout(() => {
      removeDownloadTask(id);
      void syncDownloadNotification();
    }, 4500);
  }
}
