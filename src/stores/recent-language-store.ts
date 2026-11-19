import { useSyncExternalStore } from 'react';

import {
  loadRecentLanguagePreference,
  saveRecentLanguagePreference,
} from '@/db/recent-language-preferences';

let recentLanguageCode: string | null = null;
let initPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string | null {
  return recentLanguageCode;
}

/** Code of the language last picked on Home, or null if none has been picked yet. */
export function getRecentLanguageCode(): string | null {
  return recentLanguageCode;
}

/** Remembers the language the user just picked; picking the same one again writes nothing. */
export function setRecentLanguage(code: string) {
  if (recentLanguageCode === code) return;
  recentLanguageCode = code;
  listeners.forEach((listener) => listener());
  saveRecentLanguagePreference(code).catch((err: unknown) => {
    console.warn('[recent-language] failed to write preference', err);
  });
}

export function useRecentLanguageCode(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Called before any screen renders (`_layout` awaits it), so Home shows the row on first paint. */
export function initRecentLanguageStore(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = loadRecentLanguagePreference().then((saved) => {
    // A pick made while loading wins over the stored one.
    if (recentLanguageCode == null) recentLanguageCode = saved;
  });

  return initPromise;
}
