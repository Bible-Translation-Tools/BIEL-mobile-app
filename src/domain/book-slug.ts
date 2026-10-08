/** Canonical form for book slugs in storage paths, database keys and lookups. */
export function normalizeBookSlug(bookSlug: string): string {
  return bookSlug.trim().toUpperCase();
}
