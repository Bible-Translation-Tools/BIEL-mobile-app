import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDownloadTaskId } from '@/domain/downloads';
import { missingAudioChaptersError } from '@/features/downloads/failures';
import { cancelDownload, runDownload } from '@/features/downloads/job-runner';
import {
  showDownloadFinishedNotification,
  syncDownloadNotification,
} from '@/features/downloads/notifications';
import { getDownloadTask } from '@/features/downloads/task-registry';
import type { DownloadOutcome } from '@/types/download';
import type { DownloadJob, GlobalBookDownloadSync } from '@/types/download-progress';
import { createAbortError } from '@/utils/run-with-concurrency';

vi.mock('@/features/downloads/notifications', () => ({
  showDownloadFinishedNotification: vi.fn(async () => {}),
  syncDownloadNotification: vi.fn(async () => {}),
}));

const sync: GlobalBookDownloadSync = {
  languageCode: 'en',
  bookSlug: 'gen',
  bookName: 'Genesis',
  kind: 'book-audio',
};
const taskId = buildDownloadTaskId(sync);

function resolvesWith(outcome: DownloadOutcome): DownloadJob {
  return async () => outcome;
}

/** A download that stays in progress until the test finishes it. */
function controllableDownload() {
  let finish!: (outcome: DownloadOutcome) => void;
  let reportProgress!: (progress: number) => void;
  const download = vi.fn<DownloadJob>(
    ({ onProgress }) =>
      new Promise((resolve) => {
        finish = resolve;
        reportProgress = onProgress;
      }),
  );
  return {
    download,
    finish: (outcome: DownloadOutcome) => finish(outcome),
    reportProgress: (progress: number) => reportProgress(progress),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});

describe('runDownload', () => {
  it('marks a completed download as completed and calls onSuccess', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await runDownload({ sync, download: resolvesWith({ status: 'completed' }), onSuccess, onError });

    expect(getDownloadTask(taskId)).toMatchObject({ status: 'completed', progress: 1 });
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
    expect(showDownloadFinishedNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: taskId }),
      true,
    );
  });

  it('shows progress while the download runs', async () => {
    const job = controllableDownload();
    const running = runDownload({ sync, download: job.download });
    await vi.waitFor(() => expect(job.download).toHaveBeenCalled());

    expect(getDownloadTask(taskId)).toMatchObject({ status: 'downloading', progress: 0 });
    job.reportProgress(0.4);
    expect(getDownloadTask(taskId)?.progress).toBe(0.4);
    expect(syncDownloadNotification).toHaveBeenCalled();

    job.finish({ status: 'completed' });
    await running;
  });

  it('removes the task when the download reports cancelled', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await runDownload({ sync, download: resolvesWith({ status: 'cancelled' }), onSuccess, onError });

    expect(getDownloadTask(taskId)).toBeUndefined();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(showDownloadFinishedNotification).not.toHaveBeenCalled();
  });

  it('treats a thrown abort error as a cancellation', async () => {
    const onError = vi.fn();

    await runDownload({
      sync,
      download: async () => {
        throw createAbortError();
      },
      onError,
    });

    expect(getDownloadTask(taskId)).toBeUndefined();
    expect(onError).not.toHaveBeenCalled();
  });

  it('fails a partial download with the number of failed books', async () => {
    const onError = vi.fn();

    await runDownload({
      sync,
      download: resolvesWith({ status: 'partial', failedBookSlugs: ['GEN', 'EXO'] }),
      onError,
    });

    const failure = { reason: 'failed-books', count: 2 };
    expect(getDownloadTask(taskId)).toMatchObject({ status: 'failed', failure });
    expect(onError).toHaveBeenCalledWith(failure);
    expect(showDownloadFinishedNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: taskId }),
      false,
    );
  });

  it('fails with the missing chapters when audio is incomplete', async () => {
    const onError = vi.fn();

    await runDownload({
      sync,
      download: async () => {
        throw missingAudioChaptersError([3, 1]);
      },
      onError,
    });

    expect(onError).toHaveBeenCalledWith({ reason: 'missing-audio-chapters', chapters: [1, 3] });
  });

  it('fails with the raw message of any other error', async () => {
    const onError = vi.fn();

    await runDownload({
      sync,
      download: async () => {
        throw new Error('Failed to download audio (500)');
      },
      onError,
    });

    const failure = { reason: 'error', message: 'Failed to download audio (500)' };
    expect(getDownloadTask(taskId)).toMatchObject({ status: 'failed', failure });
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('ignores a second run of the same download while the first is active', async () => {
    const first = controllableDownload();
    const second = vi.fn(resolvesWith({ status: 'completed' }));

    const running = runDownload({ sync, download: first.download });
    await vi.waitFor(() => expect(first.download).toHaveBeenCalled());
    await runDownload({ sync, download: second });

    expect(second).not.toHaveBeenCalled();

    first.finish({ status: 'completed' });
    await running;
  });

  it('clears a finished task from the list after a few seconds', async () => {
    await runDownload({
      sync,
      download: async () => {
        throw new Error('boom');
      },
    });
    expect(getDownloadTask(taskId)?.status).toBe('failed');

    vi.advanceTimersByTime(4500);

    expect(getDownloadTask(taskId)).toBeUndefined();
  });
});

describe('cancelDownload', () => {
  it('aborts the running download so its task is removed', async () => {
    const download = vi.fn<DownloadJob>(
      ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(createAbortError()));
        }),
    );

    const running = runDownload({ sync, download });
    await vi.waitFor(() => expect(download).toHaveBeenCalled());
    cancelDownload(sync);
    await running;

    expect(download.mock.calls[0]![0].signal.aborted).toBe(true);
    expect(getDownloadTask(taskId)).toBeUndefined();
  });
});
