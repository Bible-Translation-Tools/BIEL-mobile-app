/**
 * For single-chapter content (text, audio, verse timings): a downloaded chapter is complete,
 * so there is nothing else to fall back to.
 */
export async function localFirst<T>(
  local: () => Promise<T | null | undefined>,
  remote: () => Promise<T>,
): Promise<T> {
  const value = await local();
  if (value != null) return value;
  return remote();
}

/**
 * For whole-book lists: the cached catalog is complete, but the fallback (what is downloaded)
 * may cover only part of the book, so it is used only when the network fails.
 */
export async function cacheFirst<T>(
  cached: () => Promise<T | null | undefined>,
  remote: () => Promise<T>,
  fallback: () => Promise<T>,
  isUsable: (value: T) => boolean,
): Promise<T> {
  const value = await cached();
  if (value != null) return value;
  try {
    return await remote();
  } catch (err) {
    const local = await fallback();
    if (isUsable(local)) return local;
    throw err;
  }
}
