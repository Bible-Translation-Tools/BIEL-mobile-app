import { describe, expect, it } from 'vitest';

import {
  bookByteSizesFromRenderings,
  groupRenderingsByBookSlug,
} from '@/domain/resource-selection';
import type { ScriptureRendering } from '@/types/catalog';

function rendering(overrides: Partial<ScriptureRendering>): ScriptureRendering {
  return {
    bookSlug: 'gen',
    bookName: 'Genesis',
    chapter: null,
    resourceType: 'ulb',
    contentName: 'ULB',
    url: 'https://example.test/whole.json',
    hash: null,
    fileSizeBytes: 100,
    ...overrides,
  };
}

describe('groupRenderingsByBookSlug', () => {
  it('groups by normalized slug and skips renderings without one', () => {
    const groups = groupRenderingsByBookSlug([
      rendering({ bookSlug: 'gen' }),
      rendering({ bookSlug: 'GEN ' }),
      rendering({ bookSlug: null }),
    ]);

    expect([...groups.keys()]).toEqual(['GEN']);
    expect(groups.get('GEN')).toHaveLength(2);
  });
});

describe('bookByteSizesFromRenderings', () => {
  it('uses the size of the preferred rendering for each book', () => {
    const sizes = bookByteSizesFromRenderings([
      rendering({ bookSlug: 'gen', resourceType: 'udb', fileSizeBytes: 200 }),
      rendering({ bookSlug: 'gen', resourceType: 'ulb', fileSizeBytes: 100 }),
      rendering({ bookSlug: 'exo', resourceType: 'tn', fileSizeBytes: 999 }),
    ]);

    expect(sizes).toEqual(new Map([['GEN', 100]]));
  });

  it('omits books whose preferred rendering has no size', () => {
    expect(bookByteSizesFromRenderings([rendering({ fileSizeBytes: null })]).size).toBe(0);
  });
});
