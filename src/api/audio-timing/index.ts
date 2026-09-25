import { createCueVerseTimingParser } from '@/api/audio-timing/cue-parser';
import { createJsonVerseTimingParser } from '@/api/audio-timing/json-parser';
import type { TimingFileFormat, VerseTimingParser } from '@/api/audio-timing/types';

export type { TimingFileFormat, VerseTimingParser } from '@/api/audio-timing/types';

const parsers: Record<TimingFileFormat, VerseTimingParser> = {
  cue: createCueVerseTimingParser(),
  // TODO: replace stub once JSON timing files are supported end-to-end.
  json: createJsonVerseTimingParser(),
};

/** Returns the verse-timing parser for the given file format. */
export function getVerseTimingParser(format: TimingFileFormat): VerseTimingParser {
  return parsers[format];
}

/** Infers timing format from a URL or file path (query string ignored). */
export function timingFileFormatFromSource(source: string): TimingFileFormat {
  const path = source.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.json')) return 'json';
  return 'cue';
}
