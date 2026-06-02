import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  Modal,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  type TextLayoutEventData,
  View,
} from 'react-native';

import { ReadingLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChapterContent, ScriptureInlinePart, ScriptureLine } from '@/types/reading';

type ChapterItemProps = {
  bookName: string;
  chapter: ChapterContent;
  isFirst?: boolean;
  highlightedVerse?: number | null;
  fontSize: number;
  lineHeight: number;
  verseNumberFontSize: number;
  footnoteMarkerFontSize: number;
  verseLayoutReportsPaused: boolean;
  onRootRef?: (node: View | null) => void;
  onVerseLayout?: (chapterNumber: number, verseToY: Map<number, number>) => void;
  onVersePress?: (verse: number) => void;
};

const VERSE_LAYOUT_REPORT_DEBOUNCE_MS = 80;

function chapterItemPropsAreEqual(prev: ChapterItemProps, next: ChapterItemProps): boolean {
  return (
    prev.chapter === next.chapter &&
    prev.bookName === next.bookName &&
    prev.isFirst === next.isFirst &&
    prev.highlightedVerse === next.highlightedVerse &&
    prev.fontSize === next.fontSize &&
    prev.lineHeight === next.lineHeight &&
    prev.verseNumberFontSize === next.verseNumberFontSize &&
    prev.footnoteMarkerFontSize === next.footnoteMarkerFontSize &&
    prev.verseLayoutReportsPaused === next.verseLayoutReportsPaused &&
    prev.onVersePress === next.onVersePress &&
    prev.onRootRef === next.onRootRef &&
    prev.onVerseLayout === next.onVerseLayout
  );
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

const SUPERSCRIPT_NUMBERS = Array.from({ length: 200 }, (_, value) =>
  String(value)
    .split('')
    .map((digit) => SUPERSCRIPT_DIGITS[digit] ?? digit)
    .join(''),
);

function toSuperscript(value: number): string {
  if (value >= 0 && value <= 200) {
    return SUPERSCRIPT_NUMBERS[value];
  }

  return String(value);
}

// Word Joiner (U+2060) — zero-width, no line break. Prepended to verse number
// superscripts so we can distinguish them from footnote superscripts when
// parsing line text from onTextLayout.
const VERSE_NUMBER_MARKER = '⁠';

function ChapterItemInner({
  bookName,
  chapter,
  isFirst = false,
  highlightedVerse = null,
  fontSize,
  lineHeight,
  verseNumberFontSize,
  footnoteMarkerFontSize,
  verseLayoutReportsPaused,
  onRootRef,
  onVerseLayout,
  onVersePress,
}: ChapterItemProps) {
  const theme = useTheme();
  const [activeFootnoteId, setActiveFootnoteId] = useState<string | null>(null);

  const paragraphStyle = useMemo(
    () => [styles.paragraph, { fontSize, lineHeight }],
    [fontSize, lineHeight],
  );
  const verseNumberStyle = useMemo(
    () => [styles.verseNumber, { fontSize: verseNumberFontSize, lineHeight }],
    [verseNumberFontSize, lineHeight],
  );
  const footnoteMarkerStyle = useMemo(
    () => [
      styles.footnoteMarker,
      { color: theme.tabActive, fontSize: footnoteMarkerFontSize, lineHeight },
    ],
    [footnoteMarkerFontSize, lineHeight, theme.tabActive],
  );
  const footnoteMap = useMemo(
    () => new Map(chapter.footnotes.map((note) => [note.id, note])),
    [chapter.footnotes],
  );
  const activeFootnote = activeFootnoteId ? footnoteMap.get(activeFootnoteId) : undefined;

  const sectionsContainerYRef = useRef(0);
  const sectionYsRef = useRef<Map<number, number>>(new Map());
  const paragraphYsRef = useRef<Map<string, number>>(new Map());
  // Per-paragraph map from verse number to its y offset within the paragraph
  // (i.e. the y of the line where the verse starts). Populated by onTextLayout.
  const verseLineYsRef = useRef<Map<string, Map<number, number>>>(new Map());
  const onVerseLayoutRef = useRef(onVerseLayout);
  const verseLayoutReportsPausedRef = useRef(verseLayoutReportsPaused);
  const reportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onVerseLayoutRef.current = onVerseLayout;
  verseLayoutReportsPausedRef.current = verseLayoutReportsPaused;

  useEffect(() => {
    verseLineYsRef.current.clear();
  }, [fontSize, lineHeight]);

  useEffect(
    () => () => {
      if (reportTimerRef.current != null) {
        clearTimeout(reportTimerRef.current);
      }
    },
    [],
  );

  const reportVerseLayouts = useCallback(() => {
    const report = onVerseLayoutRef.current;
    if (!report || verseLayoutReportsPausedRef.current) return;
    const verseToY = new Map<number, number>();
    chapter.sections.forEach((section, sectionIndex) => {
      const sectionY = sectionYsRef.current.get(sectionIndex) ?? 0;
      section.paragraphs.forEach((paragraph, paragraphIndex) => {
        const key = `${sectionIndex}-${paragraphIndex}`;
        const paragraphY = paragraphYsRef.current.get(key) ?? 0;
        const paragraphTop = sectionsContainerYRef.current + sectionY + paragraphY;
        const verseLineYs = verseLineYsRef.current.get(key);
        paragraph.verses.forEach((verse) => {
          const lineY = verseLineYs?.get(verse.number) ?? 0;
          verseToY.set(verse.number, paragraphTop + lineY);
        });
      });
    });
    report(chapter.chapter, verseToY);
  }, [chapter]);

  const scheduleReportVerseLayouts = useCallback(() => {
    if (verseLayoutReportsPausedRef.current) return;
    if (reportTimerRef.current != null) {
      clearTimeout(reportTimerRef.current);
    }
    reportTimerRef.current = setTimeout(() => {
      reportTimerRef.current = null;
      reportVerseLayouts();
    }, VERSE_LAYOUT_REPORT_DEBOUNCE_MS);
  }, [reportVerseLayouts]);

  useEffect(() => {
    if (!verseLayoutReportsPaused) {
      scheduleReportVerseLayouts();
    }
  }, [verseLayoutReportsPaused, scheduleReportVerseLayouts]);

  const handleParagraphTextLayout = (
    sectionIndex: number,
    paragraphIndex: number,
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    if (verseLayoutReportsPausedRef.current) return;

    const lines = event.nativeEvent.lines;
    if (!lines || lines.length === 0) return;

    const paragraph = chapter.sections[sectionIndex]?.paragraphs[paragraphIndex];
    if (!paragraph) return;

    const verseToLineY = new Map<number, number>();
    let searchLineIdx = 0;
    let searchCharIdx = 0;

    for (const verse of paragraph.verses) {
      const needle = `${VERSE_NUMBER_MARKER}${toSuperscript(verse.number)}`;
      let foundLineIdx = -1;
      let foundCharIdx = -1;

      for (let i = searchLineIdx; i < lines.length; i += 1) {
        const startAt = i === searchLineIdx ? searchCharIdx : 0;
        const idx = lines[i].text.indexOf(needle, startAt);
        if (idx !== -1) {
          foundLineIdx = i;
          foundCharIdx = idx;
          break;
        }
      }

      if (foundLineIdx === -1) {
        // Fallback: assume verse starts at the previous match's line so we
        // don't lose track of subsequent verses.
        verseToLineY.set(verse.number, lines[searchLineIdx]?.y ?? 0);
        continue;
      }

      verseToLineY.set(verse.number, lines[foundLineIdx].y);
      searchLineIdx = foundLineIdx;
      searchCharIdx = foundCharIdx + needle.length;
    }

    verseLineYsRef.current.set(`${sectionIndex}-${paragraphIndex}`, verseToLineY);
    scheduleReportVerseLayouts();
  };

  const handleSectionsLayout = (event: LayoutChangeEvent) => {
    sectionsContainerYRef.current = event.nativeEvent.layout.y;
    scheduleReportVerseLayouts();
  };

  const handleSectionLayout = (sectionIndex: number, event: LayoutChangeEvent) => {
    sectionYsRef.current.set(sectionIndex, event.nativeEvent.layout.y);
    scheduleReportVerseLayouts();
  };

  const handleParagraphLayout = (key: string, event: LayoutChangeEvent) => {
    paragraphYsRef.current.set(key, event.nativeEvent.layout.y);
    scheduleReportVerseLayouts();
  };

  const renderLineParts = (parts: ScriptureInlinePart[], verseKey: string) =>
    parts.map((part, partIndex) => {
      const partKey = `${verseKey}-part-${partIndex}`;
      if (part.type === 'text') {
        return <Text key={partKey}>{part.text}</Text>;
      }

      return (
        <Text
          key={partKey}
          style={footnoteMarkerStyle}
          onPress={() => setActiveFootnoteId(part.targetId)}>
          {' '}
          {toSuperscript(Number.parseInt(part.label, 10) || 0)}
        </Text>
      );
    });

  const renderVerseLine = (line: ScriptureLine, verseKey: string, lineIndex: number) => (
    <Text key={`${verseKey}-line-${lineIndex}`}>
      {lineIndex > 0 ? '\n' : ''}
      {line.indentLevel > 0 ? ' '.repeat(line.indentLevel * 8) : ''}
      {renderLineParts(line.parts, `${verseKey}-line-${lineIndex}`)}
    </Text>
  );

  return (
    <View
      ref={onRootRef}
      style={[styles.chapterBlock, !isFirst && styles.chapterBlockSpaced]}>
      <Text style={[styles.chapterTitle, { color: theme.text }]}>
        {bookName} {chapter.chapter}
      </Text>

      <View style={styles.sections} onLayout={handleSectionsLayout}>
        {chapter.sections.map((section, sectionIndex) => (
          <View
            key={`section-${chapter.chapter}-${sectionIndex}`}
            style={styles.section}
            onLayout={(event) => handleSectionLayout(sectionIndex, event)}>
            {section.heading ? (
              <Text style={[styles.sectionHeading, { color: theme.text }]}>
                {section.heading}
              </Text>
            ) : null}

            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <Text
                key={`paragraph-${chapter.chapter}-${sectionIndex}-${paragraphIndex}`}
                style={[paragraphStyle, { color: theme.text }]}
                onLayout={(event) =>
                  handleParagraphLayout(`${sectionIndex}-${paragraphIndex}`, event)
                }
                onTextLayout={(event) =>
                  handleParagraphTextLayout(sectionIndex, paragraphIndex, event)
                }>
                {paragraph.verses.map((verse, verseIndex) => (
                  <Text
                    key={`verse-${chapter.chapter}-${sectionIndex}-${paragraphIndex}-${verseIndex}-${verse.number}`}
                    style={verse.number === highlightedVerse ? styles.highlightedVerse : undefined}>
                    {verseIndex > 0 ? (verse.startsOnNewLine ? '\n' : ' ') : ''}
                    <Text style={verseNumberStyle}>
                      {VERSE_NUMBER_MARKER}
                      {toSuperscript(verse.number)}
                    </Text>
                    {verse.startsOnNewLine ? '' : ' '}
                    <Text
                      onPress={
                        onVersePress ? () => onVersePress(verse.number) : undefined
                      }
                      suppressHighlighting={onVersePress == null}>
                      {verse.lines.map((line, lineIndex) =>
                        renderVerseLine(
                          line,
                          `verse-${chapter.chapter}-${sectionIndex}-${paragraphIndex}-${verseIndex}-${verse.number}`,
                          lineIndex,
                        ),
                      )}
                    </Text>
                  </Text>
                ))}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <Modal
        transparent
        visible={activeFootnote != null}
        animationType="fade"
        onRequestClose={() => setActiveFootnoteId(null)}>
        <Pressable style={styles.footnoteBackdrop} onPress={() => setActiveFootnoteId(null)}>
          <Pressable
            style={[styles.footnoteTooltip, { backgroundColor: theme.backgroundElement }]}
            onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.footnoteLabel, { color: theme.text }]}>
              Footnote {activeFootnote?.label}
            </Text>
            <Text style={[styles.footnoteText, { color: theme.text }]}>
              {activeFootnote?.text ?? ''}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export const ChapterItem = memo(ChapterItemInner, chapterItemPropsAreEqual);

const styles = StyleSheet.create({
  chapterBlock: {
    gap: ReadingLayout.contentGap,
    alignItems: 'center',
    width: '100%',
  },
  chapterBlockSpaced: {
    marginTop: ReadingLayout.contentGap,
  },
  chapterTitle: {
    ...Typography.headingH4,
    textAlign: 'center',
  },
  sections: {
    width: '100%',
    gap: ReadingLayout.sectionGap,
  },
  section: {
    width: '100%',
    gap: ReadingLayout.sectionGap,
  },
  sectionHeading: {
    ...Typography.headingH7,
    width: '100%',
  },
  paragraph: {
    ...Typography.bodyMd,
    width: '100%',
    marginBottom: 16,
  },
  verseNumber: {
    ...Typography.verseNumber,
  },
  highlightedVerse: {
    backgroundColor: 'rgba(0, 91, 221, 0.12)',
  },
  footnoteMarker: {
    ...Typography.verseNumber,
    fontSize: 20,
  },
  footnoteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ReadingLayout.padding,
  },
  footnoteTooltip: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  footnoteLabel: {
    ...Typography.headingH7,
    fontWeight: '400',
  },
  footnoteText: {
    ...Typography.bodySm,
  },
});
