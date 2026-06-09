import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fetchBooksForLanguage, fetchBooksForLanguageOffline } from '@/api/services/books';
import { listDownloadedAudioBookSlugs, listDownloadedBookSlugs } from '@/db';
import type { BookItem } from '@/types/book';
import type { DownloadStatus } from '@/types/download';

export type BookDownloadStatusChange = {
  bookSlug: string;
  status: DownloadStatus;
  kind?: 'scripture' | 'audio';
};

async function getDownloadStatusSets(languageCode: string) {
  const [downloadedSlugs, audioDownloadedSlugs] = await Promise.all([
    listDownloadedBookSlugs(languageCode).catch(() => []),
    listDownloadedAudioBookSlugs(languageCode).catch(() => []),
  ]);

  return {
    downloadedSet: new Set(downloadedSlugs.map((slug) => slug.toUpperCase())),
    audioDownloadedSet: new Set(audioDownloadedSlugs.map((slug) => slug.toUpperCase())),
  };
}

function mapBooksWithDownloadStatus(
  items: BookItem[],
  downloadedSet: Set<string>,
  audioDownloadedSet: Set<string>,
): BookItem[] {
  return items.map((book) => ({
    ...book,
    downloadStatus: downloadedSet.has(book.slug.toUpperCase()) ? 'downloaded' : 'pending',
    audioDownloadStatus: audioDownloadedSet.has(book.slug.toUpperCase())
      ? 'downloaded'
      : 'pending',
  }));
}

async function applyDownloadStatus(
  items: BookItem[],
  languageCode: string,
): Promise<BookItem[]> {
  const { downloadedSet, audioDownloadedSet } = await getDownloadStatusSets(languageCode);
  return mapBooksWithDownloadStatus(items, downloadedSet, audioDownloadedSet);
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
        setBooks((current) =>
          current.map((book) => {
            if (book.slug.toUpperCase() !== change.bookSlug.toUpperCase()) {
              return book;
            }

            if (change.kind === 'audio') {
              return { ...book, audioDownloadStatus: change.status };
            }

            return { ...book, downloadStatus: change.status };
          }),
        );
        return;
      }

      const { downloadedSet, audioDownloadedSet } = await getDownloadStatusSets(languageCode);

      setBooks((current) =>
        mapBooksWithDownloadStatus(current, downloadedSet, audioDownloadedSet),
      );
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
