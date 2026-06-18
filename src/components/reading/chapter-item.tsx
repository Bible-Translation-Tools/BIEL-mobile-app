import { memo, useEffect, useMemo, useRef, useState } from 'react';
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
import { useReadingTextStyles } from '@/stores/reading-text-settings-store';
import type { ChapterContent, ScriptureInlinePart, ScriptureLine } from '@/types/reading';

type ChapterItemProps = {
  bookName: string;
  chapter: ChapterContent;
  isFirst?: boolean;
  highlightedVerse?: number | null;
  onRootRef?: (node: View | null) => void;
  onVerseLayout?: (chapterNumber: number, verseToY: Map<number, number>) => void;
  onVersePress?: (verse: number) => void;
};

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

export const ChapterItem = memo(function ChapterItem({
  bookName,
  chapter,
  isFirst = false,
  highlightedVerse = null,
  onRootRef,
  onVerseLayout,
  onVersePress,
}: ChapterItemProps) {
  const theme = useTheme();
  const { fontSize, lineHeight, verseNumberFontSize, footnoteMarkerFontSize } =
    useReadingTextStyles();
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
  const footnoteTextStyle = useMemo(
    () => [styles.footnoteText, { fontSize, lineHeight, color: theme.text }],
    [fontSize, lineHeight, theme.text],
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
  onVerseLayoutRef.current = onVerseLayout;

  useEffect(() => {
    verseLineYsRef.current.clear();
  }, [fontSize, lineHeight]);

  const reportVerseLayouts = () => {
    const report = onVerseLayoutRef.current;
    if (!report) return;
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
  };

  const handleParagraphTextLayout = (
    sectionIndex: number,
    paragraphIndex: number,
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    const lines = event.nativeEvent.lines;
    if (!lines || lines.length === 0) return;

    const paragraph = chapter.sections[sectionIndex]?.paragraphs[paragraphIndex];
    if (!paragraph) return;

    const verseToLineY = new Map<number, number>();
    let searchLineIdx = 0;
    let searchCharIdx = 0;

      for (const verse of paragraph.verses) {
        const superscript = toSuperscript(verse.number);
        const needle = `${VERSE_NUMBER_MARKER}${superscript}`;
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

        // Word Joiner is sometimes stripped from onTextLayout line text; fall back to
        // superscript search, skipping footnote markers (those follow a regular space).
        if (foundLineIdx === -1) {
          for (let i = searchLineIdx; i < lines.length; i += 1) {
            const startAt = i === searchLineIdx ? searchCharIdx : 0;
            let from = startAt;
            while (from < lines[i].text.length) {
              const idx = lines[i].text.indexOf(superscript, from);
              if (idx === -1) break;
              const before = idx > 0 ? lines[i].text[idx - 1] : '\n';
              if (before !== ' ') {
                foundLineIdx = i;
                foundCharIdx = idx;
                break;
              }
              from = idx + superscript.length;
            }
            if (foundLineIdx !== -1) break;
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
    reportVerseLayouts();
  };

  const handleSectionsLayout = (event: LayoutChangeEvent) => {
    sectionsContainerYRef.current = event.nativeEvent.layout.y;
    reportVerseLayouts();
  };

  const handleSectionLayout = (sectionIndex: number, event: LayoutChangeEvent) => {
    sectionYsRef.current.set(sectionIndex, event.nativeEvent.layout.y);
    reportVerseLayouts();
  };

  const handleParagraphLayout = (key: string, event: LayoutChangeEvent) => {
    paragraphYsRef.current.set(key, event.nativeEvent.layout.y);
    reportVerseLayouts();
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
            <Text style={footnoteTextStyle}>
              {activeFootnote?.text ?? ''}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});

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
    ...Typography.bodyMd,
    width: '100%',
  },
});
