import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  fontSizeForLevel,
  LINE_HEIGHT_LEVEL_MAX,
  LINE_HEIGHT_LEVEL_MIN,
  lineHeightForLevel,
  READING_TEXT_DEFAULTS,
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
  verseLayoutReportsPaused: boolean;
};

type ReadingTextSettingsActions = {
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

const ReadingTextStylesContext = createContext<ReadingTextStyles | null>(null);
const ReadingTextSettingsActionsContext = createContext<ReadingTextSettingsActions | null>(
  null,
);

const PERSIST_DEBOUNCE_MS = 300;

function clampLevel(level: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, level));
}

function buildTextStyles(
  textSizeLevel: number,
  lineHeightLevel: number,
  verseLayoutReportsPaused: boolean,
): ReadingTextStyles {
  const fontSize = fontSizeForLevel(textSizeLevel);
  const textScale = fontSize / READING_TEXT_DEFAULTS.baseFontSize;

  return {
    fontSize,
    lineHeight: lineHeightForLevel(lineHeightLevel),
    verseNumberFontSize: verseNumberFontSizeForLevel(textSizeLevel),
    footnoteMarkerFontSize: READING_TEXT_DEFAULTS.baseFootnoteMarkerFontSize * textScale,
    verseLayoutReportsPaused,
  };
}

export function ReadingTextSettingsProvider({ children }: { children: ReactNode }) {
  const [textSizeLevel, setTextSizeLevel] = useState(0);
  const [lineHeightLevel, setLineHeightLevel] = useState(0);
  const persistReadyRef = useRef(false);

  const deferredTextSizeLevel = useDeferredValue(textSizeLevel);
  const deferredLineHeightLevel = useDeferredValue(lineHeightLevel);

  const verseLayoutReportsPaused =
    deferredTextSizeLevel !== textSizeLevel ||
    deferredLineHeightLevel !== lineHeightLevel;

  const styles = useMemo(
    () => buildTextStyles(deferredTextSizeLevel, deferredLineHeightLevel, verseLayoutReportsPaused),
    [deferredTextSizeLevel, deferredLineHeightLevel, verseLayoutReportsPaused],
  );

  useEffect(() => {
    let cancelled = false;

    void loadReadingTextPreferences().then((levels) => {
      if (cancelled) return;
      startTransition(() => {
        setTextSizeLevel(levels.textSizeLevel);
        setLineHeightLevel(levels.lineHeightLevel);
      });
      persistReadyRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!persistReadyRef.current) return;

    const timer = setTimeout(() => {
      void saveReadingTextPreferences(textSizeLevel, lineHeightLevel);
    }, PERSIST_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [textSizeLevel, lineHeightLevel]);

  const increaseTextSize = useCallback(
    () =>
      startTransition(() =>
        setTextSizeLevel((level) => clampLevel(level + 1, TEXT_SIZE_LEVEL_MIN, TEXT_SIZE_LEVEL_MAX)),
      ),
    [],
  );
  const decreaseTextSize = useCallback(
    () =>
      startTransition(() =>
        setTextSizeLevel((level) => clampLevel(level - 1, TEXT_SIZE_LEVEL_MIN, TEXT_SIZE_LEVEL_MAX)),
      ),
    [],
  );
  const increaseLineHeight = useCallback(
    () =>
      startTransition(() =>
        setLineHeightLevel((level) =>
          clampLevel(level + 1, LINE_HEIGHT_LEVEL_MIN, LINE_HEIGHT_LEVEL_MAX),
        ),
      ),
    [],
  );
  const decreaseLineHeight = useCallback(
    () =>
      startTransition(() =>
        setLineHeightLevel((level) =>
          clampLevel(level - 1, LINE_HEIGHT_LEVEL_MIN, LINE_HEIGHT_LEVEL_MAX),
        ),
      ),
    [],
  );
  const reset = useCallback(() => {
    startTransition(() => {
      setTextSizeLevel(0);
      setLineHeightLevel(0);
    });
  }, []);

  const actions = useMemo<ReadingTextSettingsActions>(
    () => ({
      increaseTextSize,
      decreaseTextSize,
      increaseLineHeight,
      decreaseLineHeight,
      reset,
      canDecreaseTextSize: textSizeLevel > TEXT_SIZE_LEVEL_MIN,
      canIncreaseTextSize: textSizeLevel < TEXT_SIZE_LEVEL_MAX,
      canDecreaseLineHeight: lineHeightLevel > LINE_HEIGHT_LEVEL_MIN,
      canIncreaseLineHeight: lineHeightLevel < LINE_HEIGHT_LEVEL_MAX,
      isDefault: textSizeLevel === 0 && lineHeightLevel === 0,
    }),
    [
      textSizeLevel,
      lineHeightLevel,
      increaseTextSize,
      decreaseTextSize,
      increaseLineHeight,
      decreaseLineHeight,
      reset,
    ],
  );

  return (
    <ReadingTextSettingsActionsContext.Provider value={actions}>
      <ReadingTextStylesContext.Provider value={styles}>{children}</ReadingTextStylesContext.Provider>
    </ReadingTextSettingsActionsContext.Provider>
  );
}

export function useReadingTextStyles(): ReadingTextStyles {
  const context = useContext(ReadingTextStylesContext);
  if (context == null) {
    throw new Error('useReadingTextStyles must be used within ReadingTextSettingsProvider');
  }
  return context;
}

export function useReadingTextSettingsActions(): ReadingTextSettingsActions {
  const context = useContext(ReadingTextSettingsActionsContext);
  if (context == null) {
    throw new Error(
      'useReadingTextSettingsActions must be used within ReadingTextSettingsProvider',
    );
  }
  return context;
}

/** @deprecated Prefer useReadingTextStyles or useReadingTextSettingsActions */
export function useReadingTextSettings(): ReadingTextStyles & ReadingTextSettingsActions {
  return { ...useReadingTextStyles(), ...useReadingTextSettingsActions() };
}
