import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { AudioOnlyChapterScreen } from '@/components/reading/audio-only-chapter-screen';
import { AudioPlayButton } from '@/components/reading/audio-play-button';
import { ReadingChapterList } from '@/components/reading/reading-chapter-list';
import { ReadingToolbar } from '@/components/reading/reading-toolbar';
import { ReadingTextSettingsProvider } from '@/contexts/reading-text-settings-context';
import { normalizeRouteParam } from '@/utils/route-params';
import { ReadingLayout } from '@/constants/theme';
import { useChapterHasAudio } from '@/hooks/use-chapter-audio';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReaderScroll } from '@/hooks/use-reader-scroll';
import { useReaderToolbar } from '@/hooks/use-reader-toolbar';
import { useTheme } from '@/hooks/use-theme';
import type { ChapterContent } from '@/types/reading';

export default function ReadingScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { languageCode, bookSlug, bookName, chapter, audioOnly: audioOnlyParam } =
    useLocalSearchParams<{
      languageCode: string;
      bookSlug: string;
      bookName?: string;
      chapter: string;
      audioOnly?: string;
    }>();

  const ietfCode = normalizeRouteParam(languageCode) ?? '';
  const resolvedBookSlug = normalizeRouteParam(bookSlug) ?? '';
  const resolvedBookName = normalizeRouteParam(bookName);
  const audioOnly = audioOnlyParam === '1' || audioOnlyParam === 'true';
  const chapterNumber = Number.parseInt(normalizeRouteParam(chapter) ?? '', 10);

  const {
    chapters,
    loading,
    loadingMore,
    error,
    hasMore,
    hasPrevious,
    loadMore,
    loadPrevious,
    handleScroll,
    checkFillViewport,
    initialScrollIndex,
    clearInitialScrollIndex,
    refetch,
    audioOnlyFallback,
  } = useReaderScroll(
    audioOnly ? undefined : languageCode,
    audioOnly ? undefined : bookSlug,
    audioOnly || !Number.isFinite(chapterNumber) ? undefined : chapterNumber,
  );

  const displayBookName =
    chapters.find((item) => item.chapter === chapterNumber)?.bookName ??
    chapters[0]?.bookName ??
    bookName ??
    bookSlug;

  const { toolbarChapterTitle, visibleChapter, updateScrollY, onViewableItemsChanged, viewabilityConfig } =
    useReaderToolbar(displayBookName);

  const currentAudioChapter =
    visibleChapter ?? (Number.isFinite(chapterNumber) ? chapterNumber : undefined);
  const currentChapterHasAudio = useChapterHasAudio({
    languageCode,
    bookSlug,
    chapter: currentAudioChapter,
  });

  const listRef = useRef<FlatListType<ChapterContent>>(null);
  const didInitialScrollRef = useRef(false);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const chapterViewRefsRef = useRef<Map<number, View>>(new Map());
  const verseLayoutsRef = useRef<Map<number, Map<number, number>>>(new Map());
  const audioPanelHeightRef = useRef(0);
  const chaptersRef = useRef<ChapterContent[]>([]);
  const hasMoreRef = useRef(false);
  const hasPreviousRef = useRef(false);
  const [currentPlayingVerse, setCurrentPlayingVerse] = useState<number | null>(null);
  const [currentPlayingChapter, setCurrentPlayingChapter] = useState<number | null>(null);
  const [isAudioPanelOpen, setIsAudioPanelOpen] = useState(false);
  const playVerseAtRef = useRef<((chapter: number, verse: number) => void) | undefined>(undefined);

  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    hasPreviousRef.current = hasPrevious;
  }, [hasPrevious]);

  const getChapterRefSetter = useMemo(() => {
    const cache = new Map<number, (node: View | null) => void>();
    return (chapterValue: number) => {
      let setter = cache.get(chapterValue);
      if (!setter) {
        setter = (node: View | null) => {
          if (node) chapterViewRefsRef.current.set(chapterValue, node);
          else chapterViewRefsRef.current.delete(chapterValue);
        };
        cache.set(chapterValue, setter);
      }
      return setter;
    };
  }, []);

  const handleVerseLayout = useCallback(
    (chapterValue: number, verseToY: Map<number, number>) => {
      verseLayoutsRef.current.set(chapterValue, verseToY);
    },
    [],
  );

  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [languageCode, bookSlug, chapterNumber]);

  useEffect(() => {
    setCurrentPlayingVerse(null);
    setCurrentPlayingChapter(null);
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

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize } = event.nativeEvent;
    contentHeightRef.current = contentSize.height;
    scrollYRef.current = contentOffset.y;
    updateScrollY(contentOffset.y);
    handleScroll(contentOffset.y);
  };

  useEffect(() => {
    if (currentPlayingVerse == null) return;
    if (currentPlayingChapter == null) return;

    const chapterView = chapterViewRefsRef.current.get(currentPlayingChapter);
    const verseY = verseLayoutsRef.current.get(currentPlayingChapter)?.get(currentPlayingVerse);
    if (!chapterView || verseY == null) return;

    const scrollRef = listRef.current?.getNativeScrollRef?.();
    if (!scrollRef) return;

    requestAnimationFrame(() => {
      chapterView.measureLayout(
        scrollRef as unknown as Parameters<View['measureLayout']>[0],
        (_x, chapterY) => {
          const viewportH = viewportHeightRef.current;
          if (viewportH <= 0) return;

          const verseAbsoluteY = chapterY + verseY;
          const currentScroll = scrollYRef.current;
          const TOP_PAD = 60;
          const PANEL_BUFFER = 150;
          const bottomPad = audioPanelHeightRef.current + PANEL_BUFFER;
          const visibleTop = currentScroll + TOP_PAD;
          const visibleBottom = currentScroll + viewportH - bottomPad;

          if (verseAbsoluteY < visibleTop || verseAbsoluteY > visibleBottom) {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, verseAbsoluteY - TOP_PAD),
              animated: true,
            });
          }
        },
        () => {},
      );
    });
  }, [currentPlayingVerse, currentPlayingChapter]);

  const getCurrentChapterForAudio = useCallback(
    () => visibleChapter ?? (Number.isFinite(chapterNumber) ? chapterNumber : undefined),
    [visibleChapter, chapterNumber],
  );

  const getAdjacentChapterForAudio = useCallback(
    async (currentChapter: number, direction: 'next' | 'prev') => {
      const currentChapters = chaptersRef.current;
      if (currentChapters.length === 0) return undefined;

      const sorted = [...currentChapters].sort((a, b) => a.chapter - b.chapter);
      const currentIdx = sorted.findIndex((item) => item.chapter === currentChapter);
      const adjacentIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;

      if (currentIdx !== -1 && adjacentIdx >= 0 && adjacentIdx < sorted.length) {
        return sorted[adjacentIdx]?.chapter;
      }

      const canLoadMore = direction === 'next' ? hasMoreRef.current : hasPreviousRef.current;
      if (!canLoadMore) return undefined;

      if (direction === 'next') {
        await loadMore();
      } else {
        await loadPrevious();
      }

      const afterLoad = [...chaptersRef.current].sort((a, b) => a.chapter - b.chapter);
      const afterIdx = afterLoad.findIndex((item) => item.chapter === currentChapter);
      const afterAdjacentIdx = direction === 'next' ? afterIdx + 1 : afterIdx - 1;

      if (afterIdx !== -1 && afterAdjacentIdx >= 0 && afterAdjacentIdx < afterLoad.length) {
        return afterLoad[afterAdjacentIdx]?.chapter;
      }

      return undefined;
    },
    [loadMore, loadPrevious],
  );

  const getNextChapterForAudio = useCallback(
    (currentChapter: number) => getAdjacentChapterForAudio(currentChapter, 'next'),
    [getAdjacentChapterForAudio],
  );

  const getPreviousChapterForAudio = useCallback(
    (currentChapter: number) => getAdjacentChapterForAudio(currentChapter, 'prev'),
    [getAdjacentChapterForAudio],
  );

  const handleVersePress = useCallback((chapter: number, verse: number) => {
    playVerseAtRef.current?.(chapter, verse);
  }, []);

  if (
    (audioOnly || audioOnlyFallback) &&
    ietfCode &&
    resolvedBookSlug &&
    Number.isFinite(chapterNumber)
  ) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AudioOnlyChapterScreen
          languageCode={ietfCode}
          bookSlug={resolvedBookSlug}
          bookName={resolvedBookName}
          chapter={chapterNumber}
        />
      </View>
    );
  }

  return (
    <ReadingTextSettingsProvider>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ReadingToolbar
          chapterTitle={toolbarChapterTitle}
          languageCode={languageCode}
          bookSlug={bookSlug}
          chapter={visibleChapter ?? (Number.isFinite(chapterNumber) ? chapterNumber : undefined)}
        />

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
          <ReadingChapterList
            listRef={listRef}
            chapters={chapters}
            displayBookName={displayBookName}
            currentPlayingChapter={currentPlayingChapter}
            currentPlayingVerse={currentPlayingVerse}
            isAudioPanelOpen={isAudioPanelOpen}
            loadingMore={loadingMore}
            themeIconPrimary={theme.iconPrimary}
            getChapterRefSetter={getChapterRefSetter}
            handleVerseLayout={handleVerseLayout}
            handleVersePress={handleVersePress}
            onScroll={onScroll}
            onEndReached={() => {
              if (hasMore) loadMore();
            }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollToIndexFailed={onScrollToIndexFailed}
            onLayout={(event) => {
              viewportHeightRef.current = event.nativeEvent.layout.height;
              checkFillViewport(viewportHeightRef.current, contentHeightRef.current);
            }}
            onContentSizeChange={(_, height) => {
              contentHeightRef.current = height;
              checkFillViewport(viewportHeightRef.current, contentHeightRef.current);
            }}
          />
        ) : null}

        {chapters.length > 0 && (currentChapterHasAudio) ? (
          <AudioPlayButton
            languageCode={languageCode}
            bookSlug={bookSlug}
            passageBookName={displayBookName}
            getCurrentChapter={getCurrentChapterForAudio}
            getNextChapter={getNextChapterForAudio}
            getPreviousChapter={getPreviousChapterForAudio}
            onCurrentVerseChange={setCurrentPlayingVerse}
            onCurrentChapterChange={setCurrentPlayingChapter}
            onPanelHeightChange={(height) => {
              audioPanelHeightRef.current = height;
            }}
            onPanelOpenChange={setIsAudioPanelOpen}
            playVerseAtRef={playVerseAtRef}
          />
        ) : null}
        </SafeAreaView>
      </View>
    </ReadingTextSettingsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
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
