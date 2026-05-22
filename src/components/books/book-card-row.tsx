import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BookItem, ChapterItem } from '@/types/book';

import { ChapterGrid } from './chapter-grid';

type BookCardRowProps = {
  book: BookItem;
  isExpanded?: boolean;
  chapters?: ChapterItem[];
  chaptersLoading?: boolean;
  onToggleExpand?: () => void;
  onChapterPress?: (chapter: ChapterItem) => void;
  onDownloadPress?: () => void;
};

export const BookCardRow = memo(function BookCardRow({
  book,
  isExpanded = false,
  chapters = [],
  chaptersLoading = false,
  onToggleExpand,
  onChapterPress,
  onDownloadPress,
}: BookCardRowProps) {
  const theme = useTheme();
  const isDownloaded = book.downloadStatus === 'downloaded';

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
    },
    styles.cardShadow,
  ];

  const header = (
    <View style={styles.header}>
      <View style={styles.titleGroup}>
        {isDownloaded ? (
          <IconSymbol
            name={{
              ios: 'checkmark.circle.fill',
              android: 'download_done',
              web: 'download_done',
            }}
            size={28}
            color={theme.iconSuccess}
          />
        ) : null}
        <Text style={[styles.bookName, { color: theme.text }]} numberOfLines={1}>
          {book.name}
        </Text>
      </View>
      <IconSymbol
        name={
          isExpanded
            ? { ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' }
            : { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }
        }
        size={28}
        color={theme.iconTertiary}
      />
    </View>
  );

  const toggleProps = {
    onPress: onToggleExpand,
    accessibilityRole: 'button' as const,
    accessibilityLabel: `${isExpanded ? 'Collapse' : 'Expand'} ${book.name}`,
    accessibilityState: { expanded: isExpanded },
  };

  return (
    <View style={styles.row}>
      {isExpanded ? (
        <View style={[cardStyle, styles.bookCard]}>
          <Pressable
            style={({ pressed }) => [
              styles.headerHitArea,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            {...toggleProps}>
            {header}
          </Pressable>
          <ChapterGrid
            chapters={chapters}
            loading={chaptersLoading}
            onChapterPress={onChapterPress}
          />
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            cardStyle,
            styles.bookCard,
            styles.bookCardCollapsed,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          {...toggleProps}>
          {header}
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [
          cardStyle,
          styles.downloadCard,
          { opacity: pressed ? 0.9 : 1 },
        ]}
        onPress={onDownloadPress}
        accessibilityRole="button"
        accessibilityLabel={
          isDownloaded ? `Delete ${book.name}` : `Download ${book.name}`
        }>
        {isDownloaded ? (
          <IconSymbol
            name={{ ios: 'trash', android: 'delete', web: 'delete' }}
            size={24}
            color={theme.iconDanger}
          />
        ) : (
          <IconSymbol
            name={{
              ios: 'arrow.down.circle',
              android: 'file_download',
              web: 'file_download',
            }}
            size={28}
            color={theme.iconPrimary}
          />
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BookLayout.rowGap,
    width: '100%',
  },
  bookCardCollapsed: {
    minHeight: BookLayout.bookDownloadButtonSize,
    justifyContent: 'center',
  },
  card: {
    borderRadius: BookLayout.cardRadius,
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  bookCard: {
    flex: 1,
    gap: BookLayout.headerGap,
    padding: BookLayout.cardPaddingH,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  headerHitArea: {
    minHeight: 28,
    justifyContent: 'center',
    marginHorizontal: -BookLayout.cardPaddingH,
    marginTop: -BookLayout.cardPaddingH,
    paddingHorizontal: BookLayout.cardPaddingH,
    paddingTop: BookLayout.cardPaddingH,
    marginBottom: 0,
    paddingBottom: BookLayout.headerGap,
  },
  titleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  bookName: {
    ...Typography.headingH6,
    flexShrink: 1,
  },
  downloadCard: {
    width: BookLayout.bookDownloadButtonSize,
    height: BookLayout.bookDownloadButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
