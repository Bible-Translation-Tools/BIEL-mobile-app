import { useCallback, useEffect, useState } from 'react';

import { fetchBooksForLanguage } from '@/api/services/books';
import type { BookItem } from '@/types/book';

export function useBooks(languageCode: string | undefined) {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!languageCode) {
      setBooks([]);
      setLoading(false);
      setError('Language not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = await fetchBooksForLanguage(languageCode);
      setBooks(items);
    } catch (err) {
      setBooks([]);
      setError(err instanceof Error ? err.message : 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [languageCode]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { books, loading, error, refetch };
}
