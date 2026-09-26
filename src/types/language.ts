import type { DownloadStatus } from '@/types/download';

export type { DownloadStatus };

export type LanguageItem = {
  code: string;
  name: string;
  nationalName: string;
  hasAudio: boolean;
  hasText: boolean;
  downloadStatus: DownloadStatus;
};