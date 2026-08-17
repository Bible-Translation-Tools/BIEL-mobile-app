import { useCallback, useRef, useState } from 'react';

import { fetchOfflineChaptersForBook } from '@/api/services/chapters';
import type { ChapterItem } from '@/types/book';

function chapterKey(languageCode: string, bookSlug: string) {
  return `${languageCode}:${bookSlug}`;
}

export function useLibraryChapters() {
  const cacheRef = useRef<Record<string, ChapterItem[]>>({});
  const [chaptersByKey, setChaptersByKey] = useState<Record<string, ChapterItem[]>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
    setChaptersByKey({});
    setLoadingKey(null);
  }, []);

  const loadChapters = useCallback(async (languageCode: string, bookSlug: string) => {
    const key = chapterKey(languageCode, bookSlug);
    if (Object.hasOwn(cacheRef.current, key)) {
      const cached = cacheRef.current[key];
      setChaptersByKey((prev) => (prev[key] === cached ? prev : { ...prev, [key]: cached }));
      return;
    }

    setLoadingKey(key);

    try {
      const chapters = await fetchOfflineChaptersForBook(languageCode, bookSlug);
      cacheRef.current[key] = chapters;
      setChaptersByKey((prev) => ({ ...prev, [key]: chapters }));
    } catch {
      delete cacheRef.current[key];
      setChaptersByKey((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } finally {
      setLoadingKey((current) => (current === key ? null : current));
    }
  }, []);

  const getChapters = useCallback(
    (languageCode: string, bookSlug: string) => chaptersByKey[chapterKey(languageCode, bookSlug)],
    [chaptersByKey],
  );

  const isLoading = useCallback(
    (languageCode: string, bookSlug: string) => loadingKey === chapterKey(languageCode, bookSlug),
    [loadingKey],
  );

  return { loadChapters, getChapters, isLoading, clearCache };
}
