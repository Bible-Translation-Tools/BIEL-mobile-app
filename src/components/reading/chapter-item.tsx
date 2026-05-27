import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ReadingLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChapterContent, ScriptureInlinePart, ScriptureLine } from '@/types/reading';

type ChapterItemProps = {
  bookName: string;
  chapter: ChapterContent;
  isFirst?: boolean;
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
    .join('')
);

function toSuperscript(value: number): string {
  if (value >= 0 && value <= 160) {
    return SUPERSCRIPT_NUMBERS[value];
  }

  return String(value);
}

function normalizeFootnoteId(value: string): string {
  return value.trim().replace(/^#/, '');
}

export function ChapterItem({ bookName, chapter, isFirst = false }: ChapterItemProps) {
  const theme = useTheme();
  const [activeFootnoteId, setActiveFootnoteId] = useState<string | null>(null);
  const footnoteMap = useMemo(
    () => new Map(chapter.footnotes.map((note) => [normalizeFootnoteId(note.id), note])),
    [chapter.footnotes],
  );
  const activeFootnote = activeFootnoteId
    ? footnoteMap.get(normalizeFootnoteId(activeFootnoteId))
    : undefined;

  const renderLineParts = (parts: ScriptureInlinePart[], verseKey: string) =>
    parts.map((part, partIndex) => {
      const partKey = `${verseKey}-part-${partIndex}`;
      if (part.type === 'text') {
        return <Text key={partKey}>{part.text}</Text>;
      }

      return (
        <Text
          key={partKey}
          style={[styles.footnoteMarker, { color: theme.tabActive }]}
          onPress={() => setActiveFootnoteId(normalizeFootnoteId(part.targetId))}>
          {toSuperscript(Number.parseInt(part.label, 10) || 0)}
        </Text>
      );
    });

  const renderVerseLine = (line: ScriptureLine, verseKey: string, lineIndex: number) => (
    <Text key={`${verseKey}-line-${lineIndex}`}>
      {lineIndex > 0 ? '\n' : ''}
      {line.indentLevel > 0 ? ' '.repeat(line.indentLevel * 4) : ''}
      {renderLineParts(line.parts, `${verseKey}-line-${lineIndex}`)}
    </Text>
  );

  return (
    <View style={[styles.chapterBlock, !isFirst && styles.chapterBlockSpaced]}>
      <Text style={[styles.chapterTitle, { color: theme.text }]}>
        {bookName} {chapter.chapter}
      </Text>

      <View style={styles.sections}>
        {chapter.sections.map((section, sectionIndex) => (
          <View key={`section-${chapter.chapter}-${sectionIndex}`} style={styles.section}>
            {section.heading ? (
              <Text style={[styles.sectionHeading, { color: theme.text }]}>
                {section.heading}
              </Text>
            ) : null}

            {section.paragraphs.map((paragraph, paragraphIndex) => (
              // Poetry paragraphs render in block layout so markers can be absolutely positioned.
              paragraph.verses.some((verse) => verse.startsOnNewLine) ? (
                <View
                  key={`paragraph-${chapter.chapter}-${sectionIndex}-${paragraphIndex}`}
                  style={styles.poetryParagraph}>
                  {paragraph.verses.map((verse, verseIndex) => (
                    <View
                      key={`verse-${chapter.chapter}-${sectionIndex}-${paragraphIndex}-${verseIndex}-${verse.number}`}
                      style={styles.poetryVerseBlock}>
                      <Text style={[styles.verseNumber, styles.verseNumberAnchored]}>
                        {toSuperscript(verse.number)}
                      </Text>
                      <Text style={[styles.paragraph, styles.poetryVerseText, { color: theme.text }]}>
                        {verse.lines.map((line, lineIndex) =>
                          renderVerseLine(
                            line,
                            `verse-${chapter.chapter}-${sectionIndex}-${paragraphIndex}-${verseIndex}-${verse.number}`,
                            lineIndex,
                          ),
                        )}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                // Prose paragraphs keep inline text flow with inline verse markers.
                <Text
                  key={`paragraph-${chapter.chapter}-${sectionIndex}-${paragraphIndex}`}
                  style={[styles.paragraph, { color: theme.text }]}>
                  {paragraph.verses.map((verse, verseIndex) => (
                    <Text
                      key={`verse-${chapter.chapter}-${sectionIndex}-${paragraphIndex}-${verseIndex}-${verse.number}`}>
                      {verseIndex > 0 ? ' ' : ''}
                      <Text style={styles.verseNumber}>{toSuperscript(verse.number)}</Text>{' '}
                      {verse.lines.map((line, lineIndex) =>
                        renderVerseLine(
                          line,
                          `verse-${chapter.chapter}-${sectionIndex}-${paragraphIndex}-${verseIndex}-${verse.number}`,
                          lineIndex,
                        ),
                      )}
                    </Text>
                  ))}
                </Text>
              )
            ))}
          </View>
        ))}
      </View>

      <Modal
        transparent
        visible={activeFootnoteId != null}
        animationType="fade"
        onRequestClose={() => setActiveFootnoteId(null)}>
        <View style={styles.footnoteBackdrop}>
          <Pressable style={styles.footnoteBackdropTapZone} onPress={() => setActiveFootnoteId(null)} />
          <View style={[styles.footnoteTooltip, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.footnoteLabel, { color: theme.text }]}>
              Footnote {activeFootnote?.label}
            </Text>
            <Text style={[styles.footnoteText, { color: theme.text }]}>
              {activeFootnote?.text ?? 'No footnote content found for this marker.'}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
    fontSize: 18,
  },
  poetryParagraph: {
    marginBottom: 16,
    gap: 4,
  },
  poetryVerseBlock: {
    position: 'relative',
  },
  verseNumberAnchored: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
  },
  poetryVerseText: {
    marginBottom: 0,
    paddingLeft: 20,
  },
  footnoteMarker: {
    ...Typography.verseNumber,
    fontSize: 22,
  },
  footnoteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ReadingLayout.padding,
  },
  footnoteBackdropTapZone: {
    ...StyleSheet.absoluteFillObject,
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
