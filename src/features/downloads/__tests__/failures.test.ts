import { describe, expect, it } from 'vitest';

import {
    missingAudioChaptersError,
    partialDownloadFailure,
    toDownloadFailure,
} from '@/features/downloads/failures';

describe('toDownloadFailure', () => {
  it('reads missing chapters back from the thrown error, deduped and sorted', () => {
    expect(toDownloadFailure(missingAudioChaptersError([5, 2, 5]))).toEqual({
      reason: 'missing-audio-chapters',
      chapters: [2, 5],
    });
  });

  it('keeps the raw message of other errors', () => {
    expect(toDownloadFailure(new Error('Failed to download audio (500)'))).toEqual({
      reason: 'error',
      message: 'Failed to download audio (500)',
    });
  });

  it('has no message for non-Error values', () => {
    expect(toDownloadFailure('boom')).toEqual({ reason: 'error', message: undefined });
  });
});
describe('partialDownloadFailure', () => {
  it('counts the failed books', () => {
    expect(partialDownloadFailure(['GEN', 'EXO'])).toEqual({ reason: 'failed-books', count: 2 });
  });
});

