import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

export function ChapterGrid({ chapters, loading = false, onChapterPress }: ChapterGridProps) {
  const theme = useTheme();
  const [gridWidth, setGridWidth] = useState(0);

  const handleGridLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      setGridWidth(width);
    }
  }, []);

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
      onLayout={handleGridLayout}>
      {cellSize > 0
        ? chapters.map((chapter) => (
            <Pressable
              key={chapter.number}
              style={({ pressed }) => [
                styles.cell,
                {
                  width: cellSize,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => onChapterPress?.(chapter)}
              accessibilityRole="button"
              accessibilityLabel={`Chapter ${chapter.number}`}>
              <Text
                style={[styles.cellLabel, { color: theme.text }]}
                numberOfLines={1}>
                {chapter.number}
              </Text>
            </Pressable>
          ))
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
