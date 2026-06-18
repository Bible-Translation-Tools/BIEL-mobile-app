import { useCallback, useSyncExternalStore } from 'react';

import {
  buildBookDownloadTaskId,
  type DownloadProgressTask,
  type DownloadTaskStatus,
  type GlobalBookDownloadSync,
} from '@/types/download-progress';

const listeners = new Set<() => void>();
const tasks = new Map<string, DownloadProgressTask>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Map<string, DownloadProgressTask> {
  return tasks;
}

export function getDownloadTask(id: string): DownloadProgressTask | undefined {
  return tasks.get(id);
}

export function getBookDownloadTask(sync: GlobalBookDownloadSync): DownloadProgressTask | undefined {
  return tasks.get(buildBookDownloadTaskId(sync));
}

export function isBookDownloadActive(sync: GlobalBookDownloadSync): boolean {
  return tasks.get(buildBookDownloadTaskId(sync))?.status === 'downloading';
}

export function upsertDownloadTask(
  sync: GlobalBookDownloadSync,
  patch: Partial<Pick<DownloadProgressTask, 'progress' | 'status' | 'errorMessage'>>,
): DownloadProgressTask {
  const id = buildBookDownloadTaskId(sync);
  const existing = tasks.get(id);
  const next: DownloadProgressTask = {
    id,
    languageCode: sync.languageCode,
    bookSlug: sync.bookSlug,
    bookName: sync.bookName,
    kind: sync.kind,
    progress: patch.progress ?? existing?.progress ?? 0,
    status: patch.status ?? existing?.status ?? 'downloading',
    errorMessage: patch.errorMessage,
    updatedAt: Date.now(),
  };
  tasks.set(id, next);
  emit();
  return next;
}

export function updateDownloadTaskProgress(id: string, progress: number) {
  const task = tasks.get(id);
  if (!task || task.status !== 'downloading') return;
  tasks.set(id, { ...task, progress, updatedAt: Date.now() });
  emit();
}

export function setDownloadTaskStatus(
  id: string,
  status: DownloadTaskStatus,
  errorMessage?: string,
) {
  const task = tasks.get(id);
  if (!task) return;
  tasks.set(id, {
    ...task,
    status,
    progress: status === 'completed' ? 1 : task.progress,
    errorMessage,
    updatedAt: Date.now(),
  });
  emit();
}

export function removeDownloadTask(id: string) {
  if (!tasks.delete(id)) return;
  emit();
}

export function listActiveDownloadTasks(): DownloadProgressTask[] {
  return [...tasks.values()].filter((task) => task.status === 'downloading');
}

export function useDownloadProgressStore(): DownloadProgressTask[] {
  return useSyncExternalStore(
    subscribe,
    () => [...tasks.values()],
    () => [],
  );
}

export function useBookDownloadProgress(sync: GlobalBookDownloadSync | undefined) {
  const id = sync ? buildBookDownloadTaskId(sync) : null;

  const getTaskSnapshot = useCallback(() => {
    if (!id) return undefined;
    return tasks.get(id);
  }, [id]);

  return useSyncExternalStore(subscribe, getTaskSnapshot, () => undefined);
}
