import { useCallback, useEffect, useState } from 'react';

import { fetchLanguages } from '@/services/languages';
import type { LanguageItem } from '@/types/language';

export function useLanguages() {
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const items = await fetchLanguages();
      setLanguages(items);
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

  return { languages, loading, error, refetch };
}
