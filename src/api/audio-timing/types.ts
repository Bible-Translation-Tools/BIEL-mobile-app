import type { VerseTiming } from '@/types/audio';

/** Supported verse-timing file formats. */
export type TimingFileFormat = 'cue' | 'json';

/**
 * Parses verse start times from a timing file payload.
 * Pick an implementation with {@link getVerseTimingParser} by format.
 */
export type VerseTimingParser = {
  parse(timingText: string): VerseTiming[];
};
