import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioPlayButton } from '@/components/reading/audio-play-button';
import { ReadingToolbar } from '@/components/reading/reading-toolbar';
import { ScriptureContent } from '@/components/reading/scripture-content';
import { ReadingLayout } from '@/constants/theme';
import { useChapterContent } from '@/hooks/use-chapter-content';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function ReadingScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { languageCode, bookSlug, bookName, chapter } = useLocalSearchParams<{
    languageCode: string;
    bookSlug: string;
    bookName?: string;
    chapter: string;
  }>();

  const chapterNumber = Number.parseInt(chapter, 10);
  const { content, loading, error, refetch } = useChapterContent(
    languageCode,
    bookSlug,
    Number.isFinite(chapterNumber) ? chapterNumber : undefined,
  );

  const displayBookName = content?.bookName ?? bookName ?? bookSlug;
  const title =
    content && Number.isFinite(chapterNumber)
      ? `${displayBookName} ${chapterNumber}`
      : `${displayBookName} ${chapter}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ReadingToolbar />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.iconPrimary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.message, { color: theme.textSecondary }]}>{error}</Text>
            <Pressable onPress={refetch} accessibilityRole="button">
              <Text style={[styles.retry, { color: theme.text }]}>Tap to retry</Text>
            </Pressable>
          </View>
        ) : content ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <ScriptureContent title={title} sections={content.sections} />
          </ScrollView>
        ) : null}

        {content ? <AudioPlayButton /> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ReadingLayout.padding,
    paddingTop: ReadingLayout.padding,
    paddingBottom: ReadingLayout.scrollBottomInset,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: ReadingLayout.padding,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  retry: {
    fontSize: 16,
    fontWeight: '600',
  },
});
