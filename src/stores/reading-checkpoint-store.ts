import {
  clearReadingCheckpointPreference,
  loadReadingCheckpointPreference,
  saveReadingCheckpointPreference,
} from '@/db/reading-checkpoint-preferences';
import { readingCheckpointsEqual } from '@/domain/reading-checkpoint';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

let checkpoint: ReadingCheckpoint | null = null;
let initPromise: Promise<void> | null = null;

function logWriteError(err: unknown) {
  console.warn('[reading-checkpoint] failed to write preference', err);
}

/** The checkpoint loaded at startup, or the chapter being read now. */
export function getReadingCheckpointSnapshot(): ReadingCheckpoint | null {
  return checkpoint;
}

/** Writes the checkpoint right away; an unchanged one is skipped. */
export function saveReadingCheckpoint(next: ReadingCheckpoint) {
  if (readingCheckpointsEqual(checkpoint, next)) return;
  checkpoint = next;
  saveReadingCheckpointPreference(next).catch(logWriteError);
}

/** Forgets the checkpoint; the next launch shows Home. */
export function clearReadingCheckpoint() {
  if (checkpoint == null) return;
  checkpoint = null;
  clearReadingCheckpointPreference().catch(logWriteError);
}

/** Called before any screen renders (`_layout` awaits it), so saves never race the load. */
export function initReadingCheckpointStore(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = loadReadingCheckpointPreference().then((saved) => {
    checkpoint = saved;
  });

  return initPromise;
}
