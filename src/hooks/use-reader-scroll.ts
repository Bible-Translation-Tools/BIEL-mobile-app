import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchChaptersForBook } from '@/services/chapters';
import { fetchChapterContent } from '@/services/reader';
import type { ChapterContent } from '@/types/reading';

const SCROLL_LOAD_THRESHOLD = 240;
const SCROLL_UP_DELTA = 8;

function getNextChapterNumber(available: number[], after: number): number | null {
  const index = available.indexOf(after);
  if (index === -1 || index >= available.length - 1) return null;
  return available[index + 1] ?? null;
}

function getPreviousChapterNumber(available: number[], before: number): number | null {
  const index = available.indexOf(before);
  if (index <= 0) return null;
  return available[index - 1] ?? null;
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
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialScrollIndex, setInitialScrollIndex] = useState<number | null>(null);

  const prefetchNextRef = useRef<{ chapter: number; promise: Promise<ChapterContent> } | null>(
    null,
  );
  const prefetchPrevRef = useRef<{ chapter: number; promise: Promise<ChapterContent> } | null>(
    null,
  );
  const loadingMoreRef = useRef(false);
  const loadingPreviousRef = useRef(false);
  const lastScrollYRef = useRef(0);

  const prefetchChapter = useCallback(
    (chapter: number, direction: 'next' | 'prev') => {
      if (!languageCode || !bookSlug) return;

      const ref = direction === 'next' ? prefetchNextRef : prefetchPrevRef;
      if (ref.current?.chapter === chapter) return;

      const promise = fetchChapterContent(languageCode, bookSlug, chapter).catch((err) => {
        if (ref.current?.chapter === chapter) {
          ref.current = null;
        }
        throw err;
      });

      ref.current = { chapter, promise };
    },
    [languageCode, bookSlug],
  );

  const loadInitial = useCallback(async () => {
    if (!languageCode || !bookSlug || initialChapter == null) return;

    setLoading(true);
    setError(null);
    setChapters([]);
    setAvailableChapters([]);
    setInitialScrollIndex(null);
    prefetchNextRef.current = null;
    prefetchPrevRef.current = null;
    lastScrollYRef.current = 0;

    try {
      const chapterList = await fetchChaptersForBook(languageCode, bookSlug);
      const numbers = chapterList.map((item) => item.number).sort((a, b) => a - b);
      const previous =
        initialChapter > 1 ? getPreviousChapterNumber(numbers, initialChapter) : null;

      let initialChapters: ChapterContent[];

      if (previous != null) {
        const [previousContent, currentContent] = await Promise.all([
          fetchChapterContent(languageCode, bookSlug, previous),
          fetchChapterContent(languageCode, bookSlug, initialChapter),
        ]);
        initialChapters = [previousContent, currentContent];
        setInitialScrollIndex(1);

        const beforePrevious = getPreviousChapterNumber(numbers, previous);
        if (beforePrevious != null) {
          prefetchChapter(beforePrevious, 'prev');
        }
      } else {
        const currentContent = await fetchChapterContent(
          languageCode,
          bookSlug,
          initialChapter,
        );
        initialChapters = [currentContent];
        setInitialScrollIndex(0);
      }

      setAvailableChapters(numbers);
      setChapters(initialChapters);

      const next = getNextChapterNumber(numbers, initialChapter);
      if (next != null) {
        prefetchChapter(next, 'next');
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

  const hasPrevious = useMemo(() => {
    const firstChapter = chapters[0]?.chapter;
    if (firstChapter == null) return false;
    return getPreviousChapterNumber(availableChapters, firstChapter) != null;
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
      if (prefetchNextRef.current?.chapter === nextChapter) {
        content = await prefetchNextRef.current.promise;
        prefetchNextRef.current = null;
      } else {
        content = await fetchChapterContent(languageCode, bookSlug, nextChapter);
      }

      setChapters((prev) => {
        if (prev.some((item) => item.chapter === nextChapter)) return prev;
        return [...prev, content];
      });

      const chapterAfterNext = getNextChapterNumber(availableChapters, nextChapter);
      if (chapterAfterNext != null) {
        prefetchChapter(chapterAfterNext, 'next');
      }
    } catch {
      // Keep reading the chapters already loaded if the next one fails.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [languageCode, bookSlug, chapters, availableChapters, hasMore, prefetchChapter]);

  const loadPrevious = useCallback(async () => {
    if (!languageCode || !bookSlug || loadingPreviousRef.current || !hasPrevious) return;

    const firstChapter = chapters[0]?.chapter;
    if (firstChapter == null) return;

    const previousChapter = getPreviousChapterNumber(availableChapters, firstChapter);
    if (previousChapter == null) return;

    loadingPreviousRef.current = true;
    setLoadingPrevious(true);

    try {
      let content: ChapterContent;
      if (prefetchPrevRef.current?.chapter === previousChapter) {
        content = await prefetchPrevRef.current.promise;
        prefetchPrevRef.current = null;
      } else {
        content = await fetchChapterContent(languageCode, bookSlug, previousChapter);
      }

      setChapters((prev) => {
        if (prev.some((item) => item.chapter === previousChapter)) return prev;
        return [content, ...prev];
      });

      const chapterBeforePrevious = getPreviousChapterNumber(
        availableChapters,
        previousChapter,
      );
      if (chapterBeforePrevious != null) {
        prefetchChapter(chapterBeforePrevious, 'prev');
      }
    } catch {
      // Keep reading the chapters already loaded if the previous one fails.
    } finally {
      loadingPreviousRef.current = false;
      setLoadingPrevious(false);
    }
  }, [languageCode, bookSlug, chapters, availableChapters, hasPrevious, prefetchChapter]);

  const handleScroll = useCallback(
    (contentOffsetY: number) => {
      const isScrollingUp = contentOffsetY < lastScrollYRef.current - SCROLL_UP_DELTA;

      if (
        isScrollingUp &&
        contentOffsetY < SCROLL_LOAD_THRESHOLD &&
        hasPrevious &&
        !loadingPreviousRef.current
      ) {
        loadPrevious();
      }

      lastScrollYRef.current = contentOffsetY;
    },
    [loadPrevious, hasPrevious],
  );

  const checkFillViewport = useCallback(
    (viewportHeight: number, contentHeight: number) => {
      if (viewportHeight > 0 && contentHeight > 0 && contentHeight <= viewportHeight + 50) {
        loadMore();
      }
    },
    [loadMore],
  );

  const clearInitialScrollIndex = useCallback(() => {
    setInitialScrollIndex(null);
  }, []);

  return {
    chapters,
    loading,
    loadingMore,
    loadingPrevious,
    error,
    hasMore,
    hasPrevious,
    loadMore,
    handleScroll,
    checkFillViewport,
    initialScrollIndex,
    clearInitialScrollIndex,
    refetch: loadInitial,
  };
};
