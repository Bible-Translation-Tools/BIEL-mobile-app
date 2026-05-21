import { graphqlRequest } from '@/lib/graphql/client';
import { LANGUAGES_QUERY } from '@/lib/graphql/queries';
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

function formatLanguageCode(language: ApiLanguage): string {
  const label = language.national_name?.trim() || language.english_name;
  return `${language.ietf_code} - ${label}`;
}

export function mapApiLanguageToItem(language: ApiLanguage): LanguageItem {
  const resourceTypes = new Set(
    language.contents.map((c) => c.resource_type).filter((t): t is string => Boolean(t)),
  );

  return {
    id: language.ietf_code,
    name: language.english_name,
    code: formatLanguageCode(language),
    hasText: [...TEXT_RESOURCE_TYPES].some((type) => resourceTypes.has(type)),
    hasAudio: [...AUDIO_RESOURCE_TYPES].some((type) => resourceTypes.has(type)),
    downloadStatus: 'pending',
  };
}

export async function fetchLanguages(): Promise<LanguageItem[]> {
  const data = await graphqlRequest<LanguagesQueryResult>(LANGUAGES_QUERY);
  return data.language.map(mapApiLanguageToItem);
}
