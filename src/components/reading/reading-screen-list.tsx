import { useTranslation } from 'react-i18next';
import type { ReactElement, RefObject } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  type FlatList as FlatListType,
} from 'react-native';

import type { ChapterContent } from '@/types/reading';

import { styles } from '@/app/read.styles';

type ReadingScreenListProps = {
  listRef: RefObject<FlatListType<ChapterContent> | null>;
  chapters: ChapterContent[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  listExtraData: string;
  renderItem: (info: { item: ChapterContent; index: number }) => ReactElement;
  keyExtractor: (item: ChapterContent) => string;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onViewableItemsChanged: FlatListType<ChapterContent>['props']['onViewableItemsChanged'];
  viewabilityConfig: FlatListType<ChapterContent>['props']['viewabilityConfig'];
  onScrollToIndexFailed: FlatListType<ChapterContent>['props']['onScrollToIndexFailed'];
  onListLayout: (height: number) => void;
  onListContentSizeChange: (height: number) => void;
  loadMore: () => void;
  refetch: () => void;
  iconPrimary: string;
  textSecondary: string;
  text: string;
};

export function ReadingScreenList({
  listRef,
  chapters,
  loading,
  loadingMore,
  error,
  hasMore,
  listExtraData,
  renderItem,
  keyExtractor,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
  onScrollToIndexFailed,
  onListLayout,
  onListContentSizeChange,
  loadMore,
  refetch,
  iconPrimary,
  textSecondary,
  text,
}: ReadingScreenListProps) {
  const { t } = useTranslation('reading');

  const ListFooter = loadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={iconPrimary} />
    </View>
  ) : null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={iconPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.message, { color: textSecondary }]}>{error}</Text>
        <Pressable onPress={refetch} accessibilityRole="button">
          <Text style={[styles.retry, { color: text }]}>{t('tapToRetry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (chapters.length === 0) {
    return null;
  }

  return (
    <FlatList
      ref={listRef}
      data={chapters}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      extraData={listExtraData}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onEndReached={() => {
        if (hasMore) loadMore();
      }}
      onEndReachedThreshold={0.3}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onScrollToIndexFailed={onScrollToIndexFailed}
      onLayout={(event) => {
        onListLayout(event.nativeEvent.layout.height);
      }}
      onContentSizeChange={(_, height) => {
        onListContentSizeChange(height);
      }}
      ListFooterComponent={ListFooter}
    />
  );
}
