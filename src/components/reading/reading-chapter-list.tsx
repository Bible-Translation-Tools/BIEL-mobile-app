import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  type FlatList as FlatListType,
  type ListRenderItem,
  type View as ViewType,
} from 'react-native';

import { ChapterItem } from '@/components/reading/chapter-item';
import { ReadingLayout } from '@/constants/theme';
import { useReadingTextStyles } from '@/contexts/reading-text-settings-context';
import type { ChapterContent } from '@/types/reading';

type ReadingChapterListProps = {
  listRef: React.RefObject<FlatListType<ChapterContent> | null>;
  chapters: ChapterContent[];
  displayBookName: string;
  currentPlayingChapter: number | null;
  currentPlayingVerse: number | null;
  isAudioPanelOpen: boolean;
  loadingMore: boolean;
  themeIconPrimary: string;
  getChapterRefSetter: (chapter: number) => (node: ViewType | null) => void;
  handleVerseLayout: (chapter: number, verseToY: Map<number, number>) => void;
  handleVersePress: (chapter: number, verse: number) => void;
  onScroll: NonNullable<React.ComponentProps<typeof FlatList>['onScroll']>;
  onEndReached: () => void;
  onViewableItemsChanged: NonNullable<
    React.ComponentProps<typeof FlatList>['onViewableItemsChanged']
  >;
  viewabilityConfig: React.ComponentProps<typeof FlatList>['viewabilityConfig'];
  onScrollToIndexFailed: NonNullable<
    React.ComponentProps<typeof FlatList>['onScrollToIndexFailed']
  >;
  onLayout: NonNullable<React.ComponentProps<typeof FlatList>['onLayout']>;
  onContentSizeChange: NonNullable<React.ComponentProps<typeof FlatList>['onContentSizeChange']>;
};

export function ReadingChapterList({
  listRef,
  chapters,
  displayBookName,
  currentPlayingChapter,
  currentPlayingVerse,
  isAudioPanelOpen,
  loadingMore,
  themeIconPrimary,
  getChapterRefSetter,
  handleVerseLayout,
  handleVersePress,
  onScroll,
  onEndReached,
  onViewableItemsChanged,
  viewabilityConfig,
  onScrollToIndexFailed,
  onLayout,
  onContentSizeChange,
}: ReadingChapterListProps) {
  const textStyles = useReadingTextStyles();

  const extraData = useMemo(
    () =>
      [
        textStyles.fontSize,
        textStyles.lineHeight,
        textStyles.verseNumberFontSize,
        textStyles.footnoteMarkerFontSize,
        textStyles.verseLayoutReportsPaused,
        currentPlayingChapter,
        currentPlayingVerse,
        isAudioPanelOpen,
      ].join(':'),
    [
      textStyles.fontSize,
      textStyles.lineHeight,
      textStyles.verseNumberFontSize,
      textStyles.footnoteMarkerFontSize,
      textStyles.verseLayoutReportsPaused,
      currentPlayingChapter,
      currentPlayingVerse,
      isAudioPanelOpen,
    ],
  );

  const renderItem: ListRenderItem<ChapterContent> = useCallback(
    ({ item, index }) => (
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
        fontSize={textStyles.fontSize}
        lineHeight={textStyles.lineHeight}
        verseNumberFontSize={textStyles.verseNumberFontSize}
        footnoteMarkerFontSize={textStyles.footnoteMarkerFontSize}
        verseLayoutReportsPaused={textStyles.verseLayoutReportsPaused}
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
      textStyles,
    ],
  );

  const keyExtractor = useCallback((item: ChapterContent) => String(item.chapter), []);

  const ListFooter = loadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={themeIconPrimary} />
    </View>
  ) : null;

  return (
    <FlatList
      ref={listRef}
      data={chapters}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      extraData={extraData}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
      windowSize={5}
      maxToRenderPerBatch={2}
      updateCellsBatchingPeriod={50}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onScrollToIndexFailed={onScrollToIndexFailed}
      onLayout={onLayout}
      onContentSizeChange={onContentSizeChange}
      ListFooterComponent={ListFooter}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
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
});
