import {
  clearReadingCheckpointPreference,
  loadReadingCheckpointPreference,
  saveReadingCheckpointPreference,
} from '@/db/reading-checkpoint-preferences';
import { readingCheckpointsEqual } from '@/domain/reading-checkpoint';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

const PERSIST_DEBOUNCE_MS = 200;
// The reader blurs before the next screen shows; a short delay lets a reader that regains focus
// (for example after a modal) cancel the clear.
const CLEAR_DEBOUNCE_MS = 250;

let checkpoint: ReadingCheckpoint | null = null;
let persistReady = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let initPromise: Promise<void> | null = null;
let pendingWrite: 'save' | 'clear' | null = null;

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

function writePending() {
  if (!persistReady || pendingWrite == null) return;
  const action = pendingWrite;
  pendingWrite = null;
  if (action === 'clear' || checkpoint == null) {
    void clearReadingCheckpointPreference();
  } else {
    void saveReadingCheckpointPreference(checkpoint);
  }
}

function schedulePersist() {
  pendingWrite = 'save';
  if (!persistReady) return;
  cancelPersistTimer();
  persistTimer = setTimeout(() => {
    persistTimer = null;
    writePending();
  }, PERSIST_DEBOUNCE_MS);
}

/** The checkpoint loaded at startup, or the chapter being read now. */
export function getReadingCheckpointSnapshot(): ReadingCheckpoint | null {
  return checkpoint;
}

export function saveReadingCheckpoint(next: ReadingCheckpoint) {
  cancelClearTimer();
  if (readingCheckpointsEqual(checkpoint, next) && pendingWrite !== 'clear') return;
  checkpoint = next;
  schedulePersist();
}

export function clearReadingCheckpoint() {
  cancelClearTimer();
  cancelPersistTimer();
  if (checkpoint == null && pendingWrite !== 'save') return;
  checkpoint = null;
  pendingWrite = 'clear';
  writePending();
}

export function scheduleClearReadingCheckpoint() {
  cancelClearTimer();
  clearTimer = setTimeout(() => {
    clearTimer = null;
    clearReadingCheckpoint();
  }, CLEAR_DEBOUNCE_MS);
}

export function cancelScheduledClearReadingCheckpoint() {
  cancelClearTimer();
}

/** Writes a debounced change now (the app is going to the background). */
export function flushReadingCheckpoint() {
  cancelPersistTimer();
  writePending();
}

export function initReadingCheckpointStore(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = loadReadingCheckpointPreference().then((saved) => {
    checkpoint = saved;
    persistReady = true;
  });

  return initPromise;
}
