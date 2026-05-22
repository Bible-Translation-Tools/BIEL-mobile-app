import { StyleSheet, Text, View } from 'react-native';

import { ReadingLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ScriptureSection } from '@/types/reading';

type ScriptureContentProps = {
  title: string;
  sections: ScriptureSection[];
};

export function ScriptureContent({ title, sections }: ScriptureContentProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.chapterTitle, { color: theme.text }]}>{title}</Text>

      <View style={styles.sections}>
        {sections.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.section}>
            {section.heading ? (
              <Text style={[styles.sectionHeading, { color: theme.text }]}>{section.heading}</Text>
            ) : null}

            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <Text
                key={`paragraph-${sectionIndex}-${paragraphIndex}`}
                style={[styles.paragraph, { color: theme.text }]}>
                {paragraph.verses.map((verse, verseIndex) => (
                  <Text key={`verse-${verse.number}`}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    gap: ReadingLayout.contentGap,
    alignItems: 'center',
    width: '100%',
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
