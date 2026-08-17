import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { BookLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChapterItem } from '@/types/book';

type ChapterGridProps = {
  chapters: ChapterItem[];
  loading?: boolean;
  onChapterPress?: (chapter: ChapterItem) => void;
};

function getCellSize(gridWidth: number): number {
  const columns = BookLayout.chapterColumns;
  const gap = BookLayout.chapterGap;
  return (gridWidth - (columns - 1) * gap) / columns;
}

function isChapterAvailable(chapter: ChapterItem): boolean {
  return chapter.available !== false;
}

export function ChapterGrid({ chapters, loading = false, onChapterPress }: ChapterGridProps) {
  const theme = useTheme();
  const { t } = useTranslation('books');
  const [gridWidth, setGridWidth] = useState(0);

  const cellSize = gridWidth > 0 ? getCellSize(gridWidth) : 0;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={theme.iconPrimary} />
      </View>
    );
  }

  if (chapters.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.grid, { gap: BookLayout.chapterGap }]}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0) setGridWidth(width);
      }}>
      {cellSize > 0
        ? chapters.map((chapter) => {
            const available = isChapterAvailable(chapter);

            return (
              <Pressable
                key={chapter.number}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    width: cellSize,
                    backgroundColor: available ? theme.backgroundElement : theme.backgroundSelected,
                    borderColor: theme.border,
                    opacity: available ? (pressed ? 0.85 : 1) : 1,
                  },
                ]}
                onPress={available ? () => onChapterPress?.(chapter) : undefined}
                disabled={!available}
                accessibilityRole="button"
                accessibilityState={{ disabled: !available }}
                accessibilityLabel={
                  available
                    ? t('accessibility.chapter', { number: chapter.number })
                    : t('accessibility.chapterUnavailable', { number: chapter.number })
                }>
                <Text
                  style={[
                    styles.cellLabel,
                    { color: available ? theme.text : theme.textLabel },
                  ]}
                  numberOfLines={1}>
                  {chapter.number}
                </Text>
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  cell: {
    minHeight: BookLayout.chapterCellMinHeight,
    paddingVertical: BookLayout.chapterCellPadding,
    paddingHorizontal: 4,
    borderRadius: BookLayout.chapterCellRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLabel: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  loading: {
    paddingVertical: 24,
    alignItems: 'center',
    width: '100%',
  },
});
