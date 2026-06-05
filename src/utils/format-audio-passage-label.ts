export function formatAudioPassageLabel(
  bookName: string | undefined,
  chapter: number | null | undefined,
  verse: number | null | undefined,
): string | undefined {
  if (chapter == null) return undefined;

  const name = bookName?.trim() ?? '';
  if (verse != null) {
    return `${name} ${chapter}:${verse}`.trim();
  }

  return `${name} ${chapter}`.trim();
}
