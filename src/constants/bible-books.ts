/** Canonical Protestant Bible book order (USFM slugs). */
export const BIBLE_BOOK_SLUGS = [
  'GEN',
  'EXO',
  'LEV',
  'NUM',
  'DEU',
  'JOS',
  'JDG',
  'RUT',
  '1SA',
  '2SA',
  '1KI',
  '2KI',
  '1CH',
  '2CH',
  'EZR',
  'NEH',
  'EST',
  'JOB',
  'PSA',
  'PRO',
  'ECC',
  'SNG',
  'ISA',
  'JER',
  'LAM',
  'EZK',
  'DAN',
  'HOS',
  'JOL',
  'AMO',
  'OBA',
  'JON',
  'MIC',
  'NAM',
  'HAB',
  'ZEP',
  'HAG',
  'ZEC',
  'MAL',
  'MAT',
  'MRK',
  'LUK',
  'JHN',
  'ACT',
  'ROM',
  '1CO',
  '2CO',
  'GAL',
  'EPH',
  'PHP',
  'COL',
  '1TH',
  '2TH',
  '1TI',
  '2TI',
  'TIT',
  'PHM',
  'HEB',
  'JAS',
  '1PE',
  '2PE',
  '1JN',
  '2JN',
  '3JN',
  'JUD',
  'REV',
] as const;

export type BibleBookSlug = (typeof BIBLE_BOOK_SLUGS)[number];

const OLD_TESTAMENT_COUNT = 39;

export const OLD_TESTAMENT_SLUGS = new Set<BibleBookSlug>(
  BIBLE_BOOK_SLUGS.slice(0, OLD_TESTAMENT_COUNT),
);

export const BOOK_SLUG_ORDER = new Map<BibleBookSlug, number>(
  BIBLE_BOOK_SLUGS.map((slug, index) => [slug, index]),
);

export function isOldTestament(slug: string): boolean {
  return OLD_TESTAMENT_SLUGS.has(slug as BibleBookSlug);
}
