import { useCallback, useEffect, useState } from 'react';

import { fetchChapterContent } from '@/services/reading';
import type { ChapterContent } from '@/types/reading';

export function useChapterContent(
  languageCode: string | undefined,
  bookSlug: string | undefined,
  chapter: number | undefined,
) {
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!languageCode || !bookSlug || !chapter) return;

    setLoading(true);
    setError(null);

    try {
      const chapterContent = await fetchChapterContent(languageCode, bookSlug, chapter);
      setContent(chapterContent);
    } catch (err) {
      setContent(null);
      setError(err instanceof Error ? err.message : 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  }, [languageCode, bookSlug, chapter]);

  useEffect(() => {
    load();
  }, [load]);

  return { content, loading, error, refetch: load };
}
