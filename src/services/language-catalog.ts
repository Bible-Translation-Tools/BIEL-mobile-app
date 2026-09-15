import { fetchLanguages, fetchLanguagesOffline } from '@/api/services/languages';
import { getBookCatalogCountsByLanguage, getDownloadedBookCountsByLanguage, listLanguagesWithDownloads } from '@/db';
import { i18n } from '@/i18n';
import type { DownloadStatus } from '@/types/download';
import type { LanguageItem } from '@/types/language';

export type LanguageCatalogSnapshot = {
  languages: LanguageItem[];
  error: string | null;
};

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

async function withDownloadStatus(items: LanguageItem[]): Promise<LanguageItem[]> {
  const [downloadedCounts, catalogCounts] = await Promise.all([
    getDownloadedBookCountsByLanguage(),
    getBookCatalogCountsByLanguage(),
  ]);
  return applyLanguageDownloadStatus(items, downloadedCounts, catalogCounts);
}

async function fetchLanguageCatalogSnapshot(): Promise<LanguageCatalogSnapshot> {
  try {
    const items = await fetchLanguages();
    return {
      languages: await withDownloadStatus(items),
      error: null,
    };
  } catch (err) {
    let offlineItems: LanguageItem[] = [];
    try {
      offlineItems = await fetchLanguagesOffline();
    } catch {
      offlineItems = [];
    }

    if (offlineItems.length > 0) {
      try {
        return {
          languages: await withDownloadStatus(offlineItems),
          error: null,
        };
      } catch {
        return { languages: offlineItems, error: null };
      }
    }

    return {
      languages: [],
      error: err instanceof Error ? err.message : i18n.t('home:failedToLoadLanguages'),
    };
  }
}

/** Languages that have local scripture and/or audio (Downloads Library). */
export async function loadDownloadedLanguagesCatalog(): Promise<LanguageCatalogSnapshot> {
  try {
    const items = await listLanguagesWithDownloads();
    try {
      return {
        languages: await withDownloadStatus(items),
        error: null,
      };
    } catch {
      return { languages: items, error: null };
    }
  } catch (err) {
    return {
      languages: [],
      error: err instanceof Error ? err.message : i18n.t('home:failedToLoadLanguages'),
    };
  }
}

let snapshot: LanguageCatalogSnapshot | null = null;
let loadPromise: Promise<LanguageCatalogSnapshot> | null = null;

export function getLanguageCatalogSnapshot(): LanguageCatalogSnapshot | null {
  return snapshot;
}

export function loadLanguageCatalog(options?: { force?: boolean }): Promise<LanguageCatalogSnapshot> {
  if (!options?.force && snapshot) {
    return Promise.resolve(snapshot);
  }

  if (!options?.force && loadPromise) {
    return loadPromise;
  }

  loadPromise = fetchLanguageCatalogSnapshot()
    .then((result) => {
      snapshot = result;
      return result;
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export async function refreshLanguageCatalogDownloadStatus(): Promise<LanguageCatalogSnapshot | null> {
  const current = snapshot?.languages ?? [];
  if (current.length === 0) {
    return snapshot;
  }

  snapshot = {
    languages: await withDownloadStatus(current),
    error: snapshot?.error ?? null,
  };

  return snapshot;
}
