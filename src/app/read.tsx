import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioPlayButton } from '@/components/reading/audio-play-button';
import { ReadingToolbar } from '@/components/reading/reading-toolbar';
import { ScriptureContent } from '@/components/reading/scripture-content';
import { ReadingLayout } from '@/constants/theme';
import { useReaderScroll } from '@/hooks/use-reader-scroll';
import { useReaderToolbar } from '@/hooks/use-reader-toolbar';
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
  const { chapters, loading, loadingMore, error, hasMore, handleScroll, checkFillViewport, refetch } =
    useReaderScroll(
      languageCode,
      bookSlug,
      Number.isFinite(chapterNumber) ? chapterNumber : undefined,
    );

  const displayBookName = chapters[0]?.bookName ?? bookName ?? bookSlug;
  const { toolbarChapterTitle, updateScrollY, handleChapterLayout } = useReaderToolbar(
    chapters,
    displayBookName,
  );
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);

  const tryLoadMoreIfContentFits = useCallback(() => {
    checkFillViewport(viewportHeightRef.current, contentHeightRef.current);
  }, [checkFillViewport]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    contentHeightRef.current = contentSize.height;
    updateScrollY(contentOffset.y);
    handleScroll(contentOffset.y, layoutMeasurement.height, contentSize.height);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ReadingToolbar chapterTitle={toolbarChapterTitle} />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
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
        ) : chapters.length > 0 ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onLayout={(event) => {
              viewportHeightRef.current = event.nativeEvent.layout.height;
              tryLoadMoreIfContentFits();
            }}
            onContentSizeChange={(_, height) => {
              contentHeightRef.current = height;
              tryLoadMoreIfContentFits();
            }}
            onScroll={onScroll}
            scrollEventThrottle={16}>
            <ScriptureContent
              bookName={displayBookName}
              chapters={chapters}
              onChapterLayout={handleChapterLayout}
            />
            {loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.iconPrimary} />
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        {chapters.length > 0 ? <AudioPlayButton /> : null}
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
  footerLoader: {
    paddingVertical: ReadingLayout.contentGap,
    alignItems: 'center',
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
