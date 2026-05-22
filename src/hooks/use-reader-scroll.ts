import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchChaptersForBook } from '@/services/chapters';
import { fetchChapterContent } from '@/services/reader';
import type { ChapterContent } from '@/types/reading';

const SCROLL_LOAD_THRESHOLD = 240;

function getNextChapterNumber(available: number[], after: number): number | null {
  const index = available.indexOf(after);
  if (index === -1 || index >= available.length - 1) return null;
  return available[index + 1] ?? null;
}

export function useReaderScroll(
  languageCode: string | undefined,
  bookSlug: string | undefined,
  initialChapter: number | undefined,
) {
  const [chapters, setChapters] = useState<ChapterContent[]>([]);
  const [availableChapters, setAvailableChapters] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefetchRef = useRef<{ chapter: number; promise: Promise<ChapterContent> } | null>(
    null,
  );
  const loadingMoreRef = useRef(false);

  const prefetchChapter = useCallback(
    (chapter: number) => {
      if (!languageCode || !bookSlug) return;
      if (prefetchRef.current?.chapter === chapter) return;

      const promise = fetchChapterContent(languageCode, bookSlug, chapter).catch((err) => {
        if (prefetchRef.current?.chapter === chapter) {
          prefetchRef.current = null;
        }
        throw err;
      });

      prefetchRef.current = { chapter, promise };
    },
    [languageCode, bookSlug],
  );

  const loadInitial = useCallback(async () => {
    if (!languageCode || !bookSlug || initialChapter == null) return;

    setLoading(true);
    setError(null);
    setChapters([]);
    setAvailableChapters([]);
    prefetchRef.current = null;

    try {
      const [chapterList, firstContent] = await Promise.all([
        fetchChaptersForBook(languageCode, bookSlug),
        fetchChapterContent(languageCode, bookSlug, initialChapter),
      ]);

      const numbers = chapterList.map((item) => item.number).sort((a, b) => a - b);
      setAvailableChapters(numbers);
      setChapters([firstContent]);

      const next = getNextChapterNumber(numbers, initialChapter);
      if (next != null) {
        prefetchChapter(next);
      }
    } catch (err) {
      setChapters([]);
      setError(err instanceof Error ? err.message : 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  }, [languageCode, bookSlug, initialChapter, prefetchChapter]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const hasMore = useMemo(() => {
    const lastChapter = chapters[chapters.length - 1]?.chapter;
    if (lastChapter == null) return false;
    return getNextChapterNumber(availableChapters, lastChapter) != null;
  }, [chapters, availableChapters]);

  const loadMore = useCallback(async () => {
    if (!languageCode || !bookSlug || loadingMoreRef.current || !hasMore) return;

    const lastChapter = chapters[chapters.length - 1]?.chapter;
    if (lastChapter == null) return;

    const nextChapter = getNextChapterNumber(availableChapters, lastChapter);
    if (nextChapter == null) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      let content: ChapterContent;
      if (prefetchRef.current?.chapter === nextChapter) {
        content = await prefetchRef.current.promise;
        prefetchRef.current = null;
      } else {
        content = await fetchChapterContent(languageCode, bookSlug, nextChapter);
      }

      setChapters((prev) => {
        if (prev.some((item) => item.chapter === nextChapter)) return prev;
        return [...prev, content];
      });

      const chapterAfterNext = getNextChapterNumber(availableChapters, nextChapter);
      if (chapterAfterNext != null) {
        prefetchChapter(chapterAfterNext);
      }
    } catch {
      // Keep reading the chapters already loaded if the next one fails.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [languageCode, bookSlug, chapters, availableChapters, hasMore, prefetchChapter]);

  const handleScroll = useCallback(
    (contentOffsetY: number, layoutHeight: number, contentHeight: number) => {
      if (contentOffsetY + layoutHeight < contentHeight - SCROLL_LOAD_THRESHOLD) return;
      loadMore();
    },
    [loadMore],
  );

  const checkFillViewport = useCallback(
    (viewportHeight: number, contentHeight: number) => {
      if (viewportHeight > 0 && contentHeight > 0 && contentHeight <= viewportHeight + 50) {
        loadMore();
      }
    },
    [loadMore],
  );

  return {
    chapters,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    handleScroll,
    checkFillViewport,
    refetch: loadInitial,
  };
}
