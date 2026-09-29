import { useSyncExternalStore } from 'react';

import { setNetworkBlocked } from '@/api/network';

let forceOffline = false;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isForceOffline() {
  return forceOffline;
}

export function setForceOffline(next: boolean) {
  if (forceOffline === next) return;
  forceOffline = next;
  setNetworkBlocked(next);
  emit();
}

export function useForceOffline() {
  return useSyncExternalStore(subscribe, isForceOffline, isForceOffline);
}
