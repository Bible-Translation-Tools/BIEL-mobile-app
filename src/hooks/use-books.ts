import { useCallback, useEffect, useState } from 'react';

import { fetchBooksForLanguage, fetchBooksForLanguageOffline } from '@/api/services/books';
import { listDownloadedBookSlugs } from '@/db';
import type { BookItem } from '@/types/book';

async function applyDownloadStatus(
  items: BookItem[],
  languageCode: string,
): Promise<BookItem[]> {
  const downloadedSlugs = await listDownloadedBookSlugs(languageCode).catch(() => []);
  const downloadedSet = new Set(downloadedSlugs.map((slug) => slug.toUpperCase()));

  return items.map((book) => ({
    ...book,
    downloadStatus: downloadedSet.has(book.slug.toUpperCase()) ? 'downloaded' : 'pending',
  }));
}

export function useBooks(languageCode: string | undefined) {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDownloadStatus = useCallback(async () => {
    if (!languageCode) return;

    const downloadedSlugs = await listDownloadedBookSlugs(languageCode).catch(() => []);
    const downloadedSet = new Set(downloadedSlugs.map((slug) => slug.toUpperCase()));

    setBooks((current) =>
      current.map((book) => ({
        ...book,
        downloadStatus: downloadedSet.has(book.slug.toUpperCase()) ? 'downloaded' : 'pending',
      })),
    );
  }, [languageCode]);

  const refetch = useCallback(async () => {
    if (!languageCode) {
      setBooks([]);
      setLoading(false);
      setError('Language not found');
      return;
    }

    setLoading(true);
    setError(null);

    let offlineItems: BookItem[] = [];
    try {
      offlineItems = await fetchBooksForLanguageOffline(languageCode);
    } catch {
      offlineItems = [];
    }

    if (offlineItems.length > 0) {
      try {
        const withStatus = await applyDownloadStatus(offlineItems, languageCode);
        setBooks(withStatus);
        setError(null);
      } catch {
        setBooks(offlineItems);
        setError(null);
      }
    }

    try {
      const items = await fetchBooksForLanguage(languageCode);
      const withStatus = await applyDownloadStatus(items, languageCode);
      if (items.length > 0 || offlineItems.length === 0) {
        setBooks(withStatus);
      }
      setError(null);
    } catch (err) {
      if (offlineItems.length === 0) {
        setBooks([]);
        setError(err instanceof Error ? err.message : 'Failed to load books');
      }
    } finally {
      setLoading(false);
    }
  }, [languageCode]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { books, loading, error, refetch, refreshDownloadStatus };
}
