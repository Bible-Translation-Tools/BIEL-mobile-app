export type DownloadStatus = 'pending' | 'downloaded';

export type LanguageItem = {
  code: string;
  name: string;
  nationalName: string;
  hasAudio: boolean;
  hasText: boolean;
  downloadStatus: DownloadStatus;
};

export type ApiLanguageContent = {
  resource_type: string | null;
  name: string;
};

export type ApiLanguage = {
  english_name: string;
  ietf_code: string;
  national_name: string | null;
  wa_language_metadata?: { is_gateway: boolean | null } | null;
  contents: ApiLanguageContent[];
};

export type LanguagesQueryResult = {
  language: ApiLanguage[];
};
