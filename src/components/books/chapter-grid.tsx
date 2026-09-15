import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { BookLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChapterItem } from '@/types/book';
import {
  CHAPTER_CONTENT_LEGEND_ORDER,
  CONTENT_TYPE_COLORS,
  getChapterContentIndicator,
  type ContentTypeIndicator,
} from '@/types/content-type';

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

function getPresentContentIndicators(chapters: ChapterItem[]): ContentTypeIndicator[] {
  const present = new Set<ContentTypeIndicator>();
  for (const chapter of chapters) {
    const indicator = getChapterContentIndicator(chapter);
    if (indicator) present.add(indicator);
  }
  return CHAPTER_CONTENT_LEGEND_ORDER.filter((indicator) => present.has(indicator));
}

function getChapterAccessibilityLabel(
  chapter: ChapterItem,
  available: boolean,
  indicator: ContentTypeIndicator | null,
  t: (key: string, options: { number: number }) => string,
): string {
  if (!available) {
    return t('accessibility.chapterUnavailable', { number: chapter.number });
  }
  if (indicator === 'both') {
    return t('accessibility.chapterBoth', { number: chapter.number });
  }
  if (indicator === 'text') {
    return t('accessibility.chapterText', { number: chapter.number });
  }
  if (indicator === 'audio') {
    return t('accessibility.chapterAudio', { number: chapter.number });
  }
  return t('accessibility.chapter', { number: chapter.number });
}

export function ChapterGrid({ chapters, loading = false, onChapterPress }: ChapterGridProps) {
  const theme = useTheme();
  const { t } = useTranslation('books');
  const { t: tl } = useTranslation('library');
  const [gridWidth, setGridWidth] = useState(0);

  const cellSize = gridWidth > 0 ? getCellSize(gridWidth) : 0;
  const legendIndicators = getPresentContentIndicators(chapters);

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
      style={[
        styles.container,
        legendIndicators.length > 0 ? { gap: BookLayout.chapterLegendGap } : null,
      ]}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0) setGridWidth(width);
      }}>
      <View style={[styles.grid, { gap: BookLayout.chapterGap }]}>
        {cellSize > 0
          ? chapters.map((chapter) => {
              const available = isChapterAvailable(chapter);
              const indicator = available ? getChapterContentIndicator(chapter) : null;
              const colors = indicator ? CONTENT_TYPE_COLORS[indicator] : null;

              return (
                <Pressable
                  key={chapter.number}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      width: cellSize,
                      backgroundColor: colors
                        ? theme[colors.background]
                        : available
                          ? theme.backgroundElement
                          : theme.backgroundSelected,
                      borderColor: colors ? theme[colors.foreground] : theme.border,
                      opacity: available ? (pressed ? 0.85 : 1) : 1,
                    },
                  ]}
                  onPress={available ? () => onChapterPress?.(chapter) : undefined}
                  disabled={!available}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !available }}
                  accessibilityLabel={getChapterAccessibilityLabel(
                    chapter,
                    available,
                    indicator,
                    t,
                  )}>
                  <Text
                    style={[
                      styles.cellLabel,
                      {
                        color: colors
                          ? theme[colors.foreground]
                          : available
                            ? theme.text
                            : theme.textLabel,
                      },
                    ]}
                    numberOfLines={1}>
                    {chapter.number}
                  </Text>
                </Pressable>
              );
            })
          : null}
      </View>
      {legendIndicators.length > 0 ? (
        <View style={styles.legend}>
          {legendIndicators.map((indicator) => {
            const colors = CONTENT_TYPE_COLORS[indicator];
            const label =
              indicator === 'both' ? tl('legend.both') : tl(`content.${indicator}`);

            return (
              <View key={indicator} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    {
                      backgroundColor: theme[colors.background],
                      borderColor: theme[colors.foreground],
                    },
                  ]}
                />
                <Text style={[styles.legendLabel, { color: theme.text }]}>{label}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
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
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: BookLayout.chapterLegendItemGap,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BookLayout.chapterLegendSwatchGap,
  },
  legendSwatch: {
    width: BookLayout.chapterLegendSwatchSize,
    height: BookLayout.chapterLegendSwatchSize,
    borderRadius: BookLayout.chapterLegendSwatchRadius,
    borderWidth: BookLayout.chapterLegendSwatchBorderWidth,
    flexShrink: 0,
  },
  legendLabel: {
    ...Typography.bodyXs,
    fontWeight: '500',
  },
  loading: {
    paddingVertical: 24,
    alignItems: 'center',
    width: '100%',
  },
});
