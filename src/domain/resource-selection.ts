import type { ScriptureRendering } from '@/types/catalog';

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
