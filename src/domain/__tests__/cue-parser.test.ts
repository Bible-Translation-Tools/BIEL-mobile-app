import { describe, expect, it } from 'vitest';

import { parseCueVerseTimings } from '@/domain/cue-parser';

function cueSheet(options: {
  markers?: Record<string, number>;
  tracks?: [track: number, index: string][];
  eol?: string;
}): string {
  const lines: string[] = [];
  if (options.markers) {
    lines.push(
      `REM COMMENT ${JSON.stringify({ language: 'en', slug: 'gen', chapter: '01', markers: options.markers })}`,
    );
  }
  lines.push('FILE "gen_01.mp3" MP3');
  for (const [track, index] of options.tracks ?? []) {
    lines.push(`  TRACK ${String(track).padStart(2, '0')} AUDIO`);
    lines.push(`    INDEX 01 ${index}`);
  }
  return lines.join(options.eol ?? '\n');
}

describe('parseCueVerseTimings', () => {
  it('reads track start times as minutes, seconds and 1/75 s frames', () => {
    const timings = parseCueVerseTimings(
      cueSheet({
        tracks: [
          [1, '00:00:00'],
          [2, '00:12:00'],
          [3, '01:02:30'],
        ],
      }),
    );

    expect(timings).toEqual([
      { verse: 1, time: 0 },
      { verse: 2, time: 12 },
      { verse: 3, time: 62.4 },
    ]);
  });

  it('returns verses sorted even when tracks are out of order', () => {
    const timings = parseCueVerseTimings(
      cueSheet({
        tracks: [
          [3, '00:20:00'],
          [1, '00:00:00'],
          [2, '00:10:00'],
        ],
      }),
    );

    expect(timings.map((timing) => timing.verse)).toEqual([1, 2, 3]);
  });

  it('prefers the track time over the marker when a verse has both', () => {
    const timings = parseCueVerseTimings(
      cueSheet({ markers: { '2': 999_999 }, tracks: [[2, '00:10:00']] }),
    );

    expect(timings).toEqual([{ verse: 2, time: 10 }]);
  });

  it('converts markers without a track using the sample rate implied by the tracks', () => {
    // Track 2 starts at 10 s and its marker is 480000 samples, so the rate is 48 kHz.
    const timings = parseCueVerseTimings(
      cueSheet({
        markers: { '1': 0, '2': 480_000, '3': 960_000 },
        tracks: [
          [1, '00:00:00'],
          [2, '00:10:00'],
        ],
      }),
    );

    expect(timings).toEqual([
      { verse: 1, time: 0 },
      { verse: 2, time: 10 },
      { verse: 3, time: 20 },
    ]);
  });

  it('assumes 44.1 kHz when no track gives a usable sample rate', () => {
    const timings = parseCueVerseTimings(cueSheet({ markers: { '1': 0, '2': 88_200 } }));

    expect(timings).toEqual([
      { verse: 1, time: 0 },
      { verse: 2, time: 2 },
    ]);
  });

  it('ignores an implied sample rate outside 8–192 kHz', () => {
    // 1000 samples at 10 s would mean 100 Hz, which is not a real audio rate.
    const timings = parseCueVerseTimings(
      cueSheet({ markers: { '2': 1000, '3': 44_100 }, tracks: [[2, '00:10:00']] }),
    );

    expect(timings).toContainEqual({ verse: 3, time: 1 });
  });

  it('skips markers that are not verse numbers', () => {
    const timings = parseCueVerseTimings(
      cueSheet({ markers: { '0': 0, intro: 100, '1': 44_100 } }),
    );

    expect(timings).toEqual([{ verse: 1, time: 1 }]);
  });

  it('falls back to track times when the comment JSON is invalid', () => {
    const text = ['REM COMMENT {not json}', '  TRACK 01 AUDIO', '    INDEX 01 00:05:00'].join('\n');

    expect(parseCueVerseTimings(text)).toEqual([{ verse: 1, time: 5 }]);
  });

  it('handles Windows line endings', () => {
    const timings = parseCueVerseTimings(
      cueSheet({
        markers: { '1': 0, '2': 441_000 },
        tracks: [
          [1, '00:00:00'],
          [2, '00:10:00'],
        ],
        eol: '\r\n',
      }),
    );

    expect(timings).toEqual([
      { verse: 1, time: 0 },
      { verse: 2, time: 10 },
    ]);
  });

  it('uses INDEX 01 only and ignores indexes outside a track', () => {
    const text = [
      '    INDEX 01 00:30:00',
      '  TRACK 01 AUDIO',
      '    INDEX 00 00:01:00',
      '    INDEX 01 00:02:00',
    ].join('\n');

    expect(parseCueVerseTimings(text)).toEqual([{ verse: 1, time: 2 }]);
  });

  it('returns nothing for an empty sheet', () => {
    expect(parseCueVerseTimings('')).toEqual([]);
  });
});
