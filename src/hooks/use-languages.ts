import { useCallback, useEffect, useState } from 'react';

import { fetchLanguages } from '@/api/services/languages';
import { getBookCatalogCountsByLanguage, getDownloadedBookCountsByLanguage } from '@/db';
import type { DownloadStatus } from '@/types/download';
import type { LanguageItem } from '@/types/language';

function applyLanguageDownloadStatus(
  items: LanguageItem[],
  downloadedCounts: Record<string, number>,
  catalogCounts: Record<string, number>,
): LanguageItem[] {
  return items.map((language) => {
    if (!language.hasText) {
      return { ...language, downloadStatus: 'pending' as DownloadStatus };
    }

    const catalogCount = catalogCounts[language.code] ?? 0;
    const downloadedCount = downloadedCounts[language.code] ?? 0;
    const downloadStatus: DownloadStatus =
      catalogCount > 0 && downloadedCount >= catalogCount ? 'downloaded' : 'pending';

    return { ...language, downloadStatus };
  });
}

export function useLanguages() {
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDownloadStatus = useCallback(async () => {
    const [downloadedCounts, catalogCounts] = await Promise.all([
      getDownloadedBookCountsByLanguage(),
      getBookCatalogCountsByLanguage(),
    ]);

    setLanguages((current) =>
      applyLanguageDownloadStatus(current, downloadedCounts, catalogCounts),
    );
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const items = await fetchLanguages();
      const [downloadedCounts, catalogCounts] = await Promise.all([
        getDownloadedBookCountsByLanguage(),
        getBookCatalogCountsByLanguage(),
      ]);
      setLanguages(applyLanguageDownloadStatus(items, downloadedCounts, catalogCounts));
    } catch (err) {
      setLanguages([]);
      setError(err instanceof Error ? err.message : 'Failed to load languages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { languages, loading, error, refetch, refreshDownloadStatus };
}
