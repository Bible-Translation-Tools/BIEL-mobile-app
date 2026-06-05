import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getLanguageCatalogSnapshot,
  loadLanguageCatalog,
  refreshLanguageCatalogDownloadStatus,
  type LanguageCatalogSnapshot,
} from '@/services/language-catalog';

function readInitialState(): LanguageCatalogSnapshot & { loading: boolean } {
  const preloaded = getLanguageCatalogSnapshot();
  if (preloaded) {
    return { ...preloaded, loading: false };
  }

  return { languages: [], error: null, loading: true };
}

export function useLanguages() {
  const { t } = useTranslation('home');
  const [state, setState] = useState(readInitialState);

  const refreshDownloadStatus = useCallback(async () => {
    const next = await refreshLanguageCatalogDownloadStatus();
    if (next) {
      setState({ ...next, loading: false });
    }
  }, []);

  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const next = await loadLanguageCatalog({ force: true });
      setState({ ...next, loading: false });
    } catch (err) {
      setState({
        languages: [],
        error: err instanceof Error ? err.message : t('failedToLoadLanguages'),
        loading: false,
      });
    }
  }, [t]);

  useEffect(() => {
    if (getLanguageCatalogSnapshot()) {
      return;
    }

    let cancelled = false;

    loadLanguageCatalog()
      .then((next) => {
        if (!cancelled) {
          setState({ ...next, loading: false });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            languages: [],
            error: err instanceof Error ? err.message : t('failedToLoadLanguages'),
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  return {
    languages: state.languages,
    loading: state.loading,
    error: state.error,
    refetch,
    refreshDownloadStatus,
  };
}
