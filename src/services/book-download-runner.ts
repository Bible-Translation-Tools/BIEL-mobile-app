import type { ContentDownloadHandlers } from '@/hooks/use-content-download';
import {
  showDownloadFinishedNotification,
  syncDownloadNotification,
} from '@/services/download-notification-service';
import {
  isBookDownloadActive,
  removeDownloadTask,
  updateDownloadTaskProgress,
  upsertDownloadTask,
} from '@/stores/download-progress-store';
import {
  buildBookDownloadTaskId,
  type GlobalBookDownloadSync,
} from '@/types/download-progress';

type ActiveJob = {
  sync: GlobalBookDownloadSync;
  controller: AbortController;
};

const activeJobs = new Map<string, ActiveJob>();

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function cancelGlobalBookDownload(sync: GlobalBookDownloadSync): void {
  const id = buildBookDownloadTaskId(sync);
  activeJobs.get(id)?.controller.abort();
}

export async function runGlobalBookDownload(params: {
  sync: GlobalBookDownloadSync;
  download: ContentDownloadHandlers['download'];
  errorFallback: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}): Promise<void> {
  const id = buildBookDownloadTaskId(params.sync);
  if (isBookDownloadActive(params.sync) || activeJobs.has(id)) {
    return;
  }

  const controller = new AbortController();
  activeJobs.set(id, { sync: params.sync, controller });

  upsertDownloadTask(params.sync, { status: 'downloading', progress: 0 });
  await syncDownloadNotification();

  try {
    await params.download({
      signal: controller.signal,
      onProgress: (progress) => {
        updateDownloadTaskProgress(id, progress);
        void syncDownloadNotification();
      },
    });

    const task = upsertDownloadTask(params.sync, { status: 'completed', progress: 1 });
    await showDownloadFinishedNotification(task, true);
    params.onSuccess?.();
  } catch (err) {
    if (isAbortError(err)) {
      removeDownloadTask(id);
      await syncDownloadNotification();
      return;
    }

    const message = toErrorMessage(err, params.errorFallback);
    const task = upsertDownloadTask(params.sync, {
      status: 'failed',
      errorMessage: message,
    });
    await showDownloadFinishedNotification(task, false);
    params.onError?.(message);
  } finally {
    activeJobs.delete(id);
    setTimeout(() => {
      removeDownloadTask(id);
      void syncDownloadNotification();
    }, 4500);
  }
}
