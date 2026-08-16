import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getLanguageCatalogSnapshot,
  loadDownloadedLanguagesCatalog,
  loadLanguageCatalog,
  refreshLanguageCatalogDownloadStatus,
  type LanguageCatalogSnapshot,
} from '@/services/language-catalog';
import { useDownloadsLibraryActive } from '@/stores/downloads-library-store';

function readInitialState(
  downloadsLibraryActive: boolean,
): LanguageCatalogSnapshot & { loading: boolean } {
  if (downloadsLibraryActive) {
    return { languages: [], error: null, loading: true };
  }

  const preloaded = getLanguageCatalogSnapshot();
  if (preloaded) {
    return { ...preloaded, loading: false };
  }

  return { languages: [], error: null, loading: true };
}

export function useLanguages() {
  const { t } = useTranslation('home');
  const downloadsLibraryActive = useDownloadsLibraryActive();
  const [state, setState] = useState(() => readInitialState(downloadsLibraryActive));

  const refreshDownloadStatus = useCallback(async () => {
    if (downloadsLibraryActive) {
      const next = await loadDownloadedLanguagesCatalog();
      setState({ ...next, loading: false });
      return;
    }

    const next = await refreshLanguageCatalogDownloadStatus();
    if (next) {
      setState({ ...next, loading: false });
    }
  }, [downloadsLibraryActive]);

  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const next = downloadsLibraryActive
        ? await loadDownloadedLanguagesCatalog()
        : await loadLanguageCatalog({ force: true });
      setState({ ...next, loading: false });
    } catch (err) {
      setState({
        languages: [],
        error: err instanceof Error ? err.message : t('failedToLoadLanguages'),
        loading: false,
      });
    }
  }, [downloadsLibraryActive, t]);

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({ ...current, loading: true, error: null }));

    const load = downloadsLibraryActive
      ? loadDownloadedLanguagesCatalog()
      : getLanguageCatalogSnapshot()
        ? Promise.resolve(getLanguageCatalogSnapshot()!)
        : loadLanguageCatalog();

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
  }, [downloadsLibraryActive, t]);

  return {
    languages: state.languages,
    loading: state.loading,
    error: state.error,
    refetch,
    refreshDownloadStatus,
  };
}
