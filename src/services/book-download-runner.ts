import { buildDownloadTaskId } from '@/domain/downloads';
import {
  showDownloadFinishedNotification,
  syncDownloadNotification,
} from '@/services/download-notification-service';
import {
  isDownloadActive,
  removeDownloadTask,
  updateDownloadTaskProgress,
  upsertDownloadTask,
} from '@/services/download-progress';
import type { DownloadJob, GlobalDownloadSync } from '@/types/download-progress';
import { isAbortError } from '@/utils/run-with-concurrency';

type ActiveJob = {
  sync: GlobalDownloadSync;
  controller: AbortController;
};

const activeJobs = new Map<string, ActiveJob>();

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function cancelGlobalBookDownload(sync: GlobalDownloadSync): void {
  const id = buildDownloadTaskId(sync);
  activeJobs.get(id)?.controller.abort();
}

export async function runGlobalBookDownload(params: {
  sync: GlobalDownloadSync;
  download: DownloadJob;
  errorFallback: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}): Promise<void> {
  const id = buildDownloadTaskId(params.sync);
  if (isDownloadActive(params.sync) || activeJobs.has(id)) {
    return;
  }

  const controller = new AbortController();
  activeJobs.set(id, { sync: params.sync, controller });

  upsertDownloadTask(params.sync, { status: 'downloading', progress: 0 });
  await syncDownloadNotification();

  const fail = async (message: string) => {
    const task = upsertDownloadTask(params.sync, {
      status: 'failed',
      errorMessage: message,
    });
    await showDownloadFinishedNotification(task, false);
    params.onError?.(message);
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
      await fail(params.errorFallback);
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
    await fail(toErrorMessage(err, params.errorFallback));
  } finally {
    activeJobs.delete(id);
    setTimeout(() => {
      removeDownloadTask(id);
      void syncDownloadNotification();
    }, 4500);
  }
}
