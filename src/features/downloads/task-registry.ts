import { buildDownloadTaskId } from '@/domain/downloads';
import type { DownloadProgressTask, GlobalDownloadSync } from '@/types/download-progress';

const listeners = new Set<() => void>();
const tasks = new Map<string, DownloadProgressTask>();
let taskList: DownloadProgressTask[] = [];

function emit() {
  taskList = [...tasks.values()];
  listeners.forEach((listener) => listener());
}

export function subscribeDownloadTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDownloadTask(id: string): DownloadProgressTask | undefined {
  return tasks.get(id);
}

export function isDownloadActive(sync: GlobalDownloadSync): boolean {
  return tasks.get(buildDownloadTaskId(sync))?.status === 'downloading';
}

export function upsertDownloadTask(
  sync: GlobalDownloadSync,
  patch: Partial<Pick<DownloadProgressTask, 'progress' | 'status' | 'failure'>>,
): DownloadProgressTask {
  const id = buildDownloadTaskId(sync);
  const existing = tasks.get(id);
  const displayName = 'bookName' in sync ? sync.bookName : sync.languageName;
  const bookSlug = 'bookSlug' in sync ? sync.bookSlug : undefined;
  const next: DownloadProgressTask = {
    id,
    languageCode: sync.languageCode,
    displayName,
    bookSlug,
    kind: sync.kind,
    progress: patch.progress ?? existing?.progress ?? 0,
    status: patch.status ?? existing?.status ?? 'downloading',
    failure: patch.failure,
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

export function removeDownloadTask(id: string) {
  if (!tasks.delete(id)) return;
  emit();
}

export function listActiveDownloadTasks(): DownloadProgressTask[] {
  return taskList.filter((task) => task.status === 'downloading');
}
