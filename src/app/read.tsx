import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type FlatList as FlatListType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioPlayButton } from '@/components/reading/audio-play-button';
import { ChapterItem } from '@/components/reading/chapter-item';
import { ReadingToolbar } from '@/components/reading/reading-toolbar';
import { ReadingLayout } from '@/constants/theme';
import { useReaderScroll } from '@/hooks/use-reader-scroll';
import { useReaderToolbar } from '@/hooks/use-reader-toolbar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { ChapterContent } from '@/types/reading';

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
  const {
    chapters,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    handleScroll,
    checkFillViewport,
    initialScrollIndex,
    clearInitialScrollIndex,
    refetch,
  } = useReaderScroll(
    languageCode,
    bookSlug,
    Number.isFinite(chapterNumber) ? chapterNumber : undefined,
  );

  const displayBookName =
    chapters.find((item) => item.chapter === chapterNumber)?.bookName ??
    chapters[0]?.bookName ??
    bookName ??
    bookSlug;

  const { toolbarChapterTitle, updateScrollY, onViewableItemsChanged, viewabilityConfig } =
    useReaderToolbar(displayBookName);

  const listRef = useRef<FlatListType<ChapterContent>>(null);
  const didInitialScrollRef = useRef(false);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);

  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [languageCode, bookSlug, chapterNumber]);

  const scrollToInitialChapter = useCallback(
    (index: number) => {
      listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 });
      didInitialScrollRef.current = true;
      clearInitialScrollIndex();
    },
    [clearInitialScrollIndex],
  );

  useEffect(() => {
    if (loading || chapters.length === 0 || didInitialScrollRef.current) return;
    if (initialScrollIndex == null || initialScrollIndex <= 0) {
      didInitialScrollRef.current = true;
      clearInitialScrollIndex();
      return;
    }

    requestAnimationFrame(() => scrollToInitialChapter(initialScrollIndex));
  }, [loading, chapters, initialScrollIndex, clearInitialScrollIndex, scrollToInitialChapter]);

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: Math.max(0, info.averageItemLength * info.index),
        animated: false,
      });

      setTimeout(() => {
        if (!didInitialScrollRef.current) {
          scrollToInitialChapter(info.index);
        }
      }, 100);
    },
    [scrollToInitialChapter],
  );

  const tryLoadMoreIfContentFits = useCallback(() => {
    checkFillViewport(viewportHeightRef.current, contentHeightRef.current);
  }, [checkFillViewport]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize } = event.nativeEvent;
    contentHeightRef.current = contentSize.height;
    updateScrollY(contentOffset.y);
    handleScroll(contentOffset.y);
  };

  const onEndReached = useCallback(() => {
    if (hasMore) {
      loadMore();
    }
  }, [hasMore, loadMore]);

  const renderItem = useCallback(
    ({ item, index }: { item: ChapterContent; index: number }) => (
      <ChapterItem bookName={displayBookName} chapter={item} isFirst={index === 0} />
    ),
    [displayBookName],
  );

  const keyExtractor = useCallback((item: ChapterContent) => String(item.chapter), []);

  const ListFooter = loadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={theme.iconPrimary} />
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ReadingToolbar chapterTitle={toolbarChapterTitle} />

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
          <FlatList
            ref={listRef}
            data={chapters}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollToIndexFailed={onScrollToIndexFailed}
            onLayout={(event) => {
              viewportHeightRef.current = event.nativeEvent.layout.height;
              tryLoadMoreIfContentFits();
            }}
            onContentSizeChange={(_, height) => {
              contentHeightRef.current = height;
              tryLoadMoreIfContentFits();
            }}
            ListFooterComponent={ListFooter}
          />
        ) : null}

        {chapters.length > 0 ? (
          <AudioPlayButton
            languageCode={languageCode}
            bookSlug={bookSlug}
            chapter={Number.isFinite(chapterNumber) ? chapterNumber : undefined}
            passage={`${displayBookName} ${chapterNumber}`}
          />
        ) : null}
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
  list: {
    flex: 1,
  },
  listContent: {
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
