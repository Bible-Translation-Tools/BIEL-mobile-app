import { useCallback, useRef, useState } from 'react';

import { fetchChaptersForBook } from '@/api/services/chapters';
import type { ChapterItem } from '@/types/book';

export function useBookChapters(languageCode: string | undefined) {
  const cacheRef = useRef<Record<string, ChapterItem[]>>({});
  const [chaptersByBook, setChaptersByBook] = useState<Record<string, ChapterItem[]>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [errorSlug, setErrorSlug] = useState<string | null>(null);

  const loadChapters = useCallback(
    async (bookSlug: string) => {
      if (!languageCode) return;

      const cached = cacheRef.current[bookSlug];
      if (cached) return;

      setLoadingSlug(bookSlug);
      setErrorSlug(null);

      try {
        const chapters = await fetchChaptersForBook(languageCode, bookSlug);
        cacheRef.current[bookSlug] = chapters;
        setChaptersByBook((prev) => ({ ...prev, [bookSlug]: chapters }));
      } catch {
        setErrorSlug(bookSlug);
        cacheRef.current[bookSlug] = [];
        setChaptersByBook((prev) => ({ ...prev, [bookSlug]: [] }));
      } finally {
        setLoadingSlug(null);
      }
    },
    [languageCode],
  );

  const getChapters = useCallback(
    (bookSlug: string) => chaptersByBook[bookSlug],
    [chaptersByBook],
  );

  const isLoading = useCallback(
    (bookSlug: string) => loadingSlug === bookSlug,
    [loadingSlug],
  );

  const hasError = useCallback((bookSlug: string) => errorSlug === bookSlug, [errorSlug]);

  return { loadChapters, getChapters, isLoading, hasError };
}
