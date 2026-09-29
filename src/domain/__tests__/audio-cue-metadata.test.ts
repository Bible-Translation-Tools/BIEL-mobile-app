import { describe, expect, it } from 'vitest';

import { parseAudioCueMetadata } from '@/domain/audio-cue-metadata';

describe('parseAudioCueMetadata', () => {
  it('reads string fields and numeric markers', () => {
    const metadata = parseAudioCueMetadata(
      JSON.stringify({
        anthology: 'ot',
        language: 'en',
        version: 'ulb',
        slug: 'gen',
        book_number: '01',
        mode: 'chapter',
        chapter: '01',
        startv: '1',
        endv: '31',
        contributor: 'Narrator',
        markers: { '1': 0, '2': 441_000 },
      }),
    );

    expect(metadata).toEqual({
      anthology: 'ot',
      language: 'en',
      version: 'ulb',
      slug: 'gen',
      book_number: '01',
      mode: 'chapter',
      chapter: '01',
      startv: '1',
      endv: '31',
      contributor: 'Narrator',
      markers: { '1': 0, '2': 441_000 },
    });
  });

  it('drops fields that are not strings', () => {
    const metadata = parseAudioCueMetadata(JSON.stringify({ chapter: 1, markers: {} }));

    expect(metadata?.chapter).toBeUndefined();
    expect(metadata?.markers).toEqual({});
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['a non-object', '"text"'],
    ['null', 'null'],
    ['missing markers', JSON.stringify({ language: 'en' })],
    ['non-object markers', JSON.stringify({ markers: 5 })],
    ['a non-numeric marker', JSON.stringify({ markers: { '1': 0, '2': '10' } })],
  ])('returns null for %s', (_, json) => {
    expect(parseAudioCueMetadata(json)).toBeNull();
  });
});
