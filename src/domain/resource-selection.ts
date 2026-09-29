import type { ScriptureRendering } from '@/types/catalog';

import { normalizeBookSlug } from './book-slug';

export const RESOURCE_PRIORITY = ['ulb', 'udb', 'reg'] as const;
export const EXCLUDED_RESOURCE_TYPES = new Set(['tq', 'tn']);

type SelectableRendering = Pick<ScriptureRendering, 'resourceType' | 'bookSlug' | 'chapter'>;

/**
 * Chooses the best scriptural rendering from catalog renderings.
 *
 * Filters out `tq` and `tn` resource types, then prefers types in
 * {@link RESOURCE_PRIORITY} order (`ulb` → `udb` → `reg`). When several
 * candidates share a type, prefers the one whose `bookSlug` matches
 * `bookSlug` (case-insensitive). Falls back to the first remaining candidate
 * if no priority type matches.
 *
 * @param renderings - Renderings returned by the catalog.
 * @param options.bookSlug - Slug used to disambiguate when multiple renderings share a type.
 * @param options.requireChapter - When true, only items with a non-null `chapter` are considered (online chapter loads).
 * @returns The selected rendering, or `null` if no suitable candidate exists.
 */
export function pickRendering<T extends SelectableRendering>(
  renderings: T[],
  options?: { bookSlug?: string; requireChapter?: boolean },
): T | null {
  const requireChapter = options?.requireChapter ?? false;
  const requestedSlug = options?.bookSlug?.toLowerCase();
  const matchesSlug = (item: T) => item.bookSlug?.toLowerCase() === requestedSlug;

  let candidates = renderings.filter((item) => !EXCLUDED_RESOURCE_TYPES.has(item.resourceType));

  if (requireChapter) {
    candidates = candidates.filter((item) => item.chapter != null);
  }

  if (candidates.length === 0) return null;

  for (const resourceType of RESOURCE_PRIORITY) {
    const matches = candidates.filter((item) => item.resourceType === resourceType);
    if (matches.length === 0) continue;

    if (requestedSlug) {
      const slugMatch = matches.find(matchesSlug);
      if (slugMatch) return slugMatch;
    }

    return matches[0] ?? null;
  }

  if (requestedSlug) {
    const slugMatch = candidates.find(matchesSlug);
    if (slugMatch) return slugMatch;
  }

  return candidates[0] ?? null;
}

/** Groups renderings by normalized book slug, skipping ones without a slug. */
export function groupRenderingsByBookSlug<T extends Pick<ScriptureRendering, 'bookSlug'>>(
  renderings: readonly T[],
): Map<string, T[]> {
  const bySlug = new Map<string, T[]>();

  for (const rendering of renderings) {
    if (!rendering.bookSlug) continue;
    const slug = normalizeBookSlug(rendering.bookSlug);
    const grouped = bySlug.get(slug) ?? [];
    grouped.push(rendering);
    bySlug.set(slug, grouped);
  }

  return bySlug;
}

/** Download size of each book's preferred rendering, keyed by normalized slug. */
export function bookByteSizesFromRenderings(
  renderings: readonly ScriptureRendering[],
): Map<string, number> {
  const bytesBySlug = new Map<string, number>();

  for (const [bookSlug, bookRenderings] of groupRenderingsByBookSlug(renderings)) {
    const rendering = pickRendering(bookRenderings, { bookSlug });
    if (rendering?.fileSizeBytes != null) {
      bytesBySlug.set(bookSlug, rendering.fileSizeBytes);
    }
  }

  return bytesBySlug;
}
