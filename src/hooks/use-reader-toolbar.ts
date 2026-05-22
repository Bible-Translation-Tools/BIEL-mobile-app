import { useCallback, useMemo, useState } from 'react';

import type { ChapterLayoutMetrics } from '@/components/reading/scripture-content';
import { ReadingLayout } from '@/constants/theme';
import type { ChapterContent } from '@/types/reading';

function resolveActiveChapter(
  scrollY: number,
  chapters: ChapterContent[],
  layouts: Record<number, ChapterLayoutMetrics>,
): number | null {
  if (chapters.length === 0) return null;

  const viewportLine = scrollY + ReadingLayout.padding;
  let activeChapter = chapters[0].chapter;

  for (const chapter of chapters) {
    const layout = layouts[chapter.chapter];
    if (layout && layout.y <= viewportLine) {
      activeChapter = chapter.chapter;
    }
  }

  return activeChapter;
}

export function useReaderToolbar(chapters: ChapterContent[], bookName: string) {
  const [scrollY, setScrollY] = useState(0);
  const [chapterLayouts, setChapterLayouts] = useState<Record<number, ChapterLayoutMetrics>>(
    {},
  );

  const handleChapterLayout = useCallback((chapter: number, layout: ChapterLayoutMetrics) => {
    setChapterLayouts((prev) => {
      const existing = prev[chapter];
      if (existing?.y === layout.y && existing.height === layout.height) {
        return prev;
      }
      return { ...prev, [chapter]: layout };
    });
  }, []);

  const activeChapter = useMemo(
    () => resolveActiveChapter(scrollY, chapters, chapterLayouts),
    [scrollY, chapters, chapterLayouts],
  );

  const showToolbarTitle = scrollY > ReadingLayout.toolbarTitleScrollThreshold;

  const toolbarChapterTitle =
    showToolbarTitle && activeChapter != null ? `${bookName} ${activeChapter}` : undefined;

  const updateScrollY = useCallback((offsetY: number) => {
    setScrollY(offsetY);
  }, []);

  return {
    toolbarChapterTitle,
    updateScrollY,
    handleChapterLayout,
  };
}
