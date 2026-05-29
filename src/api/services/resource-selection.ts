export const RESOURCE_PRIORITY = ['ulb', 'udb', 'reg'] as const;
export const EXCLUDED_RESOURCE_TYPES = new Set(['tq', 'tn']);

type RenderingWithResource = {
  book_slug?: string;
  rendered_content: {
    content: {
      resource_type: string;
    };
  };
};

/**
 * Chooses the best scriptural rendering from WA catalog metadata.
 *
 * Filters out `tq` and `tn` resource types, then prefers types in
 * {@link RESOURCE_PRIORITY} order (`ulb` → `udb` → `reg`). When several
 * candidates share a type, prefers the one whose `book_slug` matches
 * `bookSlug` (case-insensitive). Falls back to the first remaining candidate
 * if no priority type matches.
 *
 * @param renderings - Scriptural rendering metadata from a GraphQL query.
 * @param options.bookSlug - Slug used to disambiguate when multiple renderings share a type.
 * @param options.requireChapter - When true, only items with a non-null `chapter` are considered (online chapter loads).
 * @returns The selected rendering, or `null` if no suitable candidate exists.
 */
export function pickRendering<T extends RenderingWithResource>(
  renderings: T[],
  options?: { bookSlug?: string; requireChapter?: boolean },
): T | null {
  const requireChapter = options?.requireChapter ?? false;
  const requestedSlug = options?.bookSlug?.toLowerCase();

  let candidates = renderings.filter(
    (item) => !EXCLUDED_RESOURCE_TYPES.has(item.rendered_content.content.resource_type),
  );

  if (requireChapter) {
    candidates = candidates.filter(
      (item) => 'chapter' in item && (item as { chapter?: number | null }).chapter != null,
    );
  }

  if (candidates.length === 0) return null;

  for (const resourceType of RESOURCE_PRIORITY) {
    const matches = candidates.filter(
      (item) => item.rendered_content.content.resource_type === resourceType,
    );
    if (matches.length === 0) continue;

    if (requestedSlug) {
      const slugMatch = matches.find(
        (item) => item.book_slug?.toLowerCase() === requestedSlug,
      );
      if (slugMatch) return slugMatch;
    }

    return matches[0] ?? null;
  }

  if (requestedSlug) {
    const slugMatch = candidates.find((item) => item.book_slug?.toLowerCase() === requestedSlug);
    if (slugMatch) return slugMatch;
  }

  return candidates[0] ?? null;
}
