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

/**
 * Forgets the checkpoint, but only if it is still `owned` (the one the leaving screen saved). When
 * one checkpointed screen replaces another, the new one's save and the old one's clear can arrive in
 * either order; this keeps the old screen from wiping the new screen's checkpoint.
 */
export function clearReadingCheckpoint(owned: ReadingCheckpoint) {
  if (checkpoint == null || !readingCheckpointsEqual(checkpoint, owned)) return;
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
