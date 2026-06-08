import { useMemo, useSyncExternalStore } from 'react';

import {
  fontSizeForLevel,
  LINE_HEIGHT_LEVEL_DEFAULT,
  LINE_HEIGHT_LEVEL_MAX,
  LINE_HEIGHT_LEVEL_MIN,
  lineHeightForLevel,
  READING_TEXT_DEFAULTS,
  TEXT_SIZE_LEVEL_DEFAULT,
  TEXT_SIZE_LEVEL_MAX,
  TEXT_SIZE_LEVEL_MIN,
  verseNumberFontSizeForLevel,
} from '@/constants/reading-text-settings';
import { loadReadingTextPreferences, saveReadingTextPreferences } from '@/db';

export type ReadingTextStyles = {
  fontSize: number;
  lineHeight: number;
  verseNumberFontSize: number;
  footnoteMarkerFontSize: number;
};

export type ReadingTextSettingsActions = {
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  increaseLineHeight: () => void;
  decreaseLineHeight: () => void;
  reset: () => void;
  canDecreaseTextSize: boolean;
  canIncreaseTextSize: boolean;
  canDecreaseLineHeight: boolean;
  canIncreaseLineHeight: boolean;
  isDefault: boolean;
};

type StoreState = {
  textSizeLevel: number;
  lineHeightLevel: number;
};

const PERSIST_DEBOUNCE_MS = 300;

let state: StoreState = {
  textSizeLevel: TEXT_SIZE_LEVEL_DEFAULT,
  lineHeightLevel: LINE_HEIGHT_LEVEL_DEFAULT,
};

function rebuildStylesSnapshot(): ReadingTextStyles {
  return buildTextStyles(state);
}

let stylesSnapshot: ReadingTextStyles = rebuildStylesSnapshot();

let persistReady = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let initPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit() {
  stylesSnapshot = rebuildStylesSnapshot();
  listeners.forEach((listener) => listener());
}

function clampLevel(level: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, level));
}

function buildTextStyles(levels: StoreState): ReadingTextStyles {
  const fontSize = fontSizeForLevel(levels.textSizeLevel);
  const textScale = fontSize / READING_TEXT_DEFAULTS.baseFontSize;

  return {
    fontSize,
    lineHeight: lineHeightForLevel(levels.lineHeightLevel),
    verseNumberFontSize: verseNumberFontSizeForLevel(levels.textSizeLevel),
    footnoteMarkerFontSize: READING_TEXT_DEFAULTS.baseFootnoteMarkerFontSize * textScale,
  };
}

function increaseTextSize() {
  setTextSizeLevel(clampLevel(state.textSizeLevel + 1, TEXT_SIZE_LEVEL_MIN, TEXT_SIZE_LEVEL_MAX));
}

function decreaseTextSize() {
  setTextSizeLevel(clampLevel(state.textSizeLevel - 1, TEXT_SIZE_LEVEL_MIN, TEXT_SIZE_LEVEL_MAX));
}

function increaseLineHeight() {
  setLineHeightLevel(
    clampLevel(state.lineHeightLevel + 1, LINE_HEIGHT_LEVEL_MIN, LINE_HEIGHT_LEVEL_MAX),
  );
}

function decreaseLineHeight() {
  setLineHeightLevel(
    clampLevel(state.lineHeightLevel - 1, LINE_HEIGHT_LEVEL_MIN, LINE_HEIGHT_LEVEL_MAX),
  );
}

function resetTextSettings() {
  setTextSizeLevel(TEXT_SIZE_LEVEL_DEFAULT);
  setLineHeightLevel(LINE_HEIGHT_LEVEL_DEFAULT);
}

function schedulePersist() {
  if (!persistReady) return;
  if (persistTimer != null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void saveReadingTextPreferences(state.textSizeLevel, state.lineHeightLevel);
  }, PERSIST_DEBOUNCE_MS);
}

function setTextSizeLevel(level: number) {
  if (state.textSizeLevel === level) return;
  state = { ...state, textSizeLevel: level };
  emit();
  schedulePersist();
}

function setLineHeightLevel(level: number) {
  if (state.lineHeightLevel === level) return;
  state = { ...state, lineHeightLevel: level };
  emit();
  schedulePersist();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getStylesSnapshot(): ReadingTextStyles {
  return stylesSnapshot;
}

function getLevelsSnapshot(): StoreState {
  return state;
}

export function initReadingTextSettingsStore(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = loadReadingTextPreferences().then((levels) => {
    state = {
      textSizeLevel: levels.textSizeLevel,
      lineHeightLevel: levels.lineHeightLevel,
    };
    stylesSnapshot = rebuildStylesSnapshot();
    persistReady = true;
    emit();
  });

  return initPromise;
}

export function useReadingTextStyles(): ReadingTextStyles {
  return useSyncExternalStore(subscribe, getStylesSnapshot, getStylesSnapshot);
}

export function useReadingTextSettingsActions(): ReadingTextSettingsActions {
  const levels = useSyncExternalStore(subscribe, getLevelsSnapshot, getLevelsSnapshot);

  return useMemo(
    () => ({
      increaseTextSize,
      decreaseTextSize,
      increaseLineHeight,
      decreaseLineHeight,
      reset: resetTextSettings,
      canDecreaseTextSize: levels.textSizeLevel > TEXT_SIZE_LEVEL_MIN,
      canIncreaseTextSize: levels.textSizeLevel < TEXT_SIZE_LEVEL_MAX,
      canDecreaseLineHeight: levels.lineHeightLevel > LINE_HEIGHT_LEVEL_MIN,
      canIncreaseLineHeight: levels.lineHeightLevel < LINE_HEIGHT_LEVEL_MAX,
      isDefault:
        levels.textSizeLevel === TEXT_SIZE_LEVEL_DEFAULT &&
        levels.lineHeightLevel === LINE_HEIGHT_LEVEL_DEFAULT,
    }),
    [levels.textSizeLevel, levels.lineHeightLevel],
  );
}

/** @deprecated Prefer useReadingTextStyles or useReadingTextSettingsActions */
export function useReadingTextSettings(): ReadingTextStyles & ReadingTextSettingsActions {
  return { ...useReadingTextStyles(), ...useReadingTextSettingsActions() };
}
