/** Normalize expo-router search params that may be a string or string[]. */
export function normalizeRouteParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) return undefined;
  const single = Array.isArray(value) ? value[0] : value;
  const trimmed = single?.trim();
  return trimmed || undefined;
}
