import type { VerseTiming } from '@/types/audio';

/** Seconds back into the current verse before "previous" restarts it instead of stepping back. */
export const PREVIOUS_VERSE_RESTART_THRESHOLD = 3;
/** Small tolerance so we don't get stuck on the current marker when tapping "next". */
export const VERSE_BOUNDARY_EPSILON = 0.1;

/** Index of the last verse that has started at `position`, or -1 before the first verse. */
function findCurrentVerseIndex(verseTimings: VerseTiming[], position: number): number {
  for (let i = verseTimings.length - 1; i >= 0; i -= 1) {
    if (verseTimings[i].time <= position + VERSE_BOUNDARY_EPSILON) {
      return i;
    }
  }
  return -1;
}

/** Verse playing at `position`, or `null` when there are no timings or the first verse hasn't started. */
export function resolveCurrentVerse(verseTimings: VerseTiming[], position: number): number | null {
  let activeVerse: number | null = null;
  for (const timing of verseTimings) {
    if (timing.time > position + VERSE_BOUNDARY_EPSILON) break;
    activeVerse = timing.verse;
  }
  return activeVerse;
}

/** Timing to seek to for "next verse", or `null` when already in the last verse. */
export function findNextVerseTiming(
  verseTimings: VerseTiming[],
  position: number,
): VerseTiming | null {
  return verseTimings.find((item) => item.time > position + VERSE_BOUNDARY_EPSILON) ?? null;
}

/**
 * Timing to seek to for "previous verse": restarts the current verse when more than
 * {@link PREVIOUS_VERSE_RESTART_THRESHOLD} seconds in, otherwise steps back one verse.
 * Returns `null` when there is nowhere to go within this chapter.
 */
export function findPreviousVerseTiming(
  verseTimings: VerseTiming[],
  position: number,
): VerseTiming | null {
  if (verseTimings.length === 0) return null;

  const index = findCurrentVerseIndex(verseTimings, position);
  if (index <= 0) {
    const first = verseTimings[0];
    return position - first.time > PREVIOUS_VERSE_RESTART_THRESHOLD ? first : null;
  }

  const current = verseTimings[index];
  return position - current.time > PREVIOUS_VERSE_RESTART_THRESHOLD
    ? current
    : verseTimings[index - 1];
}
