import {
  clearReadingCheckpointPreference,
  loadReadingCheckpointPreference,
  saveReadingCheckpointPreference,
} from '@/db/reading-checkpoint-preferences';
import { readingCheckpointsEqual } from '@/domain/reading-checkpoint';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

// The reader can lose focus and regain it right away; a short delay lets the refocus cancel the
// clear.
const CLEAR_DEBOUNCE_MS = 250;

let checkpoint: ReadingCheckpoint | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let initPromise: Promise<void> | null = null;

function logWriteError(err: unknown) {
  console.warn('[reading-checkpoint] failed to write preference', err);
}

function cancelClearTimer() {
  if (clearTimer == null) return;
  clearTimeout(clearTimer);
  clearTimer = null;
}

/** The checkpoint loaded at startup, or the chapter being read now. */
export function getReadingCheckpointSnapshot(): ReadingCheckpoint | null {
  return checkpoint;
}

/** Writes the checkpoint right away; an unchanged one is skipped. */
export function saveReadingCheckpoint(next: ReadingCheckpoint) {
  cancelClearTimer();
  if (readingCheckpointsEqual(checkpoint, next)) return;
  checkpoint = next;
  saveReadingCheckpointPreference(next).catch(logWriteError);
}

export function scheduleClearReadingCheckpoint() {
  cancelClearTimer();
  clearTimer = setTimeout(() => {
    clearTimer = null;
    if (checkpoint == null) return;
    checkpoint = null;
    clearReadingCheckpointPreference().catch(logWriteError);
  }, CLEAR_DEBOUNCE_MS);
}

export function cancelScheduledClearReadingCheckpoint() {
  cancelClearTimer();
}

/** Called before any screen renders (`_layout` awaits it), so saves never race the load. */
export function initReadingCheckpointStore(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = loadReadingCheckpointPreference().then((saved) => {
    checkpoint = saved;
  });

  return initPromise;
}
