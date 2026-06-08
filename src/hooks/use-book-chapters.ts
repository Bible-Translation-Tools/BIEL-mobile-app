import { useCallback, useRef, useState } from 'react';

import { fetchAudioChaptersForBook, fetchChaptersForBook } from '@/api/services/chapters';
import type { ChapterItem } from '@/types/book';

export function useBookChapters(languageCode: string, audioOnly: boolean) {
  const cacheRef = useRef<Record<string, ChapterItem[]>>({});
  const [chaptersByBook, setChaptersByBook] = useState<Record<string, ChapterItem[]>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [errorSlug, setErrorSlug] = useState<string | null>(null);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
    setChaptersByBook({});
    setLoadingSlug(null);
    setErrorSlug(null);
  }, []);

  const loadChapters = useCallback(
    async (bookSlug: string) => {
      if (Object.hasOwn(cacheRef.current, bookSlug)) {
        const cached = cacheRef.current[bookSlug];
        setChaptersByBook((prev) =>
          prev[bookSlug] === cached ? prev : { ...prev, [bookSlug]: cached },
        );
        return;
      }

      setLoadingSlug(bookSlug);
      setErrorSlug(null);

      try {
        const chapters = audioOnly
          ? await fetchAudioChaptersForBook(languageCode, bookSlug)
          : await fetchChaptersForBook(languageCode, bookSlug);
        cacheRef.current[bookSlug] = chapters;
        setChaptersByBook((prev) => ({ ...prev, [bookSlug]: chapters }));
      } catch {
        setErrorSlug(bookSlug);
        delete cacheRef.current[bookSlug];
        setChaptersByBook((prev) => {
          if (!(bookSlug in prev)) return prev;
          const next = { ...prev };
          delete next[bookSlug];
          return next;
        });
      } finally {
        setLoadingSlug(null);
      }
    },
    [audioOnly, languageCode],
  );

  const getChapters = useCallback(
    (bookSlug: string) => chaptersByBook[bookSlug],
    [chaptersByBook],
  );

  const isLoading = useCallback(
    (bookSlug: string) => loadingSlug === bookSlug,
    [loadingSlug],
  );

  function hasError(bookSlug: string) {
    return errorSlug === bookSlug;
  }

  return { loadChapters, getChapters, isLoading, hasError, clearCache };
}
