import { graphqlRequest } from '@/api/graphql/client';
import { LANGUAGES_QUERY } from '@/api/graphql/queries';
import { listLanguageCatalog, listLanguagesWithDownloads, replaceLanguageCatalog } from '@/db';
import type { ApiLanguage, LanguageItem, LanguagesQueryResult } from '@/types/language';

/** Resource types that represent readable scripture / text content */
const TEXT_RESOURCE_TYPES = new Set([
  'reg',
  'ulb',
  'udb',
  'obs',
  'avd',
  'nav',
  'blv',
  'f10',
  'rsb',
  'bc',
  'uhb',
]);

/** Resource types that may include audio (e.g. Open Bible Stories) */
const AUDIO_RESOURCE_TYPES = new Set(['obs']);

export function mapApiLanguageToItem(language: ApiLanguage): LanguageItem {
  const resourceTypes = new Set(
    language.contents.map((c) => c.resource_type).filter((t): t is string => Boolean(t)),
  );

  return {
    code: language.ietf_code,
    name: language.english_name,
    nationalName: language.national_name || language.english_name,
    hasText: [...TEXT_RESOURCE_TYPES].some((type) => resourceTypes.has(type)),
    hasAudio: [...AUDIO_RESOURCE_TYPES].some((type) => resourceTypes.has(type)),
    downloadStatus: 'pending',
  };
}

export async function fetchLanguages(): Promise<LanguageItem[]> {
  const data = await graphqlRequest<LanguagesQueryResult>(LANGUAGES_QUERY);
  const languages = data.language.map(mapApiLanguageToItem);
  try {
    await replaceLanguageCatalog(languages);
  } catch {
    // Catalog cache is optional; do not fail the online language list.
  }
  return languages;
}

function mergeLanguageLists(
  catalog: LanguageItem[],
  downloadedOnly: LanguageItem[],
): LanguageItem[] {
  if (catalog.length === 0) {
    return downloadedOnly;
  }

  const byCode = new Map(catalog.map((language) => [language.code.toUpperCase(), language]));
  for (const language of downloadedOnly) {
    const key = language.code.toUpperCase();
    if (!byCode.has(key)) {
      byCode.set(key, language);
    }
  }

  const merged = [...byCode.values()];
  if (catalog.length > 0) {
    const order = new Map(catalog.map((language, index) => [language.code.toUpperCase(), index]));
    merged.sort((a, b) => {
      const aOrder = order.get(a.code.toUpperCase());
      const bOrder = order.get(b.code.toUpperCase());
      if (aOrder != null && bOrder != null) return aOrder - bOrder;
      if (aOrder != null) return -1;
      if (bOrder != null) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return merged;
}

/** Loads languages from SQLite when the network catalog is unavailable. */
export async function fetchLanguagesOffline(): Promise<LanguageItem[]> {
  const [catalog, downloadedOnly] = await Promise.all([
    listLanguageCatalog(),
    listLanguagesWithDownloads(),
  ]);
  return mergeLanguageLists(catalog, downloadedOnly);
}
