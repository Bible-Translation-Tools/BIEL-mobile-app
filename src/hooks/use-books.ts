import { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchBooksForLanguage, fetchBooksForLanguageOffline } from '@/api/services/books';
import { listDownloadedBookSlugs } from '@/db';
import type { BookItem } from '@/types/book';
import type { DownloadStatus } from '@/types/download';

export type BookDownloadStatusChange = {
  bookSlug: string;
  status: DownloadStatus;
};

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
  const { t } = useTranslation('books');
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDownloadStatus = useCallback(
    async (change?: BookDownloadStatusChange) => {
      if (!languageCode) return;

      if (change) {
        InteractionManager.runAfterInteractions(() => {
          setBooks((current) =>
            current.map((book) =>
              book.slug.toUpperCase() === change.bookSlug.toUpperCase()
                ? { ...book, downloadStatus: change.status }
                : book,
            ),
          );
        });
        return;
      }

      const downloadedSlugs = await listDownloadedBookSlugs(languageCode).catch(() => []);
      const downloadedSet = new Set(downloadedSlugs.map((slug) => slug.toUpperCase()));

      InteractionManager.runAfterInteractions(() => {
        setBooks((current) =>
          current.map((book) => ({
            ...book,
            downloadStatus: downloadedSet.has(book.slug.toUpperCase()) ? 'downloaded' : 'pending',
          })),
        );
      });
    },
    [languageCode],
  );

  const refetch = useCallback(async () => {
    if (!languageCode) {
      setBooks([]);
      setLoading(false);
      setError(t('languageNotFound'));
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
        setError(err instanceof Error ? err.message : t('failedToLoadBooks'));
      }
    } finally {
      setLoading(false);
    }
  }, [languageCode, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { books, loading, error, refetch, refreshDownloadStatus };
}
