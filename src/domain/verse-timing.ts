import { createCueVerseTimingParser } from '@/domain/cue-parser';
import type { TimingFileFormat, VerseTimingParser } from '@/types/audio';

const parsers: Record<TimingFileFormat, VerseTimingParser> = {
  cue: createCueVerseTimingParser(),
};

/** Returns the verse-timing parser for the given file format. */
export function getVerseTimingParser(format: TimingFileFormat): VerseTimingParser {
  return parsers[format];
}
