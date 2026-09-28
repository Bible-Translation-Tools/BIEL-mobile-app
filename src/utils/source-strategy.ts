/** Uses the local copy when there is one; otherwise asks the remote source. */
export async function localFirst<T>(
  local: () => Promise<T | null | undefined>,
  remote: () => Promise<T>,
): Promise<T> {
  const value = await local();
  if (value != null) return value;
  return remote();
}

/** On remote failure, uses local if usable; otherwise rethrows the remote error. */
export async function networkFirst<T>(
  remote: () => Promise<T>,
  local: () => Promise<T>,
  isUsable: (value: T) => boolean,
): Promise<T> {
  try {
    return await remote();
  } catch (err) {
    const fallback = await local();
    if (isUsable(fallback)) return fallback;
    throw err;
  }
}
