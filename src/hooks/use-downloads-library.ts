import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  fetchDownloadedLibrary,
  type DownloadedLibraryLanguage,
} from '@/api/services/books';

export function useDownloadsLibrary() {
  const { t } = useTranslation('library');
  const [items, setItems] = useState<DownloadedLibraryLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await fetchDownloadedLibrary();
      setItems(next);
      setError(null);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const refreshAfterChange = useCallback(async () => {
    try {
      const next = await fetchDownloadedLibrary();
      setItems(next);
    } catch {
      // Keep the current list if a background refresh fails.
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { items, loading, error, refetch, refreshAfterChange };
}
