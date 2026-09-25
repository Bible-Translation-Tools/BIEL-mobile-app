import type { VerseTimingParser } from '@/api/audio-timing/types';
import type { VerseTiming } from '@/types/audio';

/**
 * JSON timing-file parser.
 * TODO: implement once BIEL ships verse timings as standalone JSON.
 */
export function createJsonVerseTimingParser(): VerseTimingParser {
  return {
    parse(_timingText: string): VerseTiming[] {
      throw new Error('JSON verse timing parser is not implemented yet');
    },
  };
}
