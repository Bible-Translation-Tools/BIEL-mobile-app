import { Directory, File, Paths } from 'expo-file-system';

export const OFFLINE_ROOT_DIR_NAME = 'biel-offline';

export function normalizeBookSlug(bookSlug: string): string {
  return bookSlug.trim().toUpperCase();
}

export function getOfflineBookDirectory(languageCode: string, bookSlug: string): Directory {
  return new Directory(
    Paths.document,
    OFFLINE_ROOT_DIR_NAME,
    languageCode,
    normalizeBookSlug(bookSlug),
  );
}

export function getWholeJsonFile(languageCode: string, bookSlug: string): File {
  const dir = getOfflineBookDirectory(languageCode, bookSlug);
  return new File(dir, 'whole.json');
}

export function ensureOfflineBookDirectory(languageCode: string, bookSlug: string): Directory {
  const dir = getOfflineBookDirectory(languageCode, bookSlug);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export async function ensureOfflineRootExists(): Promise<void> {
  const root = new Directory(Paths.document, OFFLINE_ROOT_DIR_NAME);
  if (!root.exists) {
    root.create({ intermediates: true, idempotent: true });
  }
}

export function getOfflineAudioDirectory(languageCode: string, bookSlug: string): Directory {
  return new Directory(getOfflineBookDirectory(languageCode, bookSlug), 'audio');
}

export function getChapterMp3File(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): File {
  return new File(getOfflineAudioDirectory(languageCode, bookSlug), `ch-${chapter}.mp3`);
}

export function getChapterCueFile(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): File {
  return new File(getOfflineAudioDirectory(languageCode, bookSlug), `ch-${chapter}.cue`);
}

export function ensureOfflineAudioDirectory(languageCode: string, bookSlug: string): Directory {
  const dir = getOfflineAudioDirectory(languageCode, bookSlug);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}
