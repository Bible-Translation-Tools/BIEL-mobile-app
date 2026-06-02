export const READING_TEXT_DEFAULTS = {
  baseFontSize: 16,
  baseLineHeight: 32,
  baseFootnoteMarkerFontSize: 20,
} as const;

export const VERSE_NUMBER_FONT_SIZE_DEFAULT = 18;
export const VERSE_NUMBER_FONT_SIZE_MIN = 16;
export const VERSE_NUMBER_FONT_SIZE_MAX = 32;
export const VERSE_NUMBER_FONT_SIZE_STEP = 2;

export const TEXT_SIZE_LEVEL_MIN = -5;
export const TEXT_SIZE_LEVEL_MAX = 10;
export const TEXT_SIZE_STEP = 2;

export const LINE_HEIGHT_LEVEL_MIN = -3;
export const LINE_HEIGHT_LEVEL_MAX = 3;
export const LINE_HEIGHT_STEP = 4;

export function fontSizeForLevel(level: number): number {
  return READING_TEXT_DEFAULTS.baseFontSize + level * TEXT_SIZE_STEP;
}

export function lineHeightForLevel(level: number): number {
  return READING_TEXT_DEFAULTS.baseLineHeight + level * LINE_HEIGHT_STEP;
}

export function verseNumberFontSizeForLevel(textSizeLevel: number): number {
  const size = VERSE_NUMBER_FONT_SIZE_DEFAULT + textSizeLevel * VERSE_NUMBER_FONT_SIZE_STEP;
  return Math.min(
    VERSE_NUMBER_FONT_SIZE_MAX,
    Math.max(VERSE_NUMBER_FONT_SIZE_MIN, size),
  );
}
