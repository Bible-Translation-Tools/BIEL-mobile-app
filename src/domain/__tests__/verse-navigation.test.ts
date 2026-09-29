import { describe, expect, it } from 'vitest';

import {
  findNextVerseTiming,
  findPreviousVerseTiming,
  resolveCurrentVerse,
} from '@/domain/verse-navigation';

const timings = [
  { verse: 1, time: 0 },
  { verse: 2, time: 10 },
  { verse: 3, time: 20 },
];

describe('resolveCurrentVerse', () => {
  it('returns the verse that has started', () => {
    expect(resolveCurrentVerse(timings, 15)).toBe(2);
  });

  it('counts a verse as started just before its marker', () => {
    expect(resolveCurrentVerse(timings, 9.95)).toBe(2);
  });

  it('returns null without timings', () => {
    expect(resolveCurrentVerse([], 5)).toBeNull();
  });
});

describe('findNextVerseTiming', () => {
  it('returns the following verse', () => {
    expect(findNextVerseTiming(timings, 12)?.verse).toBe(3);
  });

  it('returns null in the last verse', () => {
    expect(findNextVerseTiming(timings, 25)).toBeNull();
  });
});

describe('findPreviousVerseTiming', () => {
  it('restarts the current verse when well into it', () => {
    expect(findPreviousVerseTiming(timings, 15)?.verse).toBe(2);
  });

  it('steps back one verse near the start of the current verse', () => {
    expect(findPreviousVerseTiming(timings, 11)?.verse).toBe(1);
  });

  it('restarts the first verse when well into it', () => {
    expect(findPreviousVerseTiming(timings, 5)?.verse).toBe(1);
  });

  it('returns null at the very start of the chapter', () => {
    expect(findPreviousVerseTiming(timings, 1)).toBeNull();
    expect(findPreviousVerseTiming([], 1)).toBeNull();
  });
});
