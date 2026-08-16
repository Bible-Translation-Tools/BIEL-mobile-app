import { useSyncExternalStore } from 'react';

let active = false;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return active;
}

export function setDownloadsLibraryActive(next: boolean) {
  if (active === next) return;
  active = next;
  emit();
}

export function useDownloadsLibraryActive() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
