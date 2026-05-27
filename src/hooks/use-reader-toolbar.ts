import { useCallback, useRef, useState } from 'react';
import type { ViewToken } from 'react-native';

import { ReadingLayout } from '@/constants/theme';
import type { ChapterContent } from '@/types/reading';

export function useReaderToolbar(bookName: string) {
  const [scrollY, setScrollY] = useState(0);
  const [visibleChapter, setVisibleChapter] = useState<number | null>(null);

  const showToolbarTitle = scrollY > ReadingLayout.toolbarTitleScrollThreshold;

  const toolbarChapterTitle =
    showToolbarTitle && visibleChapter != null ? `${bookName} ${visibleChapter}` : undefined;

  const updateScrollY = useCallback((offsetY: number) => {
    setScrollY(offsetY);
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const topVisible = viewableItems.find((item) => item.isViewable);
      const chapter = (topVisible?.item as ChapterContent | undefined)?.chapter;
      if (chapter != null) {
        setVisibleChapter(chapter);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 5,
    minimumViewTime: 0,
  }).current;

  return {
    toolbarChapterTitle,
    visibleChapter,
    updateScrollY,
    onViewableItemsChanged,
    viewabilityConfig,
  };
};
