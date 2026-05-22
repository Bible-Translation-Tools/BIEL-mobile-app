import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { ReadingLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChapterContent } from '@/types/reading';

export type ChapterLayoutMetrics = {
  y: number;
  height: number;
};

type ScriptureContentProps = {
  bookName: string;
  chapters: ChapterContent[];
  onChapterLayout?: (chapter: number, layout: ChapterLayoutMetrics) => void;
};

export function ScriptureContent({
  bookName,
  chapters,
  onChapterLayout,
}: ScriptureContentProps) {
  const theme = useTheme();

  const handleChapterLayout = (chapter: number) => (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    onChapterLayout?.(chapter, { y, height });
  };

  return (
    <View style={styles.container}>
      {chapters.map((chapter, chapterIndex) => (
        <View
          key={chapter.chapter}
          style={[styles.chapterBlock, chapterIndex > 0 && styles.chapterBlockSpaced]}
          onLayout={handleChapterLayout(chapter.chapter)}>
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
                  <Text
                    key={`paragraph-${chapter.chapter}-${sectionIndex}-${paragraphIndex}`}
                    style={[styles.paragraph, { color: theme.text }]}>
                    {paragraph.verses.map((verse, verseIndex) => (
                      <Text key={`verse-${chapter.chapter}-${verse.number}`}>
                        <Text style={styles.verseNumber}>{verse.number}</Text>
                        {verseIndex < paragraph.verses.length - 1 ? ' ' : ''}
                        {verse.text}
                        {verseIndex < paragraph.verses.length - 1 ? ' ' : ''}
                      </Text>
                    ))}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
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
    fontSize: 10.32,
    lineHeight: 32,
  },
});
