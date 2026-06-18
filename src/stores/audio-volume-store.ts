import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_AUDIO_VOLUME,
  loadAudioVolumePreference,
  saveAudioVolumePreference,
} from '@/db/audio-volume-preferences';
import { getSystemVolume, isSystemVolumeAvailable, setSystemVolume } from '@/services/system-audio-volume';

const PERSIST_DEBOUNCE_MS = 300;

let volume = DEFAULT_AUDIO_VOLUME;
let persistReady = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let initPromise: Promise<void> | null = null;
let syncingFromSystem = false;

const listeners = new Set<() => void>();

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function emit() {
  listeners.forEach((listener) => listener());
}

function schedulePersist() {
  if (!persistReady) return;
  if (persistTimer != null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void saveAudioVolumePreference(volume);
  }, PERSIST_DEBOUNCE_MS);
}

function getVolumeSnapshot(): number {
  return volume;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyVolume(next: number, options?: { persist?: boolean; syncSystem?: boolean }) {
  const clamped = clampVolume(next);
  if (volume === clamped) return;
  volume = clamped;
  emit();

  if (options?.persist !== false) schedulePersist();
  if (options?.syncSystem !== false && isSystemVolumeAvailable() && !syncingFromSystem) {
    void setSystemVolume(clamped);
  }
}

/** User moved the in-app slider or we restored a saved level on web. */
export function setAudioVolume(next: number) {
  applyVolume(next);
}

/** OS media volume changed (hardware buttons or another app). */
export function setAudioVolumeFromSystem(next: number) {
  syncingFromSystem = true;
  applyVolume(next, { syncSystem: false });
  syncingFromSystem = false;
}

export function initAudioVolumeStore(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (isSystemVolumeAvailable()) {
      const systemVolume = await getSystemVolume();
      if (systemVolume != null) {
        syncingFromSystem = true;
        applyVolume(systemVolume, { persist: false, syncSystem: false });
        syncingFromSystem = false;
        persistReady = true;
        emit();
        return;
      }
    }

    const saved = await loadAudioVolumePreference();
    volume = saved;
    persistReady = true;
    emit();
  })();

  return initPromise;
}

export function useAudioVolume(): number {
  return useSyncExternalStore(subscribe, getVolumeSnapshot, getVolumeSnapshot);
}

export function useSetAudioVolume() {
  return useCallback((next: number) => setAudioVolume(next), []);
}
