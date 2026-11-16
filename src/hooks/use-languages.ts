import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getLanguageCatalogSnapshot,
  LANGUAGE_CATALOG_LOAD_FAILED,
  getLanguageCatalog,
  refreshLanguageCatalogDownloadStatus,
  type LanguageCatalogSnapshot,
} from '@/features/catalog';

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
      const next = await getLanguageCatalog({ force: true });
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
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    const snapshot = getLanguageCatalogSnapshot();
    const load = snapshot ? Promise.resolve(snapshot) : getLanguageCatalog();

    load
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
    error: state.error === LANGUAGE_CATALOG_LOAD_FAILED ? t('failedToLoadLanguages') : state.error,
    refetch,
    refreshDownloadStatus,
  };
}
