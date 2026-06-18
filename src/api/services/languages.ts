import { graphqlRequest } from '@/api/graphql/client';
import { LANGUAGES_QUERY, LANGUAGES_WITH_CHAPTER_AUDIO_QUERY } from '@/api/graphql/queries';
import { listLanguageCatalog, listLanguagesWithDownloads, replaceLanguageCatalog } from '@/db';
import type {
  ApiLanguage,
  LanguageItem,
  LanguagesQueryResult,
  LanguagesWithChapterAudioQueryResult,
} from '@/types/language';

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

export function mapApiLanguageToItem(language: ApiLanguage, hasAudio = false): LanguageItem {
  const resourceTypes = new Set(
    language.contents.map((c) => c.resource_type).filter((t): t is string => Boolean(t)),
  );

  return {
    code: language.ietf_code,
    name: language.english_name,
    nationalName: language.national_name || language.english_name,
    hasText: [...TEXT_RESOURCE_TYPES].some((type) => resourceTypes.has(type)),
    hasAudio,
    downloadStatus: 'pending',
  };
}

async function fetchLanguageCodesWithChapterAudio(): Promise<Set<string>> {
  const data = await graphqlRequest<LanguagesWithChapterAudioQueryResult>(
    LANGUAGES_WITH_CHAPTER_AUDIO_QUERY,
  );

  return new Set(data.language.map((language) => language.ietf_code.toUpperCase()));
}

export async function fetchLanguages(): Promise<LanguageItem[]> {
  const [data, audioLanguageCodes] = await Promise.all([
    graphqlRequest<LanguagesQueryResult>(LANGUAGES_QUERY),
    fetchLanguageCodesWithChapterAudio().catch(() => new Set<string>()),
  ]);

  const languages = data.language.map((language) =>
    mapApiLanguageToItem(
      language,
      audioLanguageCodes.has(language.ietf_code.toUpperCase()),
    ),
  );
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
