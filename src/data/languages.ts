export type DownloadStatus = 'pending' | 'downloaded';

export type LanguageItem = {
  id: string;
  name: string;
  code: string;
  hasAudio: boolean;
  hasText: boolean;
  downloadStatus: DownloadStatus;
};

export const LANGUAGES: LanguageItem[] = [
  { id: 'abui', name: 'Abui', code: 'ab - Abui', hasAudio: true, hasText: true, downloadStatus: 'pending' },
  {
    id: 'acholi',
    name: 'Acholi',
    code: 'ach-SS-acholi - Acholi',
    hasAudio: true,
    hasText: true,
    downloadStatus: 'downloaded',
  },
  {
    id: 'amarasi',
    name: 'Amarasi Barat',
    code: "aaz-x-amarasibarat - Roi'is",
    hasAudio: true,
    hasText: true,
    downloadStatus: 'pending',
  },
  { id: 'amharic', name: 'Amharic', code: 'am - [symbol]', hasAudio: true, hasText: true, downloadStatus: 'pending' },
  { id: 'amo', name: 'Amo', code: 'amo - Timap', hasAudio: true, hasText: true, downloadStatus: 'pending' },
  { id: 'ana', name: 'Ana', code: 'ife-x-ana - Ana', hasAudio: true, hasText: true, downloadStatus: 'pending' },
  { id: 'language', name: 'Language', code: 'Code', hasAudio: true, hasText: true, downloadStatus: 'pending' },
];
