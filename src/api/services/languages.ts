import { graphqlRequest } from '@/api/graphql/client';
import { LANGUAGES_QUERY } from '@/api/graphql/queries';
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
  return data.language.map(mapApiLanguageToItem);
}
