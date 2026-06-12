import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  type FlatList as FlatListType,
} from 'react-native';

import { ChapterItem } from '@/components/reading/chapter-item';
import { useReadingTextStyles } from '@/stores/reading-text-settings-store';
import type { ChapterContent } from '@/types/reading';

type UseReaderAudioSyncOptions = {
  chapters: ChapterContent[];
  hasMore: boolean;
  hasPrevious: boolean;
  loadMore: () => Promise<void>;
  loadPrevious: () => Promise<void>;
  openAudio: boolean;
  resumedPlaybackChapter: number | null | undefined;
  visibleChapter: number | null | undefined;
  effectiveChapterNumber: number | undefined;
  languageCode: string | undefined;
  bookSlug: string | undefined;
  chapterNumber: number;
  loading: boolean;
  initialScrollIndex: number | null;
  clearInitialScrollIndex: () => void;
  updateScrollY: (y: number) => void;
  handleScroll: (y: number) => void;
  checkFillViewport: (viewportHeight: number, contentHeight: number) => void;
  displayBookName: string;
};

export function useReaderAudioSync({
  chapters,
  hasMore,
  hasPrevious,
  loadMore,
  loadPrevious,
  openAudio,
  resumedPlaybackChapter,
  visibleChapter,
  effectiveChapterNumber,
  languageCode,
  bookSlug,
  chapterNumber,
  loading,
  initialScrollIndex,
  clearInitialScrollIndex,
  updateScrollY,
  handleScroll,
  checkFillViewport,
  displayBookName,
}: UseReaderAudioSyncOptions) {
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
  const [isAudioPanelOpen, setIsAudioPanelOpen] = useState(openAudio);
  const isAudioPanelOpenRef = useRef(openAudio);
  const playVerseAtRef = useRef<((chapter: number, verse: number) => void) | undefined>(undefined);
  const currentPlayingVerseRef = useRef(currentPlayingVerse);
  const currentPlayingChapterRef = useRef(currentPlayingChapter);

  useEffect(() => {
    if (!openAudio) return;
    isAudioPanelOpenRef.current = true;
    setIsAudioPanelOpen(true);
    if (resumedPlaybackChapter != null) {
      setCurrentPlayingChapter(resumedPlaybackChapter);
    }
  }, [openAudio, resumedPlaybackChapter]);

  useEffect(() => {
    currentPlayingVerseRef.current = currentPlayingVerse;
  }, [currentPlayingVerse]);

  useEffect(() => {
    currentPlayingChapterRef.current = currentPlayingChapter;
  }, [currentPlayingChapter]);

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

  const scrollRetryCountRef = useRef(0);
  const prevPlayingChapterRef = useRef<number | null>(null);

  const scrollToPlayingVerse = useCallback(() => {
    if (!isAudioPanelOpenRef.current || audioPanelHeightRef.current <= 0) return;

    const verse = currentPlayingVerseRef.current;
    const chapter = currentPlayingChapterRef.current;
    if (verse == null || chapter == null) return;

    const chapterView = chapterViewRefsRef.current.get(chapter);
    const verseY = verseLayoutsRef.current.get(chapter)?.get(verse);
    if (!chapterView || verseY == null) {
      if (scrollRetryCountRef.current < 3) {
        scrollRetryCountRef.current += 1;
        requestAnimationFrame(() => scrollToPlayingVerse());
      }
      return;
    }

    scrollRetryCountRef.current = 0;

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
  }, []);

  const { fontSize, lineHeight, verseNumberFontSize, footnoteMarkerFontSize } =
    useReadingTextStyles();

  const listExtraData = useMemo(
    () =>
      [
        fontSize,
        lineHeight,
        verseNumberFontSize,
        footnoteMarkerFontSize,
        currentPlayingChapter,
        currentPlayingVerse,
        isAudioPanelOpen,
      ].join(':'),
    [
      fontSize,
      lineHeight,
      verseNumberFontSize,
      footnoteMarkerFontSize,
      currentPlayingChapter,
      currentPlayingVerse,
      isAudioPanelOpen,
    ],
  );

  const handleVerseLayout = useCallback(
    (chapterValue: number, verseToY: Map<number, number>) => {
      verseLayoutsRef.current.set(chapterValue, verseToY);
      if (
        currentPlayingChapterRef.current === chapterValue &&
        currentPlayingVerseRef.current != null
      ) {
        scrollRetryCountRef.current = 0;
        requestAnimationFrame(() => scrollToPlayingVerse());
      }
    },
    [scrollToPlayingVerse],
  );

  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [languageCode, bookSlug, chapterNumber]);

  useEffect(() => {
    if (openAudio && resumedPlaybackChapter != null) return;
    setCurrentPlayingVerse(null);
    setCurrentPlayingChapter(null);
  }, [languageCode, bookSlug, chapterNumber, openAudio, resumedPlaybackChapter]);

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

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize } = event.nativeEvent;
      contentHeightRef.current = contentSize.height;
      scrollYRef.current = contentOffset.y;
      updateScrollY(contentOffset.y);
      handleScroll(contentOffset.y);
    },
    [handleScroll, updateScrollY],
  );

  useEffect(() => {
    if (!isAudioPanelOpen || currentPlayingVerse == null || currentPlayingChapter == null) return;

    const chapterChanged = prevPlayingChapterRef.current !== currentPlayingChapter;
    prevPlayingChapterRef.current = currentPlayingChapter;
    scrollRetryCountRef.current = 0;

    const chapterIndex = chapters.findIndex((item) => item.chapter === currentPlayingChapter);
    const chapterNotMounted = !chapterViewRefsRef.current.has(currentPlayingChapter);
    if (chapterIndex >= 0 && (chapterChanged || chapterNotMounted)) {
      listRef.current?.scrollToIndex({
        index: chapterIndex,
        animated: true,
        viewPosition: 0,
      });
    }

    const scheduleVerseScroll = () => scrollToPlayingVerse();
    if (chapterChanged || chapterNotMounted) {
      requestAnimationFrame(() => requestAnimationFrame(scheduleVerseScroll));
    } else {
      scheduleVerseScroll();
    }
  }, [
    chapters,
    currentPlayingVerse,
    currentPlayingChapter,
    isAudioPanelOpen,
    scrollToPlayingVerse,
  ]);

  useEffect(() => {
    scrollRetryCountRef.current = 0;
    scrollToPlayingVerse();
  }, [fontSize, lineHeight, scrollToPlayingVerse]);

  const getCurrentChapterForAudio = useCallback(
    () =>
      (openAudio ? resumedPlaybackChapter : undefined) ??
      visibleChapter ??
      effectiveChapterNumber,
    [effectiveChapterNumber, openAudio, resumedPlaybackChapter, visibleChapter],
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

  const renderItem = useCallback(
    ({ item, index }: { item: ChapterContent; index: number }) => (
      <ChapterItem
        bookName={displayBookName}
        chapter={item}
        isFirst={index === 0}
        highlightedVerse={item.chapter === currentPlayingChapter ? currentPlayingVerse : null}
        onRootRef={getChapterRefSetter(item.chapter)}
        onVerseLayout={handleVerseLayout}
        onVersePress={
          isAudioPanelOpen ? (verse) => handleVersePress(item.chapter, verse) : undefined
        }
      />
    ),
    [
      displayBookName,
      currentPlayingChapter,
      currentPlayingVerse,
      getChapterRefSetter,
      handleVerseLayout,
      handleVersePress,
      isAudioPanelOpen,
    ],
  );

  const keyExtractor = useCallback((item: ChapterContent) => String(item.chapter), []);

  const onListLayout = useCallback(
    (height: number) => {
      viewportHeightRef.current = height;
      checkFillViewport(viewportHeightRef.current, contentHeightRef.current);
    },
    [checkFillViewport],
  );

  const onListContentSizeChange = useCallback(
    (height: number) => {
      contentHeightRef.current = height;
      checkFillViewport(viewportHeightRef.current, contentHeightRef.current);
    },
    [checkFillViewport],
  );

  const onPanelHeightChange = useCallback(
    (height: number) => {
      audioPanelHeightRef.current = height;
      if (height > 0) scrollToPlayingVerse();
    },
    [scrollToPlayingVerse],
  );

  const onPanelOpenChange = useCallback((open: boolean) => {
    isAudioPanelOpenRef.current = open;
    setIsAudioPanelOpen(open);
  }, []);

  return {
    listRef,
    listExtraData,
    renderItem,
    keyExtractor,
    onScroll,
    onScrollToIndexFailed,
    onListLayout,
    onListContentSizeChange,
    currentPlayingVerse,
    currentPlayingChapter,
    setCurrentPlayingVerse,
    setCurrentPlayingChapter,
    playVerseAtRef,
    getCurrentChapterForAudio,
    getNextChapterForAudio,
    getPreviousChapterForAudio,
    onPanelHeightChange,
    onPanelOpenChange,
  };
}
