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
