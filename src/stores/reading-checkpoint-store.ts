import {
  clearReadingCheckpointPreference,
  loadReadingCheckpointPreference,
  saveReadingCheckpointPreference,
} from '@/db/reading-checkpoint-preferences';
import { readingCheckpointsEqual } from '@/domain/reading-checkpoint';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

// Scrolling through chapters or audio advancing changes the checkpoint several times in a row;
// only the last one is written.
const PERSIST_DEBOUNCE_MS = 200;
// The reader can lose focus and regain it right away; a short delay lets the refocus cancel the
// clear. This clear is the only one that runs for hardware Back and the iOS swipe-back gesture.
const CLEAR_DEBOUNCE_MS = 250;

let checkpoint: ReadingCheckpoint | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let initPromise: Promise<void> | null = null;

function logWriteError(err: unknown) {
  console.warn('[reading-checkpoint] failed to write preference', err);
}

function cancelPersistTimer() {
  if (persistTimer == null) return;
  clearTimeout(persistTimer);
  persistTimer = null;
}

function cancelClearTimer() {
  if (clearTimer == null) return;
  clearTimeout(clearTimer);
  clearTimer = null;
}

function writeCheckpoint() {
  cancelPersistTimer();
  if (checkpoint != null) saveReadingCheckpointPreference(checkpoint).catch(logWriteError);
}

/** The checkpoint loaded at startup, or the chapter being read now. */
export function getReadingCheckpointSnapshot(): ReadingCheckpoint | null {
  return checkpoint;
}

export function saveReadingCheckpoint(next: ReadingCheckpoint) {
  cancelClearTimer();
  if (readingCheckpointsEqual(checkpoint, next)) return;
  checkpoint = next;
  cancelPersistTimer();
  persistTimer = setTimeout(writeCheckpoint, PERSIST_DEBOUNCE_MS);
}

export function scheduleClearReadingCheckpoint() {
  cancelClearTimer();
  clearTimer = setTimeout(() => {
    clearTimer = null;
    cancelPersistTimer();
    if (checkpoint == null) return;
    checkpoint = null;
    clearReadingCheckpointPreference().catch(logWriteError);
  }, CLEAR_DEBOUNCE_MS);
}

export function cancelScheduledClearReadingCheckpoint() {
  cancelClearTimer();
}

/** Writes a debounced save now (the app is going to the background). */
export function flushReadingCheckpoint() {
  if (persistTimer != null) writeCheckpoint();
}

/** Called before any screen renders (`_layout` awaits it), so saves never race the load. */
export function initReadingCheckpointStore(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = loadReadingCheckpointPreference().then((saved) => {
    checkpoint = saved;
  });

  return initPromise;
}
